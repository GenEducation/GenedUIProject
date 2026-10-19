// The browser audio frontend of voice_wire_v1 (Phase 3), as one object a page drives. DOM-free: a page gives it the socket URL
// and the `init` fields, and draws what it reports.
//
//   microphone -> [optional denoise node] -> capture worklet --MessagePort--> session worker --WebSocket--> server
//   server --WebSocket--> session worker --MessagePort--> playback worklet --> speaker
//
// The main thread builds the graph, watches the microphone's health and gives the worker the output latency; it is on no
// audio path, so nothing it is busy with can delay a frame, a clock answer or a playback report.

import { acquireMic, MicError, MicHealth } from "./mic.js";
import { PROTOCOL } from "./wire.js";

const HERE = new URL("./", import.meta.url);

export class VoicePipeline {
  /**
   * @param {object} o
   * @param {string} o.url         the WebSocket URL
   * @param {string[]} [o.protocols]  WebSocket subprotocols (the product gateway reads the account token from them)
   * @param {object} o.init        the `init` fields other than protocol and vad (language, instance ids, device)
   * @param {"never"|"allow"} [o.interrupt]  "never": half duplex, the tutor is not interrupted by its own echo; "allow": headphones
   * @param {(ctx: AudioContext, source: AudioNode) => Promise<AudioNode>} [o.denoise]  optional hook between the microphone and capture
   * @param {MediaStream} [o.stream]  a stream to use instead of the microphone (a test)
   * @param {{aec?: boolean, ns?: boolean, agc?: boolean}} [o.processing]  the browser's own processing to request
   * @param {(e: object) => void} o.onEvent
   */
  constructor(o) { this.o = o; this.ctx = null; this.worker = null; this.health = null; this.timers = []; this.settings = {}; }

  async start() {
    const { o } = this;
    const ctx = (this.ctx = new AudioContext({ latencyHint: "interactive" }));
    await ctx.resume();
    await Promise.all(["capture-worklet.js", "playback-worklet.js"].map((f) => ctx.audioWorklet.addModule(new URL(f, HERE))));

    let stream = o.stream, track = null;
    if (!stream) {
      const mic = await acquireMic(undefined, o.processing);
      ({ stream, track } = mic); this.settings = mic.settings;
    }
    this.track = track;
    const source = ctx.createMediaStreamSource(stream);
    const tail = o.denoise ? await o.denoise(ctx, source) : source;

    const capture = new AudioWorkletNode(ctx, "capture", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    const playback = new AudioWorkletNode(ctx, "playback", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
    const hello = new Promise((resolve) => {
      capture.port.onmessage = (e) => {
        if (e.data.t === "hello") resolve(e.data);
        else if (e.data.t === "stats") { this.health.stats(e.data); o.onEvent({ ...e.data, t: "capture" }); }
      };
    });
    playback.port.onmessage = (e) => e.data.t === "stats" && o.onEvent({ ...e.data, t: "playback_stats" });
    tail.connect(capture);
    const silent = ctx.createGain(); silent.gain.value = 0;            // keeps the capture node pulled without sounding
    capture.connect(silent).connect(ctx.destination);
    playback.connect(ctx.destination);
    const { vad, inRate } = await hello;

    this.health = new MicHealth({ emit: (e) => this.diag(e.event, e.detail, true), settings: this.settings, inRate });
    this.watch(ctx, track);

    const cw = new MessageChannel(), pw = new MessageChannel();
    capture.port.postMessage({ t: "sink" }, [cw.port2]);
    playback.port.postMessage({ t: "link" }, [pw.port2]);
    this.worker = new Worker(new URL("session-worker.js", HERE), { type: "module" });
    this.worker.onmessage = (e) => o.onEvent(e.data);
    this.worker.onerror = (e) => o.onEvent({ t: "status", state: "worker_error", message: e.message });
    this.sendLatency();
    this.worker.postMessage(
      { t: "open", url: o.url, protocols: o.protocols, init: { type: "init", protocol: PROTOCOL, vad, ...o.init }, cfg: { interrupt: o.interrupt ?? "never" }, capturePort: cw.port1, playbackPort: pw.port1 },
      [cw.port1, pw.port1],
    );
    return { ...this.settings, inRate, outputLatencyMs: this.latencyMs() };
  }

  latencyMs() { return ((this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0)) * 1000; }
  sendLatency() { this.worker?.postMessage({ t: "latency", ms: this.latencyMs() }); }
  diag(event, detail, report = false) {
    this.worker?.postMessage({ t: "diag", event, detail });
    if (report) this.o.onEvent({ t: "mic", event, detail });
  }

  watch(ctx, track) {
    const every = (ms, fn) => this.timers.push(setInterval(fn, ms));
    every(500, () => this.health.tick(ctx.state));
    every(2000, () => this.sendLatency());
    every(5000, () => { const s = this.health.snapshot(); if (s) this.diag("mic_health", s); });
    for (const kind of ["mute", "unmute", "ended"]) track?.addEventListener(kind, () => this.health.track(kind));
    navigator.mediaDevices?.addEventListener?.("devicechange", () => this.health.deviceChanged());
    document.addEventListener("visibilitychange", () => this.diag("visibility", { hidden: +document.hidden }));
  }

  setMode(mode) { this.worker?.postMessage({ t: "mode", mode }); }
  setInterrupt(mode) { this.worker?.postMessage({ t: "interrupt", mode }); }
  press() { this.worker?.postMessage({ t: "press" }); }
  release() { this.worker?.postMessage({ t: "release" }); }

  async close() {
    this.timers.forEach(clearInterval);
    this.worker?.postMessage({ t: "close" });
    setTimeout(() => this.worker?.terminate(), 300);
    this.track?.stop();
    await this.ctx?.close();
  }
}

export { MicError };
