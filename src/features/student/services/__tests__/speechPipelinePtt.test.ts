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

const service = speechPipelineService as any;

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
    const events: any[] = [];
    service.onEvent = (e: any) => events.push(e);

    service._onPlaybackMessage({ type: "overflow", droppedChunks: 3, bufferedMs: 30000 });

    expect(events.some((e) => e.type === "error")).toBe(true);
  });
});
