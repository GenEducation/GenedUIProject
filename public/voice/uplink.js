// The uplink: capture frames in, the wire's speech protocol out (ADR 0015 decisions 3, 5, 7, 11; ADR 0021 decisions 1 and 3).
// Pure and synchronous: the session worker gives it the socket's send functions and `bufferedAmount`, so everything here is tested
// in Node. What it owns:
//   sequencing   one `seq` per audio frame sent, from 0, never reused; a stretch of audio that was lost (the audio thread skipped
//                time, or the socket was backed up and a frame was dropped) is flagged on the next frame sent, never papered over;
//   utterances   speech_started, then the preroll (the last 200 ms before the VAD fired), then every frame, then
//                speech_candidate_ended with the last voiced sample's time (auto) or end_signal (hold to talk);
//   buffering    bounded: frames wait only in the preroll ring, and a frame is dropped (and flagged) when the socket's own buffer is
//                already above the limit, so a slow network costs audio inside the budget and never grows memory or latency;
//   duplex       half duplex gates the capture VAD while the tutor's audio is coming out (a reply must not be cut by its own echo);
//                full duplex ducks the tutor at once on this VAD's start and leaves the decision to the server (ADR 0024 decision 5).

import { encodeUplink } from "./wire.js";

export const DEFAULTS = { prerollFrames: 14, profileTurns: 12, rejectReportS: 2, oneWordMinVoicedMs: 400, oneWordWeight: 0.5, maxBufferedBytes: 64 * 1024, interrupt: "never" };
const FRAME_S = 0.02;
const TIERS = { confident: 0, quiet: 1, unprofiled: 2 };   // how a turn was admitted (client_diagnostic details are numbers)
const ENDS = { hangover: 0, level: 1, bounded: 2 };        // why it ended

export class Uplink {
  constructor({ text, binary, buffered, tell, cfg = {} }) {
    Object.assign(this, { text, binary, buffered, tell });
    this.cfg = { ...DEFAULTS, ...cfg };
    this.ready = false; this.mode = "auto"; this.held = false; this.playbackActive = false; this.gated = false;
    this.speaking = false; this.no = 0; this.seq = 0; this.dropGap = false; this.ring = [];
    this.lastVoicedEnd = null;
    this.turns = new Map();         // utterance no -> what the VAD measured of it: level (dB), voiced ms, tier, end, tutor audible
    this.learner = [];              // [level, weight] of the learner's accepted turns, newest last: the VAD's profile
    this.tutorAtStart = false;
    this.lastRejectAt = -Infinity;
    this.n = { sent: 0, dropped: 0, preroll: 0, gapsFlagged: 0, utterances: 0, peakBuffered: 0 };
  }

  setReady(on) {
    this.ready = on;
    if (!on) { this.speaking = false; this.held = false; this.ring = []; }
    this.updateGate();
  }
  setMode(mode) { this.mode = mode; this.held = false; this.updateGate(); }
  setPlaybackActive(on) { this.playbackActive = on; this.updateGate(); }

  // The capture VAD is held idle while the tutor is audible, unless the learner may interrupt (headphones) or is already speaking.
  updateGate() {
    const gate = this.cfg.interrupt === "never" && this.playbackActive && !this.speaking && this.mode === "auto";
    if (gate === this.gated) return;
    this.gated = gate;
    if (gate) this.ring = [];
    this.tell("capture", { t: "gate", on: gate });
  }

  diag(event, detail) { this.text({ type: "client_diagnostic", event, detail }); }

  // The VAD's admission decisions, as numbers (ADR 0021: every threshold is analysable against what it decided).
  decisions(f) {
    const r = (x) => (x === null || x === undefined ? undefined : Math.round(x * 10) / 10);
    if (f.reject && f.endTs - this.lastRejectAt >= this.cfg.rejectReportS) {
      this.lastRejectAt = f.endTs;
      this.diag("vad_reject", { delta_db: r(f.reject.deltaDb), profile_n: f.reject.n });
    }
    if (f.admit) this.diag("vad_admit", { tier: TIERS[f.admit.tier], delta_db: r(f.admit.deltaDb), profile_n: f.admit.n });
    if (f.end) this.diag("vad_end", { why: ENDS[f.end.why], tier: TIERS[f.end.tier], ms: f.end.ms, level_db: r(f.end.level) });
  }

  // The server accepted utterance `no` with `words` words: whether and how much it teaches the VAD the learner's level. A turn the VAD
  // already found suspicious (admitted only in the quiet allowance, or ended by its bound or on level) never does. A sentence counts
  // fully; a one-word answer counts less, and only when the tutor was silent and it had enough voice to be a word, not a blip.
  accepted(no, words) {
    const t = this.turns.get(no);
    this.turns.delete(no);
    if (!t || !Number.isFinite(t.level) || words < 1) return null;
    if (t.tier === "quiet" || t.why !== "hangover") return null;
    let weight = 1;
    if (words === 1) {
      if (t.tutorAudible || t.voicedMs < this.cfg.oneWordMinVoicedMs) return null;
      weight = this.cfg.oneWordWeight;
    }
    this.learner.push([t.level, weight]);
    if (this.learner.length > this.cfg.profileTurns) this.learner.shift();
    return this.learner.map((x) => [...x]);
  }
  resetProfile() { this.learner = []; this.turns.clear(); }

  onFrame(f) {
    if (this.gated) return;                                  // the tutor's own audio: not the learner's, never buffered
    this.decisions(f);
    if (!this.ready) { this.keep(f); return; }
    if (this.mode === "hold") { this.holdFrame(f); return; }
    if (!this.speaking) {
      if (f.ev === "start") this.begin(f);
      else this.keep(f);
      return;
    }
    this.audio(f, false);
    if (f.ev === "end") {
      if (f.end) {
        this.turns.set(this.no, { level: f.end.level, voicedMs: f.end.voicedMs ?? 0, tier: f.end.tier, why: f.end.why, tutorAudible: this.tutorAtStart });
        for (const k of this.turns.keys()) if (k < this.no - 8) this.turns.delete(k);
      }
      this.candidateEnd();
    }
  }

  keep(f) {
    this.ring.push(f);
    if (this.ring.length > this.cfg.prerollFrames) this.ring.shift();
  }

  begin(f) {
    this.tutorAtStart = this.playbackActive;
    this.lastStartAt = f.endTs;   // the learner's speech start on the audio clock (a cancel's from-speech time)
    this.text({ type: "speech_started", utterance_no: this.no });
    this.n.utterances++;
    this.lastVoicedEnd = null;
    for (const r of this.ring) this.audio(r, true);
    this.ring = [];
    this.speaking = true;
    this.audio(f, false);
    if (this.playbackActive) this.tell("playback", { t: "duck", on: true });
    this.tell("main", { ev: "utterance_start", no: this.no });
    this.updateGate();
  }

  candidateEnd() {
    const us = Math.round((this.lastVoicedEnd ?? 0) * 1e6);
    this.text({ type: "speech_candidate_ended", utterance_no: this.no, last_voiced_audio_ts_us: us });
    this.tell("main", { ev: "utterance_end", no: this.no, t0Us: us, how: "candidate" });
    this.speaking = false; this.no++;
    this.updateGate();
  }

  // Hold to talk: the learner's press and release are the endpoints; the VAD only annotates the frames.
  press() { if (this.mode === "hold" && this.ready) this.held = true; }
  holdFrame(f) {
    if (this.held && !this.speaking) this.begin(f);
    else if (this.speaking) this.audio(f, false);
    else this.keep(f);
  }
  release() {
    if (!this.held) return;
    this.held = false;
    if (!this.speaking) return;
    const us = Math.round((this.lastVoicedEnd ?? this.lastEnd ?? 0) * 1e6);
    this.text({ type: "end_signal", utterance_no: this.no, last_voiced_audio_ts_us: us });
    this.tell("main", { ev: "utterance_end", no: this.no, t0Us: us, how: "end_signal" });
    this.speaking = false; this.no++;
  }

  audio(f, preroll) {
    this.lastEnd = f.endTs;
    if (f.voiced) this.lastVoicedEnd = f.endTs;
    const buffered = this.buffered();
    this.n.peakBuffered = Math.max(this.n.peakBuffered, buffered);
    if (buffered > this.cfg.maxBufferedBytes) {            // the socket is backed up: lose this frame, say so on the next
      this.n.dropped++; this.dropGap = true;
      return;
    }
    const gap = f.gap || this.dropGap;                     // the capture thread's own discontinuity, or a frame dropped here
    if (gap) this.n.gapsFlagged++;
    this.binary(encodeUplink({
      seq: this.seq++, audioTsUs: Math.max(0, (f.endTs - FRAME_S) * 1e6), pcm: f.pcm, voiced: f.voiced, preroll, gap,
      speechProb: f.prob,
    }));
    this.dropGap = false;
    this.n.sent++; if (preroll) this.n.preroll++;
  }
}
