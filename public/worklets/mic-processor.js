// Mic capture worklet for /ws/v3/voice (ADR-0015 / speech-pipeline-architecture.md §2 A1-A6).
//
// Runs at the AudioContext's native sample rate (almost always 48000 Hz) on the audio
// render thread, and does three things every 20ms render block: resample to 16k PCM16,
// run an energy-based VAD with hangover, and maintain a 300ms preroll ring buffer.
//
// VAD here is deliberately simple (RMS threshold + hangover), not Silero. The design doc
// (§3) calls for Silero because energy thresholds fail in a noisy classroom -- worth
// upgrading to, but the wire protocol and the main-thread service do not change either
// way: only this file's _isVoiced() would be replaced by an ONNX inference call. Ship
// the simple version first, swap the decision function later.

const NATIVE_FRAME_SAMPLES = 960; // ~20ms @ 48kHz; process() delivers 128-sample quanta, buffered up
const TARGET_RATE = 16000;
const PREROLL_MS = 300;
const MIN_SPEECH_MS = 250;
const HANGOVER_MS = 700;
const RMS_THRESHOLD = 0.02;

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
    const isVoiced = rms >= RMS_THRESHOLD;

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
