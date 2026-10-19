// Capture, on the audio thread (Phase 3): the microphone at the context's rate -> 16 kHz mono, 20 ms frames, each with the audio
// clock time of its last sample, a speech probability and the client VAD's decision (ADR 0015 decision 3, ADR 0021 decision 1).
// Nothing here touches the main thread: frames go straight to the session worker over a MessagePort, so a busy page cannot
// delay or reorder them. The file is self-contained (an AudioWorklet module needs no imports, and the tests run this very file).
//
//   resampler  windowed-sinc (Kaiser) low-pass + fractional-phase interpolation; sample k of the input is at time k / rate, an
//              output sample is stamped with the time of the input position it is centred on, so the stamp does not depend on the
//              filter's delay.
//   VAD        speech-band SNR over a rolling-percentile background and pitch periodicity give a probability per frame; a candidate
//              speech-like for `admit_frames` is admitted against the learner's own level (see SpeechVad), and ends after
//              `hangover_ms` below the continue threshold, or by its bound. Parameters are provisional (ADR 0021: thresholds wait for
//              data); they are reported in `init` so every turn can be analysed against them.
"use strict";

const OUT_RATE = 16000;
const FRAME = 320;
const FRAME_MS = 20;
const QUANTUM = 128;

// `params` are the decision thresholds, reported in `init` (the wire allows 16); `tuning` are the rates and windows under them. The
// version names the whole set, so a turn can always be analysed against what decided it.
const VAD = {
  name: "snr_periodicity_level",
  version: "3",
  params: {
    start_frames: 3, admit_frames: 6, hangover_ms: 300, start_prob: 0.7, continue_prob: 0.3, snr_lo_db: 3, snr_hi_db: 15,
    per_lo: 0.25, per_hi: 0.6, min_rms: 60,
    // The background: a low percentile of the band level over a rolling window (followed at bounded rates: see `tuning`).
    bg_window_ms: 2500, bg_percentile: 0.2,
    // The learner's level: robust statistics of accepted turns' levels; strong rejection only once `profile_min_turns` exist.
    profile_min_turns: 3, profile_margin_db: 4, quiet_allowance_db: 6, bounded_max_ms: 10000,
  },
};
const TUNING = {
  band_lo_hz: 300, band_hi_hz: 3400, calibrate_ms: 500, bg_up_db_s: 4, bg_up_speaking_db_s: 2, bg_up_pitchless_db_s: 16,
  bg_down_db_s: 12, profile_spread_min_db: 2, level_check_ms: 1500,
};

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

// RBJ biquads, direct form I.
class Biquad {
  constructor(kind, freq, rate = OUT_RATE, q = Math.SQRT1_2) {
    const w = (2 * Math.PI * freq) / rate, c = Math.cos(w), a = Math.sin(w) / (2 * q);
    const b = kind === "high" ? [(1 + c) / 2, -(1 + c), (1 + c) / 2] : [(1 - c) / 2, 1 - c, (1 - c) / 2];
    const a0 = 1 + a;
    this.b = b.map((v) => v / a0); this.a1 = (-2 * c) / a0; this.a2 = (1 - a) / a0;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  step(x) {
    const y = this.b[0] * x + this.b[1] * this.x1 + this.b[2] * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

const smooth = (x, lo, hi) => { const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };

const pct = (xs, q) => {
  if (!xs.length) return null;
  const v = [...xs].sort((x, y) => x - y), i = (v.length - 1) * q, lo = Math.floor(i);
  return v[lo] + (v[Math.min(lo + 1, v.length - 1)] - v[lo]) * (i - lo);
};

// A weighted percentile of [value, weight] pairs (the value at which the cumulative weight reaches q of the total).
const wpct = (xs, q) => {
  const v = [...xs].sort((a, b) => a[0] - b[0]), total = v.reduce((s, [, w]) => s + w, 0);
  let acc = 0;
  for (const [d, w] of v) { acc += w; if (acc >= q * total - 1e-9) return d; }
  return v.at(-1)[0];
};

// The client VAD (ADR 0021). Three questions, each answered by its own feature:
//   is this sound speech-like?   pitch periodicity and the band level over the background (the probability, unchanged);
//   what is the background?      a low percentile of the last 2.5 s, followed at bounded rates, so a gap does not reset it to the
//                                quietest moment and a sustained sound, pitched or not, becomes the background in seconds;
//   is it the learner?           its level against the levels of the learner's own accepted turns (distance from the microphone,
//                                not identity). Pitch alone never admits a turn once the learner's level is known.
// A candidate that is admitted with low confidence (no profile yet, or in the quiet allowance) is bounded in length: a voice in the
// room cannot hold an utterance open just by having a pitch.
class SpeechVad {
  constructor(p = { ...VAD.params, ...TUNING }) {
    this.p = p;
    this.hp = new Biquad("high", p.band_lo_hz); this.lp = new Biquad("low", p.band_hi_hz);
    this.hist = new Float32Array(200 + FRAME);
    this.floor = null; this.seen = 0; this.run = 0; this.silent = 0; this.speaking = false;
    this.bg = []; this.levels = []; this.cand = []; this.turn = null;
  }
  // The band-limited signal and its periodicity (the best normalised autocorrelation over pitch lags of 80-500 Hz).
  features(frame) {
    const h = this.hist;
    h.copyWithin(0, FRAME);
    let e = 0;
    for (let i = 0; i < FRAME; i++) { const s = this.lp.step(this.hp.step(frame[i])); h[200 + i] = s; e += s * s; }
    let best = 0;
    if (e > 1e-6) {
      let el = 0;
      for (let n = 200; n < 200 + FRAME; n++) el += h[n - 32] * h[n - 32];
      for (let lag = 32; lag <= 200; lag++) {
        if (lag > 32) { const out = h[200 + FRAME - lag], inn = h[200 - lag]; el += inn * inn - out * out; }
        let num = 0;
        for (let n = 200; n < 200 + FRAME; n++) num += h[n] * h[n - lag];
        if (num > 0 && el > 1e-6) best = Math.max(best, num / Math.sqrt(e * el));
      }
    }
    return { bandDb: 10 * Math.log10(e / FRAME + 1e-3), periodicity: best };
  }
  // The learner's accepted turns, as levels (the session worker sends them after the server accepted a turn with words).
  // Each is a level, or [level, weight]: a one-word turn counts less than a sentence (the session worker decides the weight).
  setLevels(levels) {
    this.levels = levels.map((x) => (Array.isArray(x) ? x : [x, 1])).filter(([d, w]) => Number.isFinite(d) && w > 0).slice(-12);
  }
  // Where a candidate stands against the learner's levels: the reference is the lower quartile of the turns, the margin widens with
  // their spread. `null` while too few turns are known for strong rejection.
  // Strong rejection needs `profile_min_turns` of weight, at least one of them a full-weight turn: one-word answers alone never set it.
  profile() {
    const p = this.p, L = this.levels, total = L.reduce((s, [, w]) => s + w, 0);
    if (total < p.profile_min_turns || !L.some(([, w]) => w >= 1)) return null;
    const lo = wpct(L, 0.25), spread = Math.max(p.profile_spread_min_db, wpct(L, 0.75) - lo);
    const confident = lo - p.profile_margin_db - spread;
    return { n: L.length, weight: total, median: wpct(L, 0.5), confident, quiet: confident - p.quiet_allowance_db };
  }
  background(f, calibrating, pitched) {
    const p = this.p, win = p.bg_window_ms / FRAME_MS;
    this.bg.push(f.bandDb); if (this.bg.length > win) this.bg.shift();
    if (calibrating) { this.floor += (f.bandDb - this.floor) * 0.2; return; }
    const target = pct(this.bg, p.bg_percentile), step = FRAME_MS / 1000;
    if (target < this.floor) { this.floor = Math.max(target, this.floor - p.bg_down_db_s * step); return; }
    const up = !this.speaking ? p.bg_up_db_s : pitched ? p.bg_up_speaking_db_s : p.bg_up_pitchless_db_s;
    this.floor = Math.min(target, this.floor + up * step);
  }
  idle(why) { this.speaking = false; this.run = 0; this.cand = []; const t = this.turn; this.turn = null; return { why, turn: t }; }
  step(frame, rms, gated) {
    const p = this.p, f = this.features(frame);
    if (this.floor === null) this.floor = f.bandDb;
    const calibrating = this.seen++ < p.calibrate_ms / FRAME_MS;
    this.background(f, calibrating, f.periodicity >= p.per_lo);
    const snr = f.bandDb - this.floor;
    const prob = Math.min(1, smooth(snr, p.snr_lo_db, p.snr_hi_db) * (0.6 + 0.4 * smooth(f.periodicity, p.per_lo, p.per_hi)));
    const out = { prob, voiced: false, event: null, snr, periodicity: f.periodicity, bandDb: f.bandDb };
    if (gated) { this.idle(null); this.silent = 0; return out; }
    const loud = rms >= p.min_rms;
    if (!this.speaking) {
      const voiced = loud && prob >= p.start_prob && !calibrating;
      this.run = voiced ? this.run + 1 : 0;
      if (!voiced) { this.cand = []; return out; }
      out.voiced = this.run >= p.start_frames;
      this.cand.push(f.bandDb);
      if (this.run < p.admit_frames) return out;
      return this.admit(out);
    }
    const t = this.turn;
    out.voiced = loud && prob >= p.continue_prob;
    t.frames++;
    if (out.voiced) { t.voicedDb.push(f.bandDb); t.recent.push([t.frames, f.bandDb]); }
    while (t.recent.length && t.frames - t.recent[0][0] > p.level_check_ms / FRAME_MS) t.recent.shift();
    this.silent = out.voiced ? 0 : this.silent + 1;
    let why = null;
    if (this.silent * FRAME_MS >= p.hangover_ms) why = "hangover";
    else if (t.tier !== "confident" && t.frames * FRAME_MS >= p.bounded_max_ms) why = "bounded";
    else if (t.tier === "confident" && t.frames * FRAME_MS >= p.level_check_ms && t.recent.length >= 10) {
      const prof = this.profile();
      if (prof && pct(t.recent.map((r) => r[1]), 0.75) < prof.quiet) why = "level";   // what goes on is not the learner's level
    }
    if (why) {
      const { turn } = this.idle(why);
      out.event = "end";
      out.end = { why, level: pct(turn.voicedDb, 0.75), ms: turn.frames * FRAME_MS, voicedMs: turn.voicedDb.length * FRAME_MS, tier: turn.tier };
      if (why === "bounded") this.floor = Math.max(this.floor, pct(this.bg, 0.5));   // the sound that held it on is the background now
    }
    return out;
  }
  // The admission of a candidate that has been speech-like for `admit_frames`: against the learner's level, when it is known.
  admit(out) {
    const p = this.p, level = pct(this.cand, 0.75), prof = this.profile();
    let tier;
    if (!prof) tier = "unprofiled";
    else if (level >= prof.confident) tier = "confident";
    else if (level >= prof.quiet && out.snr >= p.snr_hi_db) tier = "quiet";
    else {
      out.voiced = false;
      out.reject = { deltaDb: level - prof.median, n: prof.n };
      this.run = 0; this.cand = [];
      return out;
    }
    this.speaking = true; this.silent = 0;
    this.turn = { tier, frames: this.cand.length, voicedDb: [...this.cand], recent: this.cand.map((d, i) => [i + 1, d]) };
    this.cand = [];
    out.voiced = true; out.event = "start";
    out.admit = { tier, deltaDb: prof ? level - prof.median : null, n: prof ? prof.n : this.levels.length };
    return out;
  }
}

class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.rs = new Resampler(sampleRate);
    this.vad = new SpeechVad();
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
    };
    this.port.onmessage = (e) => {
      if (e.data.t === "sink") { this.out = e.ports[0]; this.out.onmessage = (ev) => control(ev.data); }
      else control(e.data);
    };
    this.port.postMessage({ t: "hello", vad: VAD, inRate: sampleRate, outRate: OUT_RATE, frame: FRAME });
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
    const r = this.vad.step(this.flt, rms, this.gated);
    const endTs = (this.base + this.lastPos) / sampleRate;
    const n = this.n;
    n.frames++; n.clipped += clipped; n.rmsSum += rms; n.peak = Math.max(n.peak, peak); n.since++;
    n.zeroRun = peak === 0 ? n.zeroRun + 1 : 0; if (peak === 0) n.zeroFrames++;
    const msg = {
      t: "f", pcm: this.pcm, endTs, postTs: currentTime + QUANTUM / sampleRate, prob: Math.round(r.prob * 255), voiced: r.voiced,
      ev: r.event, gap: this.gapPending, rms, ...(r.admit ? { admit: r.admit } : {}), ...(r.reject ? { reject: r.reject } : {}),
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
