import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openTeacherTurnStream, resumeTeacherTurnStream, TurnRejected } from "../teacherTurnStream";
import type { TeacherTurnStreamFrame, TurnRequest } from "../../types/lesson";

const FIXTURES_DIR = join(__dirname, "../../__tests__/fixtures");

function sseResponse(text: string, ok = true, status = 200): Response {
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Response(ok ? stream : null, { status });
}

function waitForFrames(count: number, frames: TeacherTurnStreamFrame[]): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (frames.length >= count) resolve();
      else setTimeout(check, 5);
    };
    check();
  });
}

describe("teacherTurnStream", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("gened_auth_token", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
  });

  it("streams every frame from an admitted turn, in order, and stops at the terminal frame", async () => {
    const text = readFileSync(join(FIXTURES_DIR, "completed_turn.sse"), "utf-8");
    fetchMock.mockResolvedValueOnce(sseResponse(text));

    const frames: TeacherTurnStreamFrame[] = [];
    const turnRequest: TurnRequest = {
      turn_id: "00000000-0000-0000-0000-0000000000a1",
      kind: "learner_message",
      instance_node_id: "00000000-0000-0000-0000-0000000000b1",
      text: "why?",
      latency_ms: 1000,
    };
    openTeacherTurnStream("inst-1", turnRequest, { onFrame: (f) => frames.push(f) });

    await waitForFrames(5, frames);

    expect(frames.map((f) => f.type)).toEqual([
      "turn_started",
      "answer_recorded",
      "text_delta",
      "text_delta",
      "turn_completed",
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:0/test-api/v1/instances/inst-1/teacher-turns");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(turnRequest);
    expect(init.headers.Authorization).toBe("Bearer test-token");
  });

  it("skips a keepalive frame without treating it as a sequenced event", async () => {
    // keepalive (no seq) then turn_failed(seq 2) directly after turn_started(seq 1):
    // no gap, since keepalives carry no seq to compare against.
    const text = readFileSync(join(FIXTURES_DIR, "keepalive_then_failure.sse"), "utf-8");
    fetchMock.mockResolvedValueOnce(sseResponse(text));

    const frames: TeacherTurnStreamFrame[] = [];
    openTeacherTurnStream(
      "inst-1",
      { turn_id: "a1", kind: "opening", instance_node_id: "b1" },
      { onFrame: (f) => frames.push(f) },
    );

    await waitForFrames(2, frames);
    expect(frames.map((f) => f.type)).toEqual(["turn_started", "turn_failed"]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no resume triggered
  });

  it("on a sequence gap, resumes from the last accepted seq via the GET events endpoint", async () => {
    // seq 1 then seq 3 (2 missing) — a protocol error per the client rules.
    const firstText = [
      "retry: 1000",
      "",
      'id: t1:1',
      "event: turn_started",
      'data: {"v":2,"type":"turn_started","turn_id":"t1","seq":1,"kind":"opening","instance_node_id":"b1","session_id":null,"instance_revision":1,"protocol":"teacher_turn_stream_v2","regenerates":null}',
      "",
      'id: t1:3',
      "event: text_delta",
      'data: {"v":2,"type":"text_delta","turn_id":"t1","seq":3,"text":"oops","redacted":false,"suppressed":false}',
      "",
      "",
    ].join("\n");

    const resumeText = [
      "retry: 1000",
      "",
      'id: t1:2',
      "event: text_delta",
      'data: {"v":2,"type":"text_delta","turn_id":"t1","seq":2,"text":"Hi.","redacted":false,"suppressed":false}',
      "",
      'id: t1:3',
      "event: turn_completed",
      'data: {"v":2,"type":"turn_completed","turn_id":"t1","seq":3,"status":"completed","finish_reason":"stop","first_token_ms":null,"duration_ms":null}',
      "",
      "",
    ].join("\n");

    fetchMock.mockResolvedValueOnce(sseResponse(firstText)).mockResolvedValueOnce(sseResponse(resumeText));

    const frames: TeacherTurnStreamFrame[] = [];
    let reconnected = false;
    openTeacherTurnStream(
      "inst-1",
      { turn_id: "t1", kind: "opening", instance_node_id: "b1" },
      { onFrame: (f) => frames.push(f), onReconnecting: () => (reconnected = true) },
    );

    await waitForFrames(3, frames);

    expect(reconnected).toBe(true);
    expect(frames.map((f) => (f as { seq?: number }).seq)).toEqual([1, 2, 3]);
    expect(frames.map((f) => f.type)).toEqual(["turn_started", "text_delta", "turn_completed"]);

    const [resumeUrl, resumeInit] = fetchMock.mock.calls[1];
    expect(String(resumeUrl)).toBe("http://localhost:0/test-api/v1/instances/inst-1/teacher-turns/t1/events?after_seq=1");
    expect(resumeInit.headers["Last-Event-ID"]).toBe("t1:1");
  });

  it("reports a rejected admission at once, with its error code, and never tries to resume it", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error_code: "stale_node", message: "The lesson moved on." }), { status: 409 }),
    );

    let error: unknown;
    openTeacherTurnStream(
      "inst-1",
      { turn_id: "t1", kind: "learner_message", instance_node_id: "b1", text: "hi", latency_ms: 0 },
      { onFrame: () => {}, onGiveUp: (e) => (error = e) },
    );

    await vi.waitFor(() => expect(error).toBeInstanceOf(TurnRejected));
    expect(error).toMatchObject({ status: 409, error_code: "stale_node", message: "The lesson moved on." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up and calls onGiveUp after exhausting the resume budget on a connection that never opens", async () => {
    fetchMock.mockResolvedValue(sseResponse("", false, 503));

    let gaveUp = false;
    let lastError: unknown;
    resumeTeacherTurnStream("inst-1", "t1", 0, {
      onFrame: () => {},
      onGiveUp: (err) => {
        gaveUp = true;
        lastError = err;
      },
    });

    await vi.waitFor(() => expect(gaveUp).toBe(true), { timeout: 10000, interval: 20 });
    expect(lastError).toBeInstanceOf(Error);
    // 1 initial attempt + 5 resumes = 6 calls
    expect(fetchMock.mock.calls.length).toBe(6);
  }, 15000);
});
