// Capture, on the audio thread (Phase 3): the microphone at the context's rate -> 16 kHz mono, 20 ms frames, each with the audio
// clock time of its last sample, a speech probability and the client VAD's decision (ADR 0015 decision 3, ADR 0021 decision 1).
// Nothing here touches the main thread: frames go straight to the session worker over a MessagePort, so a busy page cannot
// delay or reorder them. No imports (the tests run this very file in a vm): `vad-worklet.js` is added to the worklet scope first.
//
//   resampler  windowed-sinc (Kaiser) low-pass + fractional-phase interpolation; sample k of the input is at time k / rate, an
//              output sample is stamped with the time of the input position it is centred on, so the stamp does not depend on the
//              filter's delay.
//   VAD        `vad-worklet.js` (SpeechVad): per-frame speech probability, a candidate confirmed against the noise floor, background
//              voices, the tutor's echo and the learner's own level. Its parameters are reported in `init` (with any page overrides).
//   echo       the playback worklet sends what it rendered over a port of its own (`echo`), on the same audio clock as the frames.
"use strict";

const OUT_RATE = 16000;
const FRAME = 320;
const FRAME_MS = 20;
const QUANTUM = 128;

function bessel0(x) {
  let sum = 1, term = 1;
  for (let k = 1; k < 40; k++) { term *= (x / (2 * k)) ** 2; sum += term; if (term < 1e-12 * sum) break; }
  return sum;
}

// Streaming sample-rate converter to 16 kHz. ``push`` takes input samples and calls ``emit(sample, input position)`` for every
// output sample, where the position is in input samples counted from the first one pushed after construction.
class Resampler {
  constructor(inRate) {
    this.ratio = inRate / OUT_RATE;
    this.passthrough = inRate === OUT_RATE;
    this.m = 0; this.base = 0; this.buf = new Float32Array(0);
    if (this.passthrough) return;
    const cutoff = Math.min(0.9, 7200 / (inRate / 2));            // relative to the input Nyquist
    const transition = (2 * Math.PI * 1600) / inRate;               // 7.2 kHz -> 8.8 kHz: nothing above 8.8 kHz may fold below 7.2 kHz
    const stop = 60;                                                // dB
    this.half = Math.ceil((stop - 7.95) / (2.285 * transition) / 2);
    const beta = 0.1102 * (stop - 8.7);
    const norm = bessel0(beta);
    this.phases = 64;
    const width = 2 * this.half + 1;
    this.table = new Float32Array((this.phases + 1) * width);
    for (let p = 0; p <= this.phases; p++) {
      let sum = 0;
      for (let j = -this.half; j <= this.half; j++) {
        const t = j - p / this.phases;
        const w = Math.abs(t) > this.half ? 0 : bessel0(beta * Math.sqrt(1 - (t / this.half) ** 2)) / norm;
        const s = t === 0 ? 1 : Math.sin(Math.PI * cutoff * t) / (Math.PI * cutoff * t);
        const h = cutoff * s * w;
        this.table[p * width + j + this.half] = h; sum += h;
      }
      for (let j = 0; j < width; j++) this.table[p * width + j] /= sum;   // unity gain at DC for every phase
    }
    this.width = width;
  }
  push(input, emit) {
    if (this.passthrough) { for (let i = 0; i < input.length; i++) emit(input[i], this.m++); return; }
    const merged = new Float32Array(this.buf.length + input.length);
    merged.set(this.buf); merged.set(input, this.buf.length);
    const last = this.base + merged.length;                       // one past the newest input index
    for (;;) {
      const pos = this.m * this.ratio;
      const n0 = Math.floor(pos);
      if (n0 + this.half >= last) break;                          // the filter still needs input that has not arrived
      const scaled = (pos - n0) * this.phases, p = Math.floor(scaled), lam = scaled - p;
      const row = p * this.width, next = row + this.width;
      let y = 0;
      for (let j = -this.half; j <= this.half; j++) {
        const idx = n0 + j - this.base;
        const x = idx < 0 ? 0 : merged[idx];                      // before the first sample: silence
        const k = j + this.half;
        y += x * ((1 - lam) * this.table[row + k] + lam * this.table[next + k]);
      }
      emit(y, pos);
      this.m++;
    }
    const keep = Math.max(0, Math.floor(this.m * this.ratio) - this.half - this.base);
    this.buf = merged.slice(keep); this.base += keep;
  }
}

const { VAD, SpeechVad } = globalThis.GenedVad;   // vad-worklet.js, loaded first into this scope

class Capture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.rs = new Resampler(sampleRate);
    const overrides = options?.processorOptions?.vad ?? {};
    this.vad = new SpeechVad(overrides);
    // What decided this session's turns: the version, and every reported threshold with the page's overrides applied.
    const params = Object.fromEntries(Object.keys(VAD.params).map((k) => [k, this.vad.p[k]]));
    this.description = { name: VAD.name, version: VAD.version, params };
    this.dc = { x: 0, y: 0 };
    this.out = null; this.gated = false;
    this.next = -1; this.base = 0; this.gapPending = false;
    this.pcm = new Int16Array(FRAME); this.flt = new Float32Array(FRAME); this.filled = 0; this.lastPos = 0;
    this.n = { frames: 0, gaps: 0, clipped: 0, noInput: 0, zeroFrames: 0, zeroRun: 0, rmsSum: 0, peak: 0, since: 0 };
    // Control comes from the main thread (`sink`) and from the session worker over the sink port itself (`gate`, `levels`): the
    // worker has no other way to reach this thread, so the sink port must be listened to as well (it was not: half duplex never
    // reached the VAD in a browser, only the uplink's own drop of the frames).
    const control = (m) => {
      if (m.t === "gate") this.gated = !!m.on;
      else if (m.t === "levels") this.vad.setLevels(m.levels);
      else if (m.t === "background_voice") this.vad.backgroundVoice(m.level, currentTime);
    };
    this.port.onmessage = (e) => {
      if (e.data.t === "sink") { this.out = e.ports[0]; this.out.onmessage = (ev) => control(ev.data); }
      else if (e.data.t === "echo") { e.ports[0].onmessage = (ev) => this.vad.echo.ref(ev.data.at, ev.data.db); }
      else control(e.data);
    };
    this.port.postMessage({ t: "hello", vad: this.description, inRate: sampleRate, outRate: OUT_RATE, frame: FRAME });
  }
  restart() {
    this.rs = new Resampler(sampleRate);
    this.dc = { x: 0, y: 0 }; this.filled = 0; this.base = currentFrame; this.gapPending = true;
    this.n.gaps++;
  }
  process(inputs) {
    const channels = inputs[0] || [];
    let input = channels[0];
    if (!input) { input = new Float32Array(QUANTUM); this.n.noInput++; }
    else if (channels.length > 1) { input = input.map((v, i) => channels.reduce((s, c) => s + c[i], 0) / channels.length); }
    if (this.next === -1) this.base = currentFrame;
    else if (currentFrame !== this.next) this.restart();           // the audio thread skipped time: say so, never paper over it
    this.next = currentFrame + input.length;
    this.rs.push(input, (x, pos) => this.sample(x, pos));
    return true;
  }
  sample(x, pos) {
    const y = x - this.dc.x + 0.995 * this.dc.y;                   // DC blocker
    this.dc.x = x; this.dc.y = y;
    const s = Math.max(-1, Math.min(1, y));
    this.flt[this.filled] = s * 32768;
    this.pcm[this.filled] = Math.round(s * 32767);
    this.filled++; this.lastPos = pos;
    if (this.filled === FRAME) this.finish();
  }
  finish() {
    this.filled = 0;
    let sq = 0, peak = 0, clipped = 0;
    for (let i = 0; i < FRAME; i++) {
      const v = this.pcm[i], a = Math.abs(v);
      sq += v * v; if (a > peak) peak = a; if (a >= 32000) clipped++;
    }
    const rms = Math.sqrt(sq / FRAME);
    const endTs = (this.base + this.lastPos) / sampleRate;
    const r = this.vad.step(this.flt, rms, this.gated, endTs);
    const n = this.n;
    n.frames++; n.clipped += clipped; n.rmsSum += rms; n.peak = Math.max(n.peak, peak); n.since++;
    n.zeroRun = peak === 0 ? n.zeroRun + 1 : 0; if (peak === 0) n.zeroFrames++;
    const msg = {
      t: "f", pcm: this.pcm, endTs, postTs: currentTime + QUANTUM / sampleRate, prob: Math.round(r.prob * 255), voiced: r.voiced,
      ev: r.event, gap: this.gapPending, rms, echo: r.echo, ...(r.admit ? { admit: r.admit, lead: r.lead } : {}), ...(r.reject ? { reject: r.reject } : {}),
      ...(r.end ? { end: r.end } : {}),
    };
    this.gapPending = false;
    (this.out || this.port).postMessage(msg, [this.pcm.buffer]);
    this.pcm = new Int16Array(FRAME);
    if (n.since >= 12) this.report();
  }
  report() {
    const n = this.n;
    this.port.postMessage({
      t: "stats", frames: n.frames, gaps: n.gaps, clipped: n.clipped, noInput: n.noInput, zeroFrames: n.zeroFrames,
      zeroMs: n.zeroRun * FRAME_MS, rms: n.rmsSum / n.since, peak: n.peak, floorDb: this.vad.floor,
      speaking: this.vad.speaking, gated: this.gated,
    });
    n.rmsSum = 0; n.peak = 0; n.since = 0;
  }
}
registerProcessor("capture", Capture);
