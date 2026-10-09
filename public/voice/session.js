// The session core: owns the WebSocket (ADR 0014 decision 1, one socket per session) and everything on the audio path that must not
// wait for the page. Capture frames arrive straight from the audio thread over a MessagePort, leave over the socket through `Uplink`,
// and the server's audio goes straight to the playback worklet; the main thread only receives events to draw. A page that is busy,
// hidden or garbage-collecting cannot delay a frame, a clock answer or a playback report.
//
//   audio thread (capture) --frames--> Session --binary/JSON--> socket
//   socket --audio--> Session --chunks--> audio thread (playback) --events--> Session --playback_*--> socket
//   Session --{t: "server" | "ui" | "status"}--> main thread
//
// Environment-free (the socket class, the clock and the way to reach the main thread are arguments) so the same code runs in the
// worker (`session-worker.js`) and, against the real server, in the Node tests.

import { Uplink } from "./uplink.js";
import { ClockMap } from "./clock-map.js";
import { decodeDownlink } from "./wire.js";

// What a socket's end means for the page (ADR 0025 decision 8), one table for every code a browser can show, not only the ones the
// servers send. Anything not named is terminal: a code nobody decided on is not retried in a loop.
export const CLOSE_POLICY = {
  terminal: [1000, 1002, 1003, 1007, 1008, 4001, 4029],   // normal end; protocol error; unsupported or invalid data; policy refusal (consent, language, lesson); gateway auth failed; quota
  retry: [1001, 1005, 1006, 1012, 1013, 4000],   // going away; no status or abnormal loss (browser-only, never in a frame); reconnect now; retry later; this client's own stall close
  retryLimited: { 1011: 2 },   // internal error: at most this many attempts, then the lesson continues as text
};

/** "retry" | "retry_limited" | "terminal" */
export function closePolicy(code) {
  if (CLOSE_POLICY.retry.includes(code)) return "retry";
  if (code in CLOSE_POLICY.retryLimited) return "retry_limited";
  return "terminal";
}

export class Session {
  constructor({
    WebSocketImpl, now, toMain, random = Math.random,
    setInterval: every = (f, ms) => setInterval(f, ms), clearInterval: stop = (h) => clearInterval(h),
    setTimeout: later = (f, ms) => setTimeout(f, ms), clearTimeout: cancel = (h) => clearTimeout(h),
  }) {
    Object.assign(this, { WebSocketImpl, now, toMain, random });
    // Called detached, never as methods of this object: a browser's setInterval throws "Illegal invocation" with any other `this`.
    this.timers = { every: (f, ms) => every(f, ms), stop: (h) => stop(h), later: (f, ms) => later(f, ms), cancel: (h) => cancel(h) };
    this.retry = { base: 0.5, cap: 8, attempts: 6, windowS: 60 };   // jittered exponential backoff (ADR 0025 decision 7)
    this.attempt = 0; this.firstLossAt = null; this.reconnect = null; this.closing = false;
    this.last = null;   // the reply last started: what a reconnect tells the server it heard
    this.clock = new ClockMap();
    this.ws = null; this.uplink = null; this.capture = null; this.playback = null;
    this.outputLatencyS = 0; this.downlinkRate = 24000; this.lastRx = 0; this.heartbeat = null; this.report = null; this.opened = false;
  }

  sendText(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  sendBinary(b) { if (this.ws && this.ws.readyState === 1) this.ws.send(b); }
  renderUs(ctxTime) { return Math.round((ctxTime + this.outputLatencyS) * 1e6); }
  tell(to, msg) {
    if (to === "capture") this.capture?.postMessage(msg);
    else if (to === "playback") this.playback?.postMessage(msg);
    else this.toMain({ t: "ui", ...msg });
  }

  message(m) {
    switch (m.t) {
      case "open": this.open(m); break;
      case "mode": this.uplink?.setMode(m.mode); break;
      case "press": this.uplink?.press(); break;
      case "release": this.uplink?.release(); break;
      case "interrupt": if (this.uplink) { this.uplink.cfg.interrupt = m.mode; this.uplink.updateGate(); } break;
      case "latency": this.outputLatencyS = m.ms / 1000; break;
      case "diag":
        this.sendText({ type: "client_diagnostic", event: m.event, detail: m.detail });
        if (m.event === "device_changed" && this.uplink) { this.uplink.resetProfile(); this.tell("capture", { t: "levels", levels: [] }); }
        break;
      case "send": this.sendText(m.msg); break;
      case "close":
        this.closing = true; this.timers.cancel(this.reconnect);
        this.sendText({ type: "bye" }); this.ws?.close(1000);
        break;
    }
  }

  open(m) {
    this.m = m;
    this.uplink = new Uplink({
      text: (o) => this.sendText(o), binary: (b) => this.sendBinary(b), buffered: () => this.ws?.bufferedAmount ?? 0,
      tell: (to, msg) => this.tell(to, msg), cfg: m.cfg,
    });
    this.capture = m.capturePort; this.playback = m.playbackPort;
    this.capture.onmessage = (e) => {
      if (e.data.t !== "f") return;
      this.clock.observe(e.data.postTs, this.now());
      this.uplink.onFrame(e.data);
    };
    this.playback.onmessage = (e) => this.onPlayback(e.data);
    this.tell("playback", { t: "config", cfg: m.playback ?? {} });
    this.connect();
  }

  // The resume block of a reconnect: what was last played of the reply the client left (ADR 0025 decision 1). A hint, never a credential.
  resumeHint() {
    const l = this.last;
    return l && l.turnId ? { turn_id: l.turnId, response_no: l.responseNo, heard_seq: l.heardSeq, rendered_samples: l.rendered } : undefined;
  }

  connect() {
    const m = this.m;
    // Subprotocols carry the account token (the gateway reads it from `Sec-WebSocket-Protocol`, never from a URL that a log would keep).
    const ws = (this.ws = m.protocols ? new this.WebSocketImpl(m.url, m.protocols) : new this.WebSocketImpl(m.url));
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      this.opened = true; this.lastRx = this.now();
      const resume = this.attempt > 0 ? this.resumeHint() : undefined;
      this.sendText({ ...m.init, ...(resume ? { resume } : {}), output_latency_ms: this.outputLatencyS * 1000 });
      this.toMain({ t: "status", state: "open" });
      this.heartbeat = this.timers.every(() => this.beat(), 5000);
      this.report = this.timers.every(() => this.uplinkStats(), 5000);
    };
    ws.onmessage = (e) => { this.lastRx = this.now(); typeof e.data === "string" ? this.onServer(JSON.parse(e.data)) : this.onAudio(e.data); };
    ws.onerror = () => this.toMain({ t: "status", state: "error" });
    ws.onclose = (e) => {
      this.timers.stop(this.heartbeat); this.timers.stop(this.report);
      this.uplink.setReady(false);
      this.toMain({ t: "status", state: "closed", code: e.code, opened: this.opened });
      if (!this.closing) this.lost(e.code);
    };
  }

  // The socket ended. What the page should do depends on the code (ADR 0025 decision 8) and on how long it has been trying (decision 7).
  lost(code) {
    const policy = closePolicy(code);
    const attempts = policy === "retry_limited" ? Math.min(this.retry.attempts, CLOSE_POLICY.retryLimited[code]) : this.retry.attempts;
    if (policy === "terminal" || this.attempt >= attempts) { this.toMain({ t: "status", state: "gave_up", code }); return; }
    const t = this.now();
    this.firstLossAt ??= t;
    if (t - this.firstLossAt > this.retry.windowS) { this.toMain({ t: "status", state: "gave_up", code }); return; }
    this.tell("playback", { t: "stop" });   // the child has moved on: the unheard remainder of the reply is dropped, not played on
    const base = code === 1013 ? this.retry.base * 4 : this.retry.base;   // 1013: the server is full, retry later
    const delay = Math.min(this.retry.cap, base * 2 ** this.attempt) * (0.5 + this.random() * 0.5);
    this.attempt++;
    this.toMain({ t: "status", state: "reconnecting", attempt: this.attempt, inMs: Math.round(delay * 1000) });
    this.reconnect = this.timers.later(() => this.connect(), delay * 1000);
  }

  beat() {
    this.sendText({ type: "ping" });
    if (this.now() - this.lastRx > 15) { this.toMain({ t: "status", state: "stalled" }); this.ws.close(4000, "no traffic"); }
  }

  uplinkStats() {
    const n = this.uplink.n;
    this.sendText({ type: "client_diagnostic", event: "uplink", detail: {
      sent: n.sent, dropped: n.dropped, preroll: n.preroll, gaps_flagged: n.gapsFlagged, utterances: n.utterances, peak_buffered: n.peakBuffered,
    } });
  }

  onServer(msg) {
    switch (msg.type) {
      case "ready":
        this.downlinkRate = msg.downlink_rate; this.uplink.setReady(true);
        if (this.attempt > 0) this.toMain({ t: "status", state: "reconnected", resumed: msg.resumed ?? null });
        this.attempt = 0; this.firstLossAt = null;
        break;
      case "clock_ping": {
        const now = this.clock.audioNow(this.now());
        if (now !== null) this.sendText({ type: "clock_pong", ping_id: msg.ping_id, client_us: Math.round(now * 1e6) });
        return;
      }
      case "pong": return;
      case "transcript":
        // A final with words is an accepted learner turn (the server drops one without): the uplink decides whether its level teaches the VAD.
        if (msg.kind === "final") {
          const levels = this.uplink.accepted(msg.utterance_no, (msg.text ?? "").trim().split(/\s+/).filter(Boolean).length);
          if (levels) this.tell("capture", { t: "levels", levels });
        }
        break;
      case "response_started":
        this.last = { turnId: msg.turn_id, responseNo: msg.response_no, heardSeq: 0, rendered: 0 };
        this.tell("playback", { t: "begin", responseNo: msg.response_no, rate: this.downlinkRate });
        break;
      case "response_ended": this.tell("playback", { t: "end", responseNo: msg.response_no }); break;
      case "cancel":
        // When the cancel reached the client, on the audio clock: with the worklet's silence time, the device's cancel-to-silence.
        this.cancelRx = { responseNo: msg.response_no, at: this.clock.audioNow(this.now()), speechAt: this.uplink.lastStartAt };
        this.tell("playback", { t: "stop" });
        break;
      case "state":
        if (msg.state === "playout_paused") this.tell("playback", { t: "duck", on: true });
        if (msg.state === "playout_resumed") this.tell("playback", { t: "duck", on: false });
        break;
    }
    this.toMain({ t: "server", msg });
  }

  onAudio(buffer) {
    const c = decodeDownlink(buffer);
    this.playback.postMessage({ t: "chunk", responseNo: c.responseNo, segmentSeq: c.segmentSeq, chunk: c.chunk, final: c.final, pcm: c.pcm }, [c.pcm.buffer]);
  }

  // The playback position the server's look-ahead and heard-state run on (ADR 0024 decision 1), in samples at the downlink rate.
  progress(e, extra = {}) {
    if (this.last && this.last.responseNo === e.responseNo) {
      this.last.rendered = Math.max(this.last.rendered, e.renderedSamples ?? 0);
      if (extra.segment_done && e.segmentSeq >= 0) this.last.heardSeq = Math.max(this.last.heardSeq, e.segmentSeq);
    }
    if (e.segmentSeq === undefined || e.segmentSeq < 0) { if (!extra.stopped) return; }
    const m = { type: "playback_progress", response_no: e.responseNo, rendered_samples: e.renderedSamples, ...extra };
    if (e.segmentSeq >= 0) { m.segment_seq = e.segmentSeq; m.offset_samples = e.offsetSamples; }
    this.sendText(m);
  }

  // A cancel as the listener hears it (Phase 13), on one clock: from the cancel's arrival, and from the learner's speech start, to the
  // moment the speaker went silent (the worklet's silence time plus the output latency); and the stale audio rendered after the stop.
  cancelHeard(e) {
    const c = this.cancelRx;
    this.cancelRx = null;
    if (!c || e.silentCtx === undefined || (c.responseNo !== undefined && c.responseNo !== e.responseNo)) return;
    const ear = e.silentCtx + this.outputLatencyS, ms = (x) => Math.round(x * 1000);
    const detail = { response_no: e.responseNo, stale_ms: e.stopCtx === undefined ? 0 : ms(e.silentCtx - e.stopCtx) };
    if (c.at !== null && c.at !== undefined) detail.to_silence_ms = ms(ear - c.at);
    if (c.speechAt !== undefined && c.speechAt !== null && ear - c.speechAt < 10) detail.from_speech_ms = ms(ear - c.speechAt);
    this.sendText({ type: "client_diagnostic", event: "cancel_heard", detail });
  }

  // What the audio thread says it rendered (its clock is the capture clock, so t0 -> t1 is one subtraction).
  onPlayback(e) {
    const ui = (m) => this.toMain({ t: "ui", ...m });
    switch (e.t) {
      case "speaking": this.uplink.setPlaybackActive(e.on); ui({ ev: "speaking", on: e.on }); break;
      case "started":
        this.sendText({ type: "playback_state", response_no: e.responseNo, state: "started", render_time_us: this.renderUs(e.ctxTime) });
        ui({ ev: "first_sample", responseNo: e.responseNo, renderUs: this.renderUs(e.ctxTime) });
        break;
      case "segment_started":
        this.sendText({ type: "playback_progress", response_no: e.responseNo, caption_seq: e.segmentSeq });
        ui({ ev: "segment_started", responseNo: e.responseNo, segmentSeq: e.segmentSeq });
        break;
      case "segment_ended":
        this.progress(e, { segment_done: true });
        ui({ ev: "segment_ended", responseNo: e.responseNo, segmentSeq: e.segmentSeq });
        break;
      case "progress": this.progress(e); break;
      case "underrun":
        this.sendText({ type: "playback_state", response_no: e.responseNo, state: "underrun" });
        ui({ ev: "underrun" });
        break;
      case "underrun_end":
        this.sendText({ type: "client_diagnostic", event: "underrun", detail: { response_no: e.responseNo, ms: Math.round(e.ms) } });
        break;
      case "drained":
        this.sendText({ type: "playback_state", response_no: e.responseNo, state: "ended", ...(e.played ? { render_time_us: this.renderUs(e.ctxTime) } : {}) });
        ui({ ev: "drained", responseNo: e.responseNo });
        break;
      case "stopped":
        this.progress(e, { stopped: true });   // the acknowledgement of a cancel, with the last position: the server's heard-state
        this.cancelHeard(e);
        ui({ ev: "stopped", responseNo: e.responseNo });
        break;
    }
  }
}
