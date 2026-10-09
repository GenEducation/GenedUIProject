// Playback of the tutor's audio, on the audio thread (Phase 3 timing, ADR 0015 decision 4, ADR 0024). Chunks of the current
// response arrive from the session worker over a MessagePort and are rendered in order; this processor is the one place that
// knows which sample is actually being rendered, so it reports exactly (on the audio clock, the same one capture is stamped
// with): when the first audible sample plays, when each segment starts and ends, an underrun and its length, and when the
// reply has fully played. A cancel fades out in 8 ms and discards everything queued; a duck lowers the level and keeps the audio.
//
// Chunks of any response other than the current one are dropped (a barge-in must leave no stale audio in the buffer).
"use strict";

const IN_RATE = 24000;       // the session's downlink rate (`ready.downlink_rate`), set by `begin`
const AUDIBLE = 300;         // the first sample louder than this (int16) is "the first audible sample"
const TAIL_S = 0.35;         // the speaker is still ringing this long after the last sample (the microphone may hear it)
const FADE_S = 0.008;
const DUCK_LEVEL = 0.15;

// Streaming Catmull-Rom interpolation from the downlink rate to the context's. Position m of the output is at input
// position m * ratio; it needs input m*ratio-1 .. +2, so the last two input samples are held back until more arrive (or a flush).
class Upsampler {
  constructor(inRate, outRate) {
    this.ratio = inRate / outRate; this.m = 0; this.base = -1; this.buf = [0];   // one sample of leading silence
  }
  push(int16, out) {
    for (let i = 0; i < int16.length; i++) this.buf.push(int16[i] / 32768);
    this.drain(out, 2);
  }
  flush(out) {
    const last = this.buf[this.buf.length - 1] || 0;
    this.buf.push(last, last);
    this.drain(out, 2);
  }
  drain(out, ahead) {
    for (;;) {
      const pos = this.m * this.ratio, n0 = Math.floor(pos);
      if (n0 + ahead - this.base >= this.buf.length) break;
      const t = pos - n0, i = n0 - this.base;
      const p0 = this.buf[i - 1] ?? 0, p1 = this.buf[i], p2 = this.buf[i + 1], p3 = this.buf[i + 2];
      out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t));
      this.m++;
    }
    const keep = Math.max(0, Math.floor(this.m * this.ratio) - 1 - this.base);
    if (keep > 0) { this.buf = this.buf.slice(keep); this.base += keep; }
  }
}

class Playback extends AudioWorkletProcessor {
  constructor() {
    super();
    this.link = null;
    this.cfg = { prebufferS: 0.04, rebufferS: 0.08 };
    this.reset(-1);
    this.gain = 1; this.target = 1; this.speaking = false; this.tailLeft = 0; this.fade = 0;
    this.stats = { underruns: 0, rendered: 0, since: 0 };
    this.port.onmessage = (e) => this.onMessage(e.data, e.ports);
    this.port.postMessage({ t: "hello", rate: sampleRate });
  }
  reset(responseNo) {
    this.responseNo = responseNo; this.q = []; this.queued = 0; this.up = null;
    this.playing = false; this.ended = false; this.started = false; this.underrunAt = null; this.drained = false;
    this.segments = new Map(); this.seg = -1; this.rendered = 0;
    this.inRate = IN_RATE; this.cur = -1; this.curOut = 0; this.sinceProgress = 0;
  }
  // Positions are reported in samples at the downlink rate (what the server sent), computed from what was rendered at the context's.
  pos(out) { return Math.round((out * this.inRate) / sampleRate); }
  report(extra = {}) {
    this.emit({ t: "progress", responseNo: this.responseNo, segmentSeq: this.cur, offsetSamples: this.pos(this.curOut), renderedSamples: this.pos(this.rendered), ...extra });
  }
  emit(m) { (this.link || this.port).postMessage(m); }
  onMessage(m, ports) {
    switch (m.t) {
      case "link": this.link = ports[0]; this.link.onmessage = (e) => this.onMessage(e.data, e.ports); break;
      case "config": Object.assign(this.cfg, m.cfg); break;
      case "begin":
        this.reset(m.responseNo); this.fade = 0; this.target = 1; this.gain = Math.min(this.gain, 1);
        this.inRate = m.rate || IN_RATE;
        this.up = new Upsampler(this.inRate, sampleRate);
        break;
      case "chunk": this.chunk(m); break;
      case "end":
        if (m.responseNo === this.responseNo && this.up) {
          const tail = [];
          this.up.flush(tail);                         // the samples the interpolator was holding back
          this.enqueue(tail, this.seg, false);
          this.ended = true;
        }
        break;
      case "duck": this.target = m.on ? DUCK_LEVEL : 1; break;
      case "stop":
        this.stopAt = currentTime;   // when the stop reached this thread: what is rendered after it is stale audio
        if (this.queued > 0 && this.playing) this.fade = Math.round(FADE_S * sampleRate); else this.discard(currentTime);
        break;
    }
  }
  chunk(m) {
    if (m.responseNo !== this.responseNo || !this.up) return;
    if (m.pcm.length === 0) {
      // The server ends every segment with an empty chunk that carries only `final` (ADR 0015 decision 4): it is the segment's end.
      if (m.final) this.enqueue([], m.segmentSeq, true);
      return;
    }
    const out = [];
    this.up.push(m.pcm, out);
    this.seg = m.segmentSeq;
    this.enqueue(out, m.segmentSeq, m.final);
  }
  enqueue(samples, seg, final) {
    if (samples.length === 0) {
      const last = this.q[this.q.length - 1];
      if (final && last && last.seg === seg) last.final = true;   // the end of the segment is the last queued piece's
      else if (final && this.cur === seg && this.started) {      // every piece of it has already been rendered: it ended just now
        this.emit({ t: "segment_ended", responseNo: this.responseNo, segmentSeq: seg, ctxTime: currentTime, offsetSamples: this.pos(this.curOut), renderedSamples: this.pos(this.rendered) });
      }
      return;
    }
    this.q.push({ seg, data: Float32Array.from(samples), at: 0, final: !!final });
    this.queued += samples.length;
  }
  discard(silentAt) {
    const had = this.responseNo, stopAt = this.stopAt;
    this.stopAt = undefined;
    this.q = []; this.queued = 0; this.fade = 0; this.playing = false; this.up = null; this.ended = false;
    // The last position of a stopped response: what the server's heard-state needs (ADR 0024 decision 1, ADR 0019 decision 4).
    // With it, when the output went silent on the audio clock and when the stop arrived (the difference is the stale audio).
    this.emit({ t: "stopped", responseNo: had, segmentSeq: this.cur, offsetSamples: this.pos(this.curOut), renderedSamples: this.pos(this.rendered), silentCtx: silentAt, stopCtx: stopAt });
  }
  process(_inputs, outputs) {
    const out = outputs[0][0], n = out.length, rate = sampleRate;
    let first = -1;
    if (!this.playing && this.responseNo >= 0 && this.up && this.q.length) {
      const need = (this.underrunAt !== null ? this.cfg.rebufferS : this.cfg.prebufferS) * rate;
      if (this.queued >= need || this.ended) this.playing = true;
    }
    for (let i = 0; i < n; i++) {
      let v = 0;
      if (this.playing && this.q.length) {
        const piece = this.q[0];
        if (piece.at === 0 && piece.data.length && !this.segments.has(piece.seg)) {
          this.segments.set(piece.seg, true);
          this.emit({ t: "segment_started", responseNo: this.responseNo, segmentSeq: piece.seg, ctxTime: currentTime + i / rate });
        }
        v = piece.data[piece.at++] ?? 0;
        this.queued--; this.rendered++;
        if (piece.seg !== this.cur) { this.cur = piece.seg; this.curOut = 0; }
        this.curOut++;
        if (!this.started && Math.abs(v * 32768) > AUDIBLE) {
          this.started = true;
          this.emit({ t: "started", responseNo: this.responseNo, segmentSeq: piece.seg, ctxTime: currentTime + i / rate });
        }
        if (piece.at >= piece.data.length) {
          this.q.shift();
          if (piece.final) this.emit({ t: "segment_ended", responseNo: this.responseNo, segmentSeq: piece.seg, ctxTime: currentTime + (i + 1) / rate, offsetSamples: this.pos(this.curOut), renderedSamples: this.pos(this.rendered) });
        }
        if (first < 0) first = i;
        this.underrunEnd(i);
      } else if (this.playing && !this.ended && this.started && this.underrunAt === null) {
        this.underrunAt = currentTime + i / rate; this.playing = false; this.stats.underruns++;
        this.emit({ t: "underrun", responseNo: this.responseNo, ctxTime: this.underrunAt });
      } else if (this.playing && this.ended && !this.drained) {
        this.drained = true; this.playing = false;
        this.emit({ t: "drained", responseNo: this.responseNo, ctxTime: currentTime + i / rate, played: this.started });
      }
      this.gain += (this.target - this.gain) * 0.001;
      if (this.fade > 0) { v *= this.fade / (FADE_S * rate); if (--this.fade === 0) { this.discard(currentTime + (i + 1) / rate); v = 0; } }
      out[i] = v * this.gain;
    }
    this.account(first >= 0, n / rate);
    if (first >= 0 && (this.sinceProgress += n) >= rate * 0.1) { this.sinceProgress = 0; this.report(); }   // about every 100 ms of rendering
    return true;
  }
  underrunEnd(i) {
    if (this.underrunAt === null) return;
    const ms = (currentTime + i / sampleRate - this.underrunAt) * 1000;
    this.emit({ t: "underrun_end", responseNo: this.responseNo, ms });
    this.underrunAt = null;
  }
  // `speaking` is true while audio is coming out and for a tail after, so the page does not listen to its own echo.
  account(rendering, dt) {
    if (rendering) { this.tailLeft = TAIL_S; if (!this.speaking) { this.speaking = true; this.emit({ t: "speaking", on: true }); } }
    else if (this.speaking && (this.tailLeft -= dt) <= 0) { this.speaking = false; this.emit({ t: "speaking", on: false }); }
    const s = this.stats;
    if (++s.since >= 24) {
      this.port.postMessage({ t: "stats", bufferedMs: (this.queued / sampleRate) * 1000, underruns: s.underruns, renderedMs: (this.rendered / sampleRate) * 1000, speaking: this.speaking, gain: this.gain });
      s.since = 0;
    }
  }
}
registerProcessor("playback", Playback);
