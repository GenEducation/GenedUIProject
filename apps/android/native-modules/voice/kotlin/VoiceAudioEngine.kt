package ai.geneducation.app

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Unified full-duplex voice audio engine with WebRTC AEC3 echo cancellation.
 *
 * Owns BOTH the microphone (AudioRecord @ 16kHz) and the speaker (AudioTrack @ 24kHz)
 * so the WebRTC AudioProcessingModule (native, see apm_jni.cpp) can see the near-end
 * (mic) and far-end (speaker reference) signals time-aligned in one place — the
 * prerequisite for software echo cancellation that works on every device regardless of
 * whether the hardware HAL exposes AcousticEchoCanceler.
 *
 *   far-end  (24kHz from WS) ── pushFarend() ──> AudioTrack (play) + APM ProcessReverse
 *   near-end (16kHz mic)     ── capture loop ──> APM ProcessStream ──> "data" event ──> JS ──> WS
 *
 * The JS-facing surface (start/stop + a base64 "data" DeviceEventEmitter event) mirrors
 * react-native-live-audio-stream so voiceService.ts's existing uplink listener is reused.
 */
class VoiceAudioEngine(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val MIC_RATE = 16000      // APM capture rate + backend uplink rate
        private const val FAR_RATE = 24000      // Gemini downlink playback rate
        private const val FRAME_MS = 10         // WebRTC APM processes 10ms frames
        private const val MIC_FRAME = MIC_RATE / 1000 * FRAME_MS   // 160 samples
        private const val FAR_FRAME = FAR_RATE / 1000 * FRAME_MS   // 240 samples

        // Load lazily + guarded so a load failure (missing .so for the device ABI, bad
        // alignment, etc.) does NOT throw out of createNativeModules and silently drop the
        // whole module — instead the module still registers and start() reports a clear error.
        @Volatile private var nativeLibLoaded = false
        @Volatile private var nativeLibError: String? = null
        private fun ensureNativeLib() {
            if (nativeLibLoaded) return
            try {
                System.loadLibrary("voiceapm")
                nativeLibLoaded = true
            } catch (t: Throwable) {
                nativeLibError = t.message ?: t.toString()
            }
        }
    }

    override fun getName() = "VoiceAudioEngine"

    // ── JNI (apm_jni.cpp) ───────────────────────────────────────────────────────
    private external fun nativeCreate(captureRate: Int, renderRate: Int): Long
    private external fun nativeProcessReverse(handle: Long, far: ShortArray)
    private external fun nativeProcessCapture(handle: Long, near: ShortArray): ShortArray
    private external fun nativeSetStreamDelayMs(handle: Long, delayMs: Int)
    private external fun nativeDestroy(handle: Long)

    private var apmHandle = 0L
    private var record: AudioRecord? = null
    private var track: AudioTrack? = null
    private var audioManager: AudioManager? = null
    private var prevAudioMode = AudioManager.MODE_NORMAL
    private var prevSpeakerphoneOn = false
    private val running = AtomicBoolean(false)
    private var captureThread: Thread? = null
    private var playbackThread: Thread? = null

    // Render (far-end) jitter buffer. pushFarend() enqueues network audio here; the
    // playback thread drains it in fixed 10ms frames so the AEC reference is fed in lockstep
    // with what the speaker actually plays — NOT on bursty network-arrival cadence.
    private val renderQueue = ArrayDeque<Short>()
    private val renderLock = Object()
    // Start playing only once this much audio is buffered, to absorb network jitter
    // (~50ms). Mirrors the old JS-side TARGET_BUFFER_SIZE.
    private val PREBUFFER_SAMPLES = FAR_FRAME * 5
    private var primed = false

    @ReactMethod
    fun start(promise: Promise) {
        if (running.get()) { promise.resolve(true); return }
        ensureNativeLib()
        if (!nativeLibLoaded) {
            promise.reject("voiceapm_load_failed", "libvoiceapm.so failed to load: ${nativeLibError ?: "unknown"}")
            return
        }
        try {
            // Capture stream is 16kHz, render (reverse) stream is its true 24kHz — APM
            // resamples the reference to the processing rate internally with proper filtering.
            apmHandle = nativeCreate(MIC_RATE, FAR_RATE)
            if (apmHandle == 0L) { promise.reject("apm_create_failed", "Could not create WebRTC APM"); return }

            // Mic: raw VOICE_RECOGNITION source so the platform doesn't double-process;
            // the APM owns all NS/AGC/AEC.
            val minRec = AudioRecord.getMinBufferSize(
                MIC_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
            )
            record = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MIC_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
                maxOf(minRec, MIC_FRAME * 2 * 8)
            )

            // Speaker: VOICE_COMMUNICATION usage keeps the render/capture path low-latency and
            // clock-coherent — the prerequisite AEC3 needs to align the echo reference. By
            // itself this routes to the (quiet) earpiece, so we ALSO force the communication
            // audio to the loudspeaker via AudioManager below. That gives loud playback AND
            // working echo cancellation — the standard full-duplex speakerphone setup. (Using
            // USAGE_MEDIA was loud but broke AEC because the media path's latency desyncs the
            // echo reference.)
            val minTrack = AudioTrack.getMinBufferSize(
                FAR_RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT
            )
            track = AudioTrack(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build(),
                AudioFormat.Builder()
                    .setSampleRate(FAR_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .build(),
                maxOf(minTrack, FAR_FRAME * 2 * 8),
                AudioTrack.MODE_STREAM,
                AudioManager.AUDIO_SESSION_ID_GENERATE
            )
            track?.setVolume(1.0f)  // max per-track gain so playback isn't attenuated

            // Put the device in communication mode and force output to the built-in speaker,
            // so the VOICE_COMMUNICATION audio plays LOUD on the loudspeaker (not the earpiece)
            // while staying on the AEC-coherent comm path. Restored in cleanup().
            val am = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager = am
            prevAudioMode = am.mode
            prevSpeakerphoneOn = am.isSpeakerphoneOn
            try {
                am.mode = AudioManager.MODE_IN_COMMUNICATION
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val speaker = am.availableCommunicationDevices
                        .firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
                    if (speaker != null) am.setCommunicationDevice(speaker)
                } else {
                    @Suppress("DEPRECATION")
                    am.isSpeakerphoneOn = true
                }
            } catch (_: Exception) {}

            track?.play()

            running.set(true)
            primed = false
            // Initial render-to-capture delay estimate: AudioTrack buffer + acoustic path.
            // AEC3 refines this adaptively.
            nativeSetStreamDelayMs(apmHandle, estimatedDelayMs())
            record?.startRecording()
            startCaptureLoop()
            startPlaybackLoop()
            promise.resolve(true)
        } catch (e: Exception) {
            cleanup()
            promise.reject("voice_engine_start_failed", e.message, e)
        }
    }

    /**
     * Enqueue a 24kHz PCM16 frame from the WS into the render jitter buffer. Playback AND the
     * AEC reference feed both happen on the playback thread, paced to real speaker time — so a
     * bursty network arrival can't overrun AEC3's render buffer and desync the echo path.
     */
    @ReactMethod
    fun pushFarend(base64: String) {
        if (!running.get()) return
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        synchronized(renderLock) {
            var i = 0
            while (i + 1 < bytes.size) {
                renderQueue.addLast(((bytes[i].toInt() and 0xff) or (bytes[i + 1].toInt() shl 8)).toShort())
                i += 2
            }
            renderLock.notifyAll()
        }
    }

    @ReactMethod
    fun flush() {
        // Barge-in: drop pending AI audio so it stops quickly. We deliberately DO NOT reset
        // `primed` or pause/flush the AudioTrack — that would create an AEC3 reference gap and
        // reset the playback clock, exactly the disruption that caused start-of-turn echo. The
        // continuous loop keeps emitting silence + feeding the reference; the small residual
        // already in the AudioTrack buffer (~one buffer) plays out within ~80ms, then silence.
        synchronized(renderLock) {
            renderQueue.clear()
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        cleanup()
        promise.resolve(true)
    }

    // ── Internals ───────────────────────────────────────────────────────────────

    private fun startCaptureLoop() {
        captureThread = Thread {
            val frame = ShortArray(MIC_FRAME)
            while (running.get()) {
                val rec = record ?: break
                val n = rec.read(frame, 0, MIC_FRAME)
                if (n != MIC_FRAME || apmHandle == 0L) continue
                val cleaned = nativeProcessCapture(apmHandle, frame)
                emitData(cleaned)
            }
        }.apply { name = "VoiceAudioCapture"; start() }
    }

    /**
     * Playback + AEC reference, both paced to real speaker time.
     *
     * CRITICAL for echo cancellation: after a one-time initial prebuffer, this loop runs a
     * CONTINUOUS 10ms cadence that NEVER stops — every tick it writes a frame to AudioTrack
     * (real audio if the jitter buffer has any, otherwise silence) AND feeds that exact frame
     * to ProcessReverseStream. Because the reference never gaps, AEC3's render buffer and
     * echo-path delay stay locked across turn boundaries. (Previously the loop went idle
     * between turns — no write, no reference — so AEC3 lost alignment and the first few hundred
     * ms of each new AI turn leaked into the mic. That was the start-of-turn echo.)
     *
     * AudioTrack.write() blocks at the real playback rate in MODE_STREAM, so the silence we
     * write keeps the speaker clock and the AEC reference advancing in lockstep with the
     * 16kHz capture loop.
     */
    private fun startPlaybackLoop() {
        playbackThread = Thread {
            val frame = ShortArray(FAR_FRAME)
            val silence = ShortArray(FAR_FRAME)  // zeros — fed between/within turns to hold cadence
            var framesWritten = 0L               // total frames handed to AudioTrack (for delay calc)
            var lastDelayUpdate = 0L
            while (running.get()) {
                var haveFrame = false
                synchronized(renderLock) {
                    // One-time initial prebuffer: wait for the jitter buffer to fill once before
                    // playback starts. `primed` is set ONCE and never reset mid-session, so the
                    // continuous cadence below is never interrupted (no re-prime gaps).
                    if (!primed) {
                        if (renderQueue.size >= PREBUFFER_SAMPLES) primed = true
                        else { try { renderLock.wait(20) } catch (_: InterruptedException) {} }
                    }
                    if (primed && renderQueue.size >= FAR_FRAME) {
                        for (k in 0 until FAR_FRAME) frame[k] = renderQueue.removeFirst()
                        haveFrame = true
                    }
                }
                if (!primed) continue  // still waiting for the very first prebuffer
                val out = if (haveFrame) frame else silence
                val wrote = try { track?.write(out, 0, FAR_FRAME) ?: 0 } catch (_: Exception) { 0 }
                if (wrote > 0) framesWritten += wrote
                if (apmHandle != 0L) nativeProcessReverse(apmHandle, out)

                // Feed AEC3 the REAL render delay (frames buffered but not yet played), refreshed
                // ~1×/sec, instead of a fixed guess — tighter, faster echo convergence. Falls back
                // to the fixed estimate if the platform timestamp isn't available yet.
                val now = System.currentTimeMillis()
                if (apmHandle != 0L && now - lastDelayUpdate >= 1000L) {
                    lastDelayUpdate = now
                    nativeSetStreamDelayMs(apmHandle, measuredDelayMs(framesWritten))
                }
            }
        }.apply { name = "VoiceAudioPlayback"; start() }
    }

    private val playbackTimestamp = android.media.AudioTimestamp()

    /** Render latency in ms = frames written but not yet presented by the speaker, from the
     *  AudioTrack timestamp; plus a small constant for capture + acoustic path. AEC3 refines
     *  the fine alignment internally — this just gives it an accurate coarse delay. */
    private fun measuredDelayMs(framesWritten: Long): Int {
        val t = track ?: return estimatedDelayMs()
        return try {
            if (t.getTimestamp(playbackTimestamp)) {
                val unplayed = framesWritten - playbackTimestamp.framePosition
                if (unplayed < 0) return estimatedDelayMs()
                val ms = unplayed.toDouble() / FAR_RATE * 1000.0 + 15.0
                ms.toInt().coerceIn(20, 500)
            } else estimatedDelayMs()
        } catch (_: Exception) { estimatedDelayMs() }
    }

    private fun estimatedDelayMs(): Int {
        // Render-to-capture delay = AudioTrack output buffering + acoustic path. A fixed
        // estimate is fine because AEC3 refines the true delay adaptively. Most phones land
        // ~80-120ms; the prebuffer (~50ms) plus typical hardware latency sits in that range.
        return 120
    }

    private fun emitData(pcm: ShortArray) {
        val bytes = ByteArray(pcm.size * 2)
        var i = 0
        for (s in pcm) {
            bytes[i++] = (s.toInt() and 0xff).toByte()
            bytes[i++] = ((s.toInt() shr 8) and 0xff).toByte()
        }
        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("data", b64)
    }

    private fun cleanup() {
        running.set(false)
        // Wake the playback thread if it's blocked waiting on the render buffer.
        synchronized(renderLock) { renderLock.notifyAll() }
        try { captureThread?.join(200) } catch (_: Exception) {}
        captureThread = null
        try { playbackThread?.join(200) } catch (_: Exception) {}
        playbackThread = null
        try { record?.stop() } catch (_: Exception) {}
        try { record?.release() } catch (_: Exception) {}
        record = null
        try { track?.stop() } catch (_: Exception) {}
        try { track?.release() } catch (_: Exception) {}
        track = null
        // Restore the device's audio mode + speaker routing we changed in start().
        audioManager?.let { am ->
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    am.clearCommunicationDevice()
                } else {
                    @Suppress("DEPRECATION")
                    am.isSpeakerphoneOn = prevSpeakerphoneOn
                }
                am.mode = prevAudioMode
            } catch (_: Exception) {}
        }
        audioManager = null
        synchronized(renderLock) { renderQueue.clear(); primed = false }
        if (apmHandle != 0L) { nativeDestroy(apmHandle); apmHandle = 0L }
    }

    override fun invalidate() {
        cleanup()
        super.invalidate()
    }
}
