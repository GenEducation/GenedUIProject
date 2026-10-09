// Microphone acquisition and health (Phase 3). Acquisition asks the browser for echo cancellation, noise suppression and automatic
// gain on a mono track and reports what the track says it actually got: a browser that ignores the request is a finding, not a
// default (the AEC gate depends on it). `MicHealth` turns the capture worklet's counters, the track's own events and a watchdog into
// a small set of named events, each reported once when it starts and once when it ends, plus a numbers-only snapshot that goes to
// the server as a `client_diagnostic`. Nothing here ever carries audio or a device name.

export class MicError extends Error {
  constructor(kind, cause) { super(`${kind}: ${cause?.name ?? cause}`); this.kind = kind; this.cause = cause; }
}

const KINDS = { NotAllowedError: "denied", SecurityError: "denied", NotFoundError: "no_device", OverconstrainedError: "no_device", NotReadableError: "busy", AbortError: "busy" };

export async function acquireMic(devices = navigator.mediaDevices, { aec = true, ns = true, agc = true } = {}) {
  if (!devices?.getUserMedia) throw new MicError("unsupported", "no getUserMedia (an insecure page?)");
  let stream;
  try {
    stream = await devices.getUserMedia({ audio: { echoCancellation: aec, noiseSuppression: ns, autoGainControl: agc, channelCount: 1 } });
  } catch (e) {
    throw new MicError(KINDS[e?.name] ?? "failed", e);
  }
  const track = stream.getAudioTracks()[0];
  const s = track.getSettings();
  const on = (v) => v !== undefined && v !== false;
  return { stream, track, settings: { aec: on(s.echoCancellation), ns: on(s.noiseSuppression), agc: on(s.autoGainControl), channels: s.channelCount ?? 0, rate: s.sampleRate ?? 0 } };
}

export class MicHealth {
  constructor({ emit, now = () => performance.now() / 1000, settings = {}, inRate = 0 }) {
    this.emit = emit; this.now = now; this.settings = settings; this.inRate = inRate;
    this.on = new Set();                   // conditions currently reported
    this.last = null; this.lastStatsAt = now(); this.prev = null; this.said = new Map();
  }
  raise(name, detail = {}, every = 0) {   // report a condition once as it starts; one that keeps happening, at most every `every` s
    const t = this.now();
    if (this.on.has(name) && (!every || t - (this.said.get(name) ?? -Infinity) < every)) return;
    this.said.set(name, t); this.on.add(name);
    this.emit({ event: name, detail });
  }
  clear(name, detail = {}) {
    if (this.on.delete(name)) this.emit({ event: `${name}_ended`, detail });
  }
  stats(s) {
    this.last = s; this.lastStatsAt = this.now();
    this.clear("capture_stalled");
    const p = this.prev ?? { frames: 0, clipped: 0, gaps: 0, noInput: 0 };
    const frames = s.frames - p.frames;
    const clipShare = frames > 0 ? (s.clipped - p.clipped) / (frames * 320) : 0;
    if (clipShare > 0.002) this.raise("clipping", { share_ppm: Math.round(clipShare * 1e6) }, 10);
    else if (frames > 0) this.clear("clipping");
    if (s.gaps > p.gaps) this.raise("capture_gap", { gaps: s.gaps }, 5);
    else this.clear("capture_gap");
    if (s.noInput > p.noInput) this.raise("no_input", { blocks: s.noInput }, 10);
    else this.clear("no_input");
    if (s.zeroMs >= 3000 && !this.on.has("track_muted")) this.raise("mic_silent", { ms: s.zeroMs });
    else if (s.zeroMs < 200) this.clear("mic_silent");
    this.prev = { frames: s.frames, clipped: s.clipped, gaps: s.gaps, noInput: s.noInput };
  }
  track(event) {
    if (event === "mute") this.raise("track_muted");
    else if (event === "unmute") this.clear("track_muted");
    else if (event === "ended") this.raise("track_ended");
  }
  deviceChanged() { this.raise("device_changed", {}, 2); }
  tick(contextState) {
    if (contextState !== "running") this.raise("context_not_running", { suspended: contextState === "suspended" ? 1 : 0 });
    else this.clear("context_not_running");
    if (contextState === "running" && this.now() - this.lastStatsAt > 1) this.raise("capture_stalled", { ms: Math.round((this.now() - this.lastStatsAt) * 1000) });
  }
  // Numbers only: levels, counters and what the browser applied (as 0/1).
  snapshot() {
    const s = this.last;
    if (!s) return null;
    return {
      rms: Math.round(s.rms), peak: s.peak, floor_db: Math.round(s.floorDb), frames: s.frames, gaps: s.gaps, clipped: s.clipped,
      zero_ms: s.zeroMs, no_input: s.noInput, aec: +!!this.settings.aec, ns: +!!this.settings.ns, agc: +!!this.settings.agc,
      in_rate: this.inRate,
    };
  }
}
