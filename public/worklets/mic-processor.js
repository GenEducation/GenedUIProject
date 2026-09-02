// Mic capture worklet for /ws/v3/voice (ADR-0015 / speech-pipeline-architecture.md §2 A1-A6).
//
// Runs at the AudioContext's native sample rate (almost always 48000 Hz) on the audio
// render thread, and does three things every 20ms render block: resample to 16k PCM16,
// run an energy-based VAD with hangover, and maintain a 300ms preroll ring buffer.
//
// VAD here is deliberately simple (energy + hangover), not Silero. The design doc (§3)
// calls for Silero because energy thresholds fail in a noisy classroom -- worth upgrading
// to, but the wire protocol and the main-thread service do not change either way: only
// this file's voiced decision would be replaced by an ONNX inference call. Ship the simple
// version first, swap the decision function later.
//
// What that decision compares against is NOT a constant any more. It is measured from the
// room, because a constant is what made the cascade unusable in practice: with
// autoGainControl raising a quiet room's noise floor past a hardcoded 0.02, room tone
// alone registered as speech, and every phantom onset landed on the server as a barge-in
// that destroyed the tutor's in-flight reply. See RMS_ABSOLUTE_FLOOR for the live trace.
// Still an energy VAD, and still beaten by a genuinely loud room (RMS_THRESHOLD_MAX names
// that limit honestly) -- but no longer beaten by an ordinary quiet one.

const NATIVE_FRAME_SAMPLES = 960; // ~20ms @ 48kHz; process() delivers 128-sample quanta, buffered up
const TARGET_RATE = 16000;
const MIN_SPEECH_MS = 250;
// Live bug: every frame is pushed into the preroll ring buffer BEFORE onset is
// confirmed (see _handleFrame's `!this._voiced` branch) -- both genuine leading
// silence and the in-progress voiced streak, while it's still building toward
// MIN_SPEECH_MS, compete for the same ring-buffer capacity. With PREROLL_MS == 300 (a
// bare few ms more than MIN_SPEECH_MS's own 250), the buffer had almost no margin left
// once onset confirmed -- so a soft, slow-rising onset (a nasal consonant like the "M"
// in "ML", low energy before it ramps up) could cross MIN_SPEECH_MS's threshold late
// enough that the ring buffer had already shift()ed out the true acoustic start of the
// word, before speech_start ever fired. Reported live, reproducibly, on two different
// STT providers ("ML Agarwal test" transcribed as "me Agarwal test" / "Tzanck Agarwal
// test") -- same clipped word, same position, regardless of which provider was
// listening, which is what pointed at capture rather than transcription. This must
// exceed MIN_SPEECH_MS with real margin, not sit barely above it.
const PREROLL_MS = 500;
const HANGOVER_MS = 700;
// Absolute floor, kept only as a "this room is essentially digitally silent" guard. It
// used to be the WHOLE decision (`rms >= 0.02`), which is what made the cascade unusable:
// an absolute threshold is meaningless when getUserMedia runs with autoGainControl,
// because AGC's entire job is to raise gain until whatever it can hear is loud -- in a
// quiet room with nobody speaking it walks the noise floor UP until room tone alone
// clears 0.02, and then never stops clearing it. Live (2 Sep 2026, core-service logs
// 14:16-14:18): three consecutive turns where the tutor's finished reply was destroyed by
// a "barge-in" nobody performed, and five STT turns that transcribed to nothing at all.
// What the model returned on the audio that DID transcribe is the giveaway -- "Once a
// day, once a week, once a month. Once a day, once a week, once a month." -- a repetition
// loop, the classic signature of an ASR model hallucinating on non-speech input. Nobody
// spoke. The VAD only ever thought they had.
const RMS_ABSOLUTE_FLOOR = 0.008;
// Speech must stand out from THIS room by this much, instead of clearing a constant that
// knows nothing about the room. ~4x linear is ~12dB SNR: comfortably above room tone, a
// fan, or AGC drift, and still well under real speech, which sits 10-30x above its own
// noise floor at conversational distance.
const RMS_SNR_FACTOR = 4.0;
// Noise floor by minimum statistics: the quietest 500ms bucket seen in the last ~5s.
//
// The obvious estimator -- an EMA updated only on non-voiced frames -- is wrong here, and
// simulating it before shipping is what caught that: a steady noise loud enough to clear
// the initial threshold (a fan at RMS 0.05) latches the VAD voiced on its first onset,
// and because the floor then only learns from non-voiced frames, it NEVER learns the very
// noise holding it open. One onset, voiced forever, floor frozen at its initial value --
// precisely the bug this is meant to fix, reintroduced one layer down. Updating the EMA
// on every frame instead just moves the failure: a 5s utterance drags the floor up behind
// itself and the VAD goes deaf to the end of the sentence being spoken.
//
// A running minimum has neither problem, because it does not need to know which frames
// are speech. Speech is intermittent -- inter-syllable dips, breaths, gaps between words
// -- so the quietest bucket in a 5s window still sits near the true floor even mid
// sentence, while steady noise IS its own minimum and gets learned within one window
// whether or not the VAD currently thinks it is hearing speech.
const NOISE_BUCKET_MS = 500;
const NOISE_BUCKET_COUNT = 10; // 10 x 500ms = a 5s memory of the room
// A true minimum is biased low (it is the quietest instant, not the average floor);
// scaling it up is the standard correction so the SNR factor multiplies something closer
// to the room's actual level.
const NOISE_FLOOR_BIAS = 1.5;
// Upper bound on the computed threshold. An energy VAD cannot actually separate speech
// from loud steady noise (the header's note about Silero is the honest answer there), and
// without a cap a noisy room silently becomes a DEAF room: floor 0.09 x 1.5 x 4 would
// demand RMS 0.54 to register, which is clipping territory -- the child would talk and
// nothing would ever open a turn. Capping trades some false positives in a loud room for
// never being unable to hear at all, which is the right way round for a tutor.
const RMS_THRESHOLD_MAX = 0.05;
// No onset may fire until the estimator has measured at least one full bucket. Buckets
// start empty (not seeded at a guessed level) because seeding them low produced a ~5s
// startup window -- caught in simulation -- where the floor was pinned at the guess while
// the real room was louder, so the very first thing a noisy room did was fire one phantom
// onset lasting until the seeds aged out. That window is exactly when the cold-start
// opener is being generated: the one turn that must not be destroyed.
const VAD_WARMUP_MS = NOISE_BUCKET_MS;

class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._inBuf = new Float32Array(0);
    this._voiced = false;
    this._voicedStreakMs = 0;
    this._silenceStreakMs = 0;
    this._prerollFrames = [];
    this._prerollMaxFrames = Math.ceil(PREROLL_MS / 20);
    this._seq = 0;
    this._noiseBuckets = []; // empty, not seeded -- see VAD_WARMUP_MS
    this._bucketMin = Infinity;
    this._bucketMs = 0;
    this._elapsedMs = 0;
  }

  /** Quietest 500ms bucket in the last ~5s, bias-corrected -- see NOISE_BUCKET_MS. */
  _updateNoiseFloor(rms) {
    if (rms < this._bucketMin) this._bucketMin = rms;
    this._bucketMs += 20;
    if (this._bucketMs >= NOISE_BUCKET_MS) {
      this._noiseBuckets.push(this._bucketMin);
      if (this._noiseBuckets.length > NOISE_BUCKET_COUNT) this._noiseBuckets.shift();
      this._bucketMin = Infinity;
      this._bucketMs = 0;
    }
    let floor = Infinity;
    for (const b of this._noiseBuckets) if (b < floor) floor = b;
    // Include the bucket still filling, so a room that just got quieter is believed
    // immediately rather than up to 500ms later.
    if (this._bucketMin < floor) floor = this._bucketMin;
    return floor * NOISE_FLOOR_BIAS;
  }

  _resample(input, fromRate) {
    if (fromRate === TARGET_RATE) return input;
    const ratio = fromRate / TARGET_RATE;
    const newLength = Math.round(input.length / ratio);
    const out = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const nextIndex = i * ratio;
      const index = Math.floor(nextIndex);
      const frac = nextIndex - index;
      const next = index + 1 < input.length ? input[index + 1] : input[index];
      out[i] = input[index] + frac * (next - input[index]);
    }
    return out;
  }

  _toInt16(float32) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  _rms(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length);
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    const merged = new Float32Array(this._inBuf.length + channel.length);
    merged.set(this._inBuf, 0);
    merged.set(channel, this._inBuf.length);
    this._inBuf = merged;

    // Native sample rate isn't known statically; `sampleRate` is a global in worklet scope.
    const nativeFrameSamples = Math.round((20 / 1000) * sampleRate);
    while (this._inBuf.length >= nativeFrameSamples) {
      const frame = this._inBuf.subarray(0, nativeFrameSamples);
      this._inBuf = this._inBuf.subarray(nativeFrameSamples);
      this._handleFrame(frame);
    }
    return true;
  }

  _handleFrame(nativeFrame) {
    const resampled = this._resample(nativeFrame, sampleRate);
    const pcm16 = this._toInt16(resampled);
    const rms = this._rms(resampled);
    // Every frame feeds the estimator, voiced or not -- that is the whole point of using
    // a minimum rather than an average (see NOISE_BUCKET_MS).
    const noiseFloor = this._updateNoiseFloor(rms);
    this._elapsedMs += 20;
    const threshold = Math.min(
      RMS_THRESHOLD_MAX,
      Math.max(RMS_ABSOLUTE_FLOOR, noiseFloor * RMS_SNR_FACTOR),
    );
    const isVoiced = this._elapsedMs >= VAD_WARMUP_MS && rms >= threshold;

    if (isVoiced) {
      this._voicedStreakMs += 20;
      this._silenceStreakMs = 0;
    } else {
      this._silenceStreakMs += 20;
      this._voicedStreakMs = 0;
    }

    if (!this._voiced) {
      // Ring buffer of raw 20ms frames, so a real onset can flush what led up to it.
      this._prerollFrames.push(pcm16);
      if (this._prerollFrames.length > this._prerollMaxFrames) this._prerollFrames.shift();

      if (this._voicedStreakMs >= MIN_SPEECH_MS) {
        this._voiced = true;
        const preroll = _concatInt16(this._prerollFrames);
        this._prerollFrames = [];
        this.port.postMessage({ type: "speech_start", preroll: preroll.buffer }, [preroll.buffer]);
      }
      return;
    }

    // Already voiced: stream every frame, watch for the hangover window closing.
    this.port.postMessage({ type: "frame", pcm: pcm16.buffer, seq: this._seq++ }, [pcm16.buffer]);
    if (this._silenceStreakMs >= HANGOVER_MS) {
      this._voiced = false;
      this._voicedStreakMs = 0;
      this._silenceStreakMs = 0;
      this.port.postMessage({ type: "speech_end" });
    }
  }
}

function _concatInt16(frames) {
  let total = 0;
  for (const f of frames) total += f.length;
  const out = new Int16Array(total);
  let offset = 0;
  for (const f of frames) {
    out.set(f, offset);
    offset += f.length;
  }
  return out;
}

registerProcessor("mic-processor", MicProcessor);
