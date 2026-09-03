/**
 * Wire-contract tests for push-to-talk and candidate endpointing.
 *
 * Only the singleton instance is exported, so these drive it directly with a fake socket
 * rather than standing up getUserMedia and two AudioContexts. What is being asserted is
 * the message contract with core_service/voice/pipeline/connection.py -- which frames go
 * out, in which order -- and that does not need a real audio graph.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { speechPipelineService } from "@/features/student/services/speechPipelineService";

/**
 * The internals these tests drive. Only the singleton instance is exported, so the
 * alternative to naming these is standing up getUserMedia and two AudioContexts to assert
 * on a wire contract that needs neither.
 */
interface ServiceInternals {
  ws: { readyState: number; send: (payload: string | ArrayBuffer) => void; close: () => void } | null;
  state: string;
  muted: boolean;
  pushToTalk: boolean;
  speechOnsetAt: number | null;
  pendingPreroll: ArrayBuffer | null;
  pendingFrames: ArrayBuffer[];
  activeUtteranceId: number | null;
  lastPlayedUntilMs: number;
  lastBufferReportAt: number;
  clockOffsetMs: number | null;
  clockRttMs: number | null;
  scheduledVisuals: unknown[];
  awaitingPreroll: boolean;
  micNode: unknown;
  _handleCaptureFrame(pcm: ArrayBuffer): void;
  playbackNode: unknown;
  onEvent: ((event: Record<string, unknown>) => void) | null;
  startPushToTalk(): void;
  stopPushToTalk(): void;
  toServerMs(localMs: number): number | null;
  _onMicMessage(msg: Record<string, unknown>): void;
  _onControlFrame(payload: Record<string, unknown>): void;
  _onPlaybackMessage(msg: Record<string, unknown>): void;
  _stopClockSync(): void;
}

const service = speechPipelineService as unknown as ServiceInternals;

interface Sent {
  json: Record<string, unknown>[];
  binary: ArrayBuffer[];
}

function attachFakeSocket(): Sent {
  const sent: Sent = { json: [], binary: [] };
  service.ws = {
    readyState: 1, // WebSocket.OPEN
    send: (payload: string | ArrayBuffer) => {
      if (typeof payload === "string") sent.json.push(JSON.parse(payload));
      else sent.binary.push(payload);
    },
    close: () => {},
  };
  return sent;
}

function reset() {
  service.state = "idle";
  service.muted = false;
  service.pushToTalk = false;
  service.speechOnsetAt = null;
  service.pendingPreroll = null;
  service.pendingFrames = [];
  service.activeUtteranceId = null;
  service.onEvent = null;
  service.playbackNode = null;
  service.lastBufferReportAt = 0;
}

describe("push to talk on the cascade", () => {
  beforeEach(reset);

  it("opens the turn on press without waiting for the VAD to confirm an onset", () => {
    /* setMuted(false) only stopped DISCARDING frames -- the worklet still had to confirm
     * MIN_SPEECH_MS of voice before anything opened a turn, so holding the button and
     * speaking immediately lost the first 250ms, and a quiet start lost the word. */
    const sent = attachFakeSocket();

    service.startPushToTalk();

    expect(sent.json[0].type).toBe("ptt_press");
    expect(service.state).toBe("listening");
  });

  it("flushes preroll and buffered frames on press, in order", () => {
    /* The child starts talking as they press, not after the button animates. */
    const sent = attachFakeSocket();
    service.pendingPreroll = new Int16Array([1]).buffer;
    service.pendingFrames = [new Int16Array([2]).buffer, new Int16Array([3]).buffer];

    service.startPushToTalk();

    expect(sent.binary).toHaveLength(3);
    expect(service.pendingFrames).toEqual([]);
    expect(service.pendingPreroll).toBeNull();
  });

  it("forwards every captured frame while held, bypassing onset detection", () => {
    const sent = attachFakeSocket();
    service.startPushToTalk();
    const before = sent.binary.length;

    service._onMicMessage({ type: "frame", pcm: new Int16Array([9]).buffer });

    expect(sent.binary.length).toBe(before + 1);
  });

  it("ignores the worklet's own speech_end while the button is held", () => {
    /* The button owns the turn boundary in forced-listening mode; 700ms of silence
     * mid-thought must not end a turn the child is still holding open. */
    const sent = attachFakeSocket();
    service.startPushToTalk();

    service._onMicMessage({ type: "speech_end" });

    expect(sent.json.some((m) => m.type === "end_of_speech")).toBe(false);
  });

  it("releases exactly once however many times the release fires", () => {
    /* Release, cancel, blur, pointer-leave and disconnect can all arrive together. */
    const sent = attachFakeSocket();
    service.startPushToTalk();

    service.stopPushToTalk();
    service.stopPushToTalk();
    service.stopPushToTalk();

    expect(sent.json.filter((m) => m.type === "ptt_release")).toHaveLength(1);
  });

  it("press is idempotent under repeated or stuck pointer events", () => {
    const sent = attachFakeSocket();

    service.startPushToTalk();
    service.startPushToTalk();

    expect(sent.json.filter((m) => m.type === "ptt_press")).toHaveLength(1);
  });
});

describe("candidate endpointing", () => {
  beforeEach(reset);

  it("marks a hands-free end_of_speech as a candidate, not a verdict", () => {
    /* The local VAD only knows 700ms of silence passed, which is not the same as the
     * child having finished: they pause mid-sentence, and low-energy terminal phonemes
     * fall under the threshold while the word is still being said. */
    const sent = attachFakeSocket();
    service.state = "listening";
    service.speechOnsetAt = 1;

    service._onMicMessage({ type: "speech_end" });

    const end = sent.json.find((m) => m.type === "end_of_speech");
    expect(end).toBeDefined();
    expect(end!.candidate).toBe(true);
  });

  it("does not send a candidate end for an onset that never opened a turn", () => {
    const sent = attachFakeSocket();
    service.state = "speaking"; // unconfirmed interruption
    service.speechOnsetAt = 1;

    service._onMicMessage({ type: "speech_end" });

    expect(sent.json.some((m) => m.type === "end_of_speech")).toBe(false);
  });
});

describe("playback backpressure reporting", () => {
  beforeEach(reset);

  it("reports buffer depth so the server can stop running ahead of playback", () => {
    const sent = attachFakeSocket();

    service._onPlaybackMessage({
      type: "position",
      playedUntilMs: 1200,
      bufferedMs: 6400,
      wantMore: false,
      saturated: true,
    });

    const report = sent.json.find((m) => m.type === "playback_buffer");
    expect(report).toMatchObject({ buffered_ms: 6400, saturated: true, want_more: false });
  });

  it("throttles reports rather than sending one per audio callback", () => {
    const sent = attachFakeSocket();

    for (let i = 0; i < 20; i++) {
      service._onPlaybackMessage({ type: "position", playedUntilMs: i, bufferedMs: 100 });
    }

    expect(sent.json.filter((m) => m.type === "playback_buffer")).toHaveLength(1);
  });

  it("surfaces an overflow instead of letting audio vanish quietly", () => {
    attachFakeSocket();
    const events: Record<string, unknown>[] = [];
    service.onEvent = (e) => events.push(e);

    service._onPlaybackMessage({ type: "overflow", droppedChunks: 3, bufferedMs: 30000 });

    expect(events.some((e) => e.type === "error")).toBe(true);
  });
});

describe("clock synchronisation", () => {
  beforeEach(() => {
    reset();
    service.clockOffsetMs = null;
    service.clockRttMs = null;
    service._stopClockSync();
  });

  it("solves a pong into skew and delay separately", () => {
    /* A client clock 50s behind the server with a healthy 100ms link must read as 50s of
     * SKEW and 100ms of DELAY. Comparing the two wall clocks directly would report a
     * 50-second latency on a perfectly good connection. */
    const sent = attachFakeSocket();
    const t0 = Date.now();
    const t3Estimate = t0; // Date.now() inside the handler; the maths below is skew-only

    service._onControlFrame({
      type: "pong",
      client_ts_ms: t0,
      server_recv_ms: t0 + 50_000 + 50,
      server_send_ms: t0 + 50_000 + 51,
    });

    expect(service.clockOffsetMs).not.toBeNull();
    expect(service.clockOffsetMs).toBeGreaterThan(49_000);
    expect(service.clockRttMs).toBeLessThan(1_000);
    expect(t3Estimate).toBeLessThanOrEqual(Date.now());

    const report = sent.json.find((m) => m.type === "clock_sync");
    expect(report).toBeDefined();
    // All four timestamps, not our conclusion -- the server filters outliers across a
    // window this client cannot see.
    expect(report).toMatchObject({ t0_client_ms: t0 });
    expect(report!.t3_client_ms).toBeDefined();
  });

  it("prefers the server's filtered estimate over its own single sample", () => {
    attachFakeSocket();
    service.clockOffsetMs = 999;

    service._onControlFrame({
      type: "clock_sync",
      offset_ms: 4242,
      rtt_ms: 80,
      synchronised: true,
    });

    expect(service.clockOffsetMs).toBe(4242);
  });

  it("ignores an unsynchronised server estimate", () => {
    attachFakeSocket();
    service.clockOffsetMs = 111;

    service._onControlFrame({ type: "clock_sync", offset_ms: 0, rtt_ms: 0, synchronised: false });

    expect(service.clockOffsetMs).toBe(111);
  });

  it("refuses to convert a timestamp while unsynchronised", () => {
    /* Returning the raw local value would be the meaningless cross-clock comparison the
     * exchange exists to prevent, and it would fail invisibly. */
    expect(service.toServerMs(1000)).toBeNull();

    service.clockOffsetMs = 250;
    expect(service.toServerMs(1000)).toBe(1250);
  });

  it("discards a pong implying a negative round trip", () => {
    attachFakeSocket();
    service.clockOffsetMs = null;
    const t0 = Date.now();

    service._onControlFrame({
      type: "pong",
      client_ts_ms: t0,
      server_recv_ms: t0,
      server_send_ms: t0 + 10_000_000,
    });

    expect(service.clockOffsetMs).toBeNull();
  });
});

describe("visual scheduling against the playback clock", () => {
  beforeEach(() => {
    reset();
    service.scheduledVisuals = [];
    service.lastPlayedUntilMs = 0;
    service.activeUtteranceId = 1;
  });

  function visualFrame(overrides: Record<string, unknown> = {}) {
    return {
      type: "visual_event",
      event_id: "v1",
      kind: "math_draw",
      utterance_id: 1,
      sequence: 1,
      play_at_ms: 2000,
      payload: { visual_id: "tri-1" },
      ...overrides,
    };
  }

  it("holds a visual until playback reaches its moment", () => {
    /* Arrival time is meaningless: the server streams seconds ahead of playback, so a
     * visual arrives long before the sentence introducing it is heard. */
    attachFakeSocket();
    const events: Record<string, unknown>[] = [];
    service.onEvent = (e) => events.push(e);

    service._onControlFrame(visualFrame());

    expect(events.filter((e) => e.type === "visual")).toHaveLength(0);
    expect(service.scheduledVisuals).toHaveLength(1);
  });

  it("emits the visual once playback passes its offset", () => {
    attachFakeSocket();
    const events: Record<string, unknown>[] = [];
    service.onEvent = (e) => events.push(e);
    service._onControlFrame(visualFrame());

    service._onPlaybackMessage({ type: "position", playedUntilMs: 2100, bufferedMs: 0 });

    const visual = events.find((e) => e.type === "visual");
    expect(visual).toMatchObject({ kind: "math_draw", eventId: "v1" });
    expect(service.scheduledVisuals).toHaveLength(0);
  });

  it("acknowledges only once the renderer has been handed the event", () => {
    /* So "applied" on the server means the child saw it, not that a frame was delivered. */
    const sent = attachFakeSocket();
    service.onEvent = () => {};
    service._onControlFrame(visualFrame({ play_at_ms: 0 }));
    service._onPlaybackMessage({ type: "position", playedUntilMs: 10, bufferedMs: 0 });

    expect(sent.json.find((m) => m.type === "visual_ack")).toMatchObject({ event_id: "v1" });
  });

  it("applies events in server sequence, not arrival order", () => {
    /* Applying a pointer before the figure it points at is exactly what arrival order
     * would produce. */
    attachFakeSocket();
    const events: Record<string, unknown>[] = [];
    service.onEvent = (e) => events.push(e);

    service._onControlFrame(visualFrame({ event_id: "v2", sequence: 2, play_at_ms: 0 }));
    service._onControlFrame(visualFrame({ event_id: "v1", sequence: 1, play_at_ms: 0 }));
    service._onPlaybackMessage({ type: "position", playedUntilMs: 10, bufferedMs: 0 });

    expect(events.filter((e) => e.type === "visual").map((e) => e.eventId)).toEqual(["v1", "v2"]);
  });

  it("applies a late visual immediately rather than dropping it", () => {
    /* The server cancels genuinely stale ones explicitly; a visual for a finished
     * utterance is late, and the figure just described should still appear. */
    attachFakeSocket();
    const events: Record<string, unknown>[] = [];
    service.onEvent = (e) => events.push(e);

    service._onControlFrame(visualFrame({ utterance_id: 99, play_at_ms: 999999 }));
    service._onPlaybackMessage({ type: "position", playedUntilMs: 0, bufferedMs: 0 });

    expect(events.filter((e) => e.type === "visual")).toHaveLength(1);
  });

  it("drops cancelled visuals without emitting them", () => {
    attachFakeSocket();
    const events: Record<string, unknown>[] = [];
    service.onEvent = (e) => events.push(e);
    service._onControlFrame(visualFrame());

    service._onControlFrame({ type: "visual_cancel", utterance_id: 1, event_ids: ["v1"] });
    service._onPlaybackMessage({ type: "position", playedUntilMs: 9999, bufferedMs: 0 });

    expect(events.filter((e) => e.type === "visual")).toHaveLength(0);
  });
});

describe("preroll ordering on a confirmed onset", () => {
  beforeEach(() => {
    reset();
    service.awaitingPreroll = false;
    service.micNode = { port: { postMessage: () => {} } };
  });

  function onsetFrame(): ArrayBuffer {
    return new Int16Array([1, 2, 3]).buffer;
  }

  /** _sendBinary wraps each payload in a 12-byte uplink header, so the frames recorded by
   * the fake socket are not the buffers that went in. Compare payloads, not identity. */
  function payloads(sent: Sent): number[][] {
    return sent.binary.map((frame) => Array.from(new Int16Array(frame.slice(12))));
  }

  it("holds live frames until the preroll arrives, then sends preroll first", () => {
    /* Asking the worklet for the preroll is a postMessage round trip, so the reply lands
     * a tick later -- by which point the turn is open and a live frame would already have
     * gone out AHEAD of the audio that precedes it. The uplink read
     * [live][preroll][live...], splicing the start of the utterance in after a later
     * chunk.
     *
     * Live, 3 Sep 2026: "I believe it will be ₹400" came back as "believe it will be
     * ₹400", and "four hundred" as "hundred" -- persisted and shown to the child as ₹100
     * on a turn where ₹400 was the correct answer. A dropped leading syllable does not
     * read as damage; it reads as a different, plausible answer. */
    const sent = attachFakeSocket();
    service.state = "listening";
    service.awaitingPreroll = true;

    service._handleCaptureFrame(onsetFrame());
    expect(sent.binary).toHaveLength(0);

    const preroll = new Int16Array([9, 9]).buffer;
    service._onMicMessage({ type: "preroll", preroll });

    expect(payloads(sent)).toEqual([
      [9, 9], // the preroll -- the audio that PRECEDES the onset, sent first
      [1, 2, 3], // then the frame captured while waiting for it
    ]);
    expect(service.awaitingPreroll).toBe(false);
  });

  it("preserves capture order across several held frames", () => {
    const sent = attachFakeSocket();
    service.state = "listening";
    service.awaitingPreroll = true;
    const a = new Int16Array([1]).buffer;
    const b = new Int16Array([2]).buffer;

    service._handleCaptureFrame(a);
    service._handleCaptureFrame(b);
    const preroll = new Int16Array([0]).buffer;
    service._onMicMessage({ type: "preroll", preroll });

    expect(payloads(sent)).toEqual([[0], [1], [2]]);
  });

  it("releases held frames if the preroll never arrives", () => {
    /* Losing the preroll costs the leading few hundred milliseconds; holding every frame
     * forever would cost the whole utterance. */
    const sent = attachFakeSocket();
    service.state = "listening";
    service.awaitingPreroll = true;

    for (let i = 0; i < 200; i++) service._handleCaptureFrame(new Int16Array([i]).buffer);

    expect(service.awaitingPreroll).toBe(false);
    expect(sent.binary.length).toBeGreaterThan(0);
  });

  it("does not hold frames when no onset is pending", () => {
    const sent = attachFakeSocket();
    service.state = "listening";

    service._handleCaptureFrame(onsetFrame());

    expect(sent.binary).toHaveLength(1);
  });
});

describe("session limits are not connection errors", () => {
  beforeEach(reset);

  it("reports an exceeded budget as a session_limit, never as an error", () => {
    /* Routing it through the error path told the child "Couldn't reconnect the voice
     * session. Your transcript is safe -- try again" for a session that ended exactly as
     * designed. */
    attachFakeSocket();
    const events: Record<string, unknown>[] = [];
    service.onEvent = (e) => events.push(e);

    service._onControlFrame({
      type: "session_limit",
      kind: "silence_duration",
      severity: "exceeded",
      message: "nobody has spoken for a long time",
    });

    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(events[0]).toMatchObject({ type: "session_limit", severity: "exceeded" });
  });

  it("passes a warning through as a warning", () => {
    attachFakeSocket();
    const events: Record<string, unknown>[] = [];
    service.onEvent = (e) => events.push(e);

    service._onControlFrame({
      type: "session_limit",
      kind: "lesson_duration",
      severity: "warning",
      message: "nearly out of time",
    });

    expect(events[0]).toMatchObject({ severity: "warning" });
  });
});
