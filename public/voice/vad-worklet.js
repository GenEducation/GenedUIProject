// The client VAD (ADR 0021), on the audio thread. Loaded before `capture-worklet.js` into the same AudioWorklet scope, which uses
// what this file puts on `globalThis` (a worklet module may not rely on imports, and the tests run these very files in a vm).
//
// Four questions, each answered by its own evidence, none by a language-specific rule:
//   is this sound speech-like?   pitch periodicity and the band level over the background (the per-frame probability);
//   what is the background?      a low percentile of the last 2.5 s followed at bounded rates (the noise floor), and the level of
//                                the speech-like sound that turned out not to be the learner (background voices: a turn that held
//                                on to its bound, one the server found no words in, a steady candidate that was refused);
//   is it the tutor's own echo?  the tutor's output level as the playback worklet rendered it, delayed by up to the echo path,
//                                decaying as a room does, times the coupling this device's microphone shows (learned while the
//                                tutor speaks and nobody else does): a frame the echo explains is not the learner's;
//   is it the learner?           its level against the learner's own accepted turns (distance from the microphone, not identity)
//                                and, while that is unknown, the shape of a single near voice: syllables that fall back towards the
//                                floor between them (a steady sound, a babble of voices or a far, reverberant voice fills them).
// A candidate is confirmed only after `confirm_ms` of evidence or at its end, whichever is first: its audio is kept and sent from
// its first speech-like frame, so the confirmation costs no end-of-turn latency, only a barge-in's reaction time.
"use strict";

// One block: its names stay out of the scope the capture worklet shares with it (a vm script there, a module in a browser).
(() => {
const VAD_FRAME = 320;
const VAD_FRAME_MS = 20;

// `params` are the decision thresholds, reported in `init`; `tuning` are the rates and windows under them. The version names the
// whole set, so a turn can always be analysed against what decided it. Every value is provisional (ADR 0021: thresholds wait for
// children's data) and configurable: the page may override any of them (`VoicePipeline` option `vad`), and the overrides are what
// `init` reports.
const VAD = {
  name: "snr_periodicity_level",
  version: "4.1",
  params: {
    start_frames: 3, admit_frames: 6, hangover_ms: 300, start_prob: 0.7, continue_prob: 0.3, snr_lo_db: 3, snr_hi_db: 15,
    per_lo: 0.25, per_hi: 0.6, min_rms: 60,
    bg_window_ms: 2500, bg_percentile: 0.2,
    profile_min_turns: 3, profile_margin_db: 4, quiet_allowance_db: 6, bounded_max_ms: 10000,
    // v4: confirmation, the shape of a near voice, background voices and the tutor's echo.
    confirm_ms: 400, modulation_min_db: 9, bg_voice_margin_db: 6, echo_margin_db: 6, echo_free_share: 0.6, echo_max_delay_ms: 400,
    // v4.1: the learner's levels may spread (auto gain, leaning in and away), but the spread may not lower the bar without limit;
    // and a turn ends when what goes on is this far below how the turn began (the speaker stopped; the room carried on).
    profile_spread_max_db: 6, turn_drop_db: 15,
  },
};
const TUNING = {
  band_lo_hz: 300, band_hi_hz: 3400, calibrate_ms: 500, bg_up_db_s: 4, bg_up_speaking_db_s: 2, bg_up_pitchless_db_s: 16,
  bg_down_db_s: 12, profile_spread_min_db: 2, level_check_ms: 1500,
  lead_frames: 10,             // audio kept before a candidate's first speech-like frame (the onset the VAD needed to see it)
  bg_voice_keep: 8, bg_voice_ttl_s: 90,
  echo_min_delay_ms: 10, echo_decay_db_s: 120, echo_window_s: 1.5, echo_ref_active_db: 30, echo_coupling_init_db: -6,
  echo_coupling_min_db: -60, echo_learn_min: 25, echo_learn_keep: 200,
};

class Biquad {   // RBJ, direct form I
  constructor(kind, freq, rate = 16000, q = Math.SQRT1_2) {
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

// The tutor's echo as the microphone may hear it. The playback worklet reports what it rendered (time on the audio clock, level in
// the capture's dB scale); the echo of a block reaches the microphone between `echo_min_delay_ms` and `echo_max_delay_ms` later (the
// output and input paths and the canceller), at its level plus this device's coupling, and rings on, decaying, after that.
class EchoModel {
  constructor(p) { this.p = p; this.refs = []; this.residuals = []; this.coupling = p.echo_coupling_init_db; }
  ref(t, db) {
    this.refs.push([t, db]);
    while (this.refs.length && this.refs[0][0] < t - this.p.echo_window_s) this.refs.shift();
  }
  // The level the tutor's own sound could have at the microphone at time t, before the coupling (-Infinity: nothing it played reaches t).
  raw(t) {
    const p = this.p, lo = t - p.echo_window_s, hi = t - p.echo_min_delay_ms / 1000, max = p.echo_max_delay_ms / 1000;
    let best = -Infinity;
    for (const [tk, db] of this.refs) {
      if (tk < lo || tk > hi) continue;
      const late = t - tk - max;
      best = Math.max(best, late > 0 ? db - p.echo_decay_db_s * late : db);
    }
    return best;
  }
  predict(t) { const r = this.raw(t); return r === -Infinity ? r : r + this.coupling; }
  // A frame the learner is not speaking in, while the tutor's sound is arriving: how far below its reference the microphone heard it.
  learn(t, bandDb) {
    const p = this.p, r = this.raw(t);
    if (r < p.echo_ref_active_db) return;
    this.residuals.push(bandDb - r);
    if (this.residuals.length > p.echo_learn_keep) this.residuals.shift();
    if (this.residuals.length >= p.echo_learn_min) this.coupling = Math.max(p.echo_coupling_min_db, pct(this.residuals, 0.9));
  }
  active(t) { return this.raw(t) >= this.p.echo_ref_active_db; }
}

class SpeechVad {
  constructor(overrides = {}) {
    const p = (this.p = { ...VAD.params, ...TUNING, ...overrides });
    this.hp = new Biquad("high", p.band_lo_hz); this.lp = new Biquad("low", p.band_hi_hz);
    this.hist = new Float32Array(200 + VAD_FRAME);
    this.floor = null; this.seen = 0; this.run = 0; this.silent = 0; this.speaking = false;
    this.bg = []; this.levels = []; this.cand = null; this.turn = null; this.bgVoices = [];
    this.echo = new EchoModel(p);
  }
  // The band-limited signal and its periodicity (the best normalised autocorrelation over pitch lags of 80-500 Hz).
  features(frame) {
    const h = this.hist;
    h.copyWithin(0, VAD_FRAME);
    let e = 0;
    for (let i = 0; i < VAD_FRAME; i++) { const s = this.lp.step(this.hp.step(frame[i])); h[200 + i] = s; e += s * s; }
    let best = 0;
    if (e > 1e-6) {
      let el = 0;
      for (let n = 200; n < 200 + VAD_FRAME; n++) el += h[n - 32] * h[n - 32];
      for (let lag = 32; lag <= 200; lag++) {
        if (lag > 32) { const out = h[200 + VAD_FRAME - lag], inn = h[200 - lag]; el += inn * inn - out * out; }
        let num = 0;
        for (let n = 200; n < 200 + VAD_FRAME; n++) num += h[n] * h[n - lag];
        if (num > 0 && el > 1e-6) best = Math.max(best, num / Math.sqrt(e * el));
      }
    }
    return { bandDb: 10 * Math.log10(e / VAD_FRAME + 1e-3), periodicity: best };
  }
  // The learner's accepted turns, as levels (the session worker sends them after the server accepted a turn with words).
  // Each is a level, or [level, weight]: a one-word turn counts less than a sentence (the session worker decides the weight).
  setLevels(levels) {
    this.levels = levels.map((x) => (Array.isArray(x) ? x : [x, 1])).filter(([d, w]) => Number.isFinite(d) && w > 0).slice(-12);
  }
  // A sound that was speech-like and turned out not to be the learner (the server heard no words in it, or it held a turn to its
  // bound): its level is a background voice's. Kept for `bg_voice_ttl_s`, the newest `bg_voice_keep`.
  backgroundVoice(level, t) {
    if (!Number.isFinite(level)) return;
    this.bgVoices.push([t, level]);
    if (this.bgVoices.length > this.p.bg_voice_keep) this.bgVoices.shift();
  }
  bgVoice(t) {
    this.bgVoices = this.bgVoices.filter(([at]) => t - at <= this.p.bg_voice_ttl_s);
    return this.bgVoices.length ? pct(this.bgVoices.map(([, d]) => d), 0.5) : null;
  }
  // Where a candidate stands against the learner's levels: the reference is the lower quartile of the turns, the margin widens with
  // their spread. `null` while too few turns are known for strong rejection.
  // Strong rejection needs `profile_min_turns` of weight, at least one of them a full-weight turn: one-word answers alone never set it.
  profile() {
    const p = this.p, L = this.levels, total = L.reduce((s, [, w]) => s + w, 0);
    if (total < p.profile_min_turns || !L.some(([, w]) => w >= 1)) return null;
    const lo = wpct(L, 0.25), spread = Math.min(p.profile_spread_max_db, Math.max(p.profile_spread_min_db, wpct(L, 0.75) - lo));
    const confident = lo - p.profile_margin_db - spread;
    return { n: L.length, weight: total, median: wpct(L, 0.5), confident, quiet: confident - p.quiet_allowance_db };
  }
  background(f, calibrating, pitched) {
    const p = this.p, win = p.bg_window_ms / VAD_FRAME_MS;
    this.bg.push(f.bandDb); if (this.bg.length > win) this.bg.shift();
    if (calibrating) { this.floor += (f.bandDb - this.floor) * 0.2; return; }
    const target = pct(this.bg, p.bg_percentile), step = VAD_FRAME_MS / 1000;
    if (target < this.floor) { this.floor = Math.max(target, this.floor - p.bg_down_db_s * step); return; }
    const up = !this.speaking ? p.bg_up_db_s : pitched ? p.bg_up_speaking_db_s : p.bg_up_pitchless_db_s;
    this.floor = Math.min(target, this.floor + up * step);
  }
  idle(why) { this.speaking = false; this.run = 0; this.cand = null; const t = this.turn; this.turn = null; return { why, turn: t }; }

  // One 20 ms frame: `t` is its end on the audio clock (the echo's clock). `gated`: half duplex holds the VAD idle.
  step(frame, rms, gated, t = 0) {
    const p = this.p, f = this.features(frame);
    if (this.floor === null) this.floor = f.bandDb;
    const calibrating = this.seen++ < p.calibrate_ms / VAD_FRAME_MS;
    this.background(f, calibrating, f.periodicity >= p.per_lo);
    const snr = f.bandDb - this.floor;
    const prob = Math.min(1, smooth(snr, p.snr_lo_db, p.snr_hi_db) * (0.6 + 0.4 * smooth(f.periodicity, p.per_lo, p.per_hi)));
    const echoDb = this.echo.predict(t);
    const echoed = f.bandDb < echoDb + p.echo_margin_db;               // the tutor's echo explains this frame
    const out = { prob, voiced: false, event: null, snr, periodicity: f.periodicity, bandDb: f.bandDb, echo: echoed };
    if (!this.speaking && !this.cand) this.echo.learn(t, f.bandDb);   // nobody is speaking: what is heard is the echo (or the room)
    if (gated) { this.idle(null); this.silent = 0; return out; }
    const loud = rms >= p.min_rms;
    if (this.speaking) return this.continueTurn(out, f, loud && prob >= p.continue_prob && !echoed, t);
    if (this.cand) return this.continueCandidate(out, f, loud && prob >= p.continue_prob, echoed, t);
    const likely = loud && prob >= p.start_prob && !calibrating;
    this.run = likely ? this.run + 1 : 0;
    if (!likely) return out;
    out.voiced = this.run >= p.start_frames;
    if (this.run < p.start_frames) return out;
    this.cand = { frames: [], silent: 0, first: t - (p.start_frames - 1) * VAD_FRAME_MS / 1000 };
    return this.continueCandidate(out, f, true, echoed, t);
  }

  // A candidate gathers evidence until `confirm_ms` of it, or until it ends (a short word): then it is admitted or refused.
  continueCandidate(out, f, voiced, echoed, t) {
    const p = this.p, c = this.cand;
    c.frames.push({ db: f.bandDb, voiced, echoed });
    c.silent = voiced ? 0 : c.silent + 1;
    out.voiced = voiced;
    const ended = c.silent * VAD_FRAME_MS >= p.hangover_ms;
    if (!ended && c.frames.length * VAD_FRAME_MS < p.confirm_ms) return out;
    const voicedFrames = c.frames.filter((x) => x.voiced).length;
    if (voicedFrames < p.admit_frames) { this.cand = null; this.run = 0; return out; }   // a click, a breath: nothing to decide
    return this.decide(out, t, ended);
  }

  // Everything known about a candidate, as numbers: what decided it is reported with it.
  evidence(t) {
    const c = this.cand, v = c.frames.filter((x) => x.voiced);
    const all = c.frames.map((x) => x.db);
    return {
      level: pct(v.map((x) => x.db), 0.75),
      modulation: pct(all, 0.9) - pct(all, 0.1),
      echoFree: v.length ? v.filter((x) => !x.echoed).length / v.length : 0,
      echo: c.frames.some((x) => x.echoed) || this.echo.active(t),
      bgVoice: this.bgVoice(t),
    };
  }

  decide(out, t, ended) {
    const p = this.p, e = this.evidence(t), prof = this.profile();
    const refuse = (why) => {
      out.reject = { why, deltaDb: prof ? e.level - prof.median : null, n: prof ? prof.n : this.levels.length, modulationDb: e.modulation, echoFree: e.echoFree, bgDeltaDb: e.bgVoice === null ? null : e.level - e.bgVoice };
      // A steady speech-like sound that is not the learner is a background voice: the next one at its level needs more evidence.
      if (why === "steady") this.backgroundVoice(e.level, t);
      this.cand = null; this.run = 0;
      return out;
    };
    let tier;
    if (e.echo && e.echoFree < p.echo_free_share) return refuse("echo");
    if (prof && e.level >= prof.confident) tier = "confident";
    else if (prof && e.level < prof.quiet) return refuse("level");
    else {
      // Unknown learner level, or within the quiet allowance: only the shape of a near voice, above any background voice, admits.
      if (e.modulation < p.modulation_min_db) return refuse("steady");
      if (e.bgVoice !== null && e.level < e.bgVoice + p.bg_voice_margin_db) return refuse("background");
      if (prof && e.level - this.floor < p.snr_hi_db) return refuse("level");   // the quiet allowance needs a clear margin over the room
      tier = prof ? "quiet" : "unprofiled";
    }
    const c = this.cand;
    this.speaking = true; this.silent = c.silent; this.cand = null;
    const voiced = c.frames.filter((x) => x.voiced).map((x) => x.db);
    this.turn = { tier, frames: c.frames.length, voicedDb: voiced, recent: voiced.map((d, i) => [i + 1, d]), openDb: pct(voiced, 0.75) };
    out.event = "start";
    out.lead = c.frames.length - 1 + p.start_frames - 1 + p.lead_frames;   // frames before this one to send ahead of it
    out.admit = { tier, deltaDb: prof ? e.level - prof.median : null, n: prof ? prof.n : this.levels.length, modulationDb: e.modulation, echoFree: e.echoFree, bgDeltaDb: e.bgVoice === null ? null : e.level - e.bgVoice, confirmMs: c.frames.length * VAD_FRAME_MS };
    return out;
  }

  continueTurn(out, f, voiced, at) {
    const p = this.p, t = this.turn;
    out.voiced = voiced;
    t.frames++;
    if (voiced) { t.voicedDb.push(f.bandDb); t.recent.push([t.frames, f.bandDb]); }
    while (t.recent.length && t.frames - t.recent[0][0] > p.level_check_ms / VAD_FRAME_MS) t.recent.shift();
    this.silent = voiced ? 0 : this.silent + 1;
    let why = null;
    if (this.silent * VAD_FRAME_MS >= p.hangover_ms) why = "hangover";
    else if (t.tier !== "confident" && t.frames * VAD_FRAME_MS >= p.bounded_max_ms) why = "bounded";
    else if (t.frames * VAD_FRAME_MS >= p.level_check_ms && t.recent.length >= 10) {
      const now = pct(t.recent.map((r) => r[1]), 0.75), prof = this.profile();
      if (t.tier === "confident" && prof && now < prof.quiet) why = "level";   // what goes on is not the learner's level
      else if (now < t.openDb - p.turn_drop_db) why = "drop";                   // nor the level the turn began at
    }
    if (!why) return out;
    const { turn } = this.idle(why);
    out.event = "end";
    out.end = { why, level: pct(turn.voicedDb, 0.75), ms: turn.frames * VAD_FRAME_MS, voicedMs: turn.voicedDb.length * VAD_FRAME_MS, tier: turn.tier };
    if (why === "bounded") {
      this.floor = Math.max(this.floor, pct(this.bg, 0.5));   // the sound that held it on is the background now
      this.backgroundVoice(out.end.level, at);                  // and its level is a background voice's
    }
    return out;
  }
}

globalThis.GenedVad = { VAD, TUNING, SpeechVad, EchoModel, Biquad, pct, VAD_FRAME, VAD_FRAME_MS };
})();
