import { describe, it, expect, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  LESSON_ID, NODE_1, interruptRequests, lessonFixture, replyScript, resumeRequests, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../useLessonStore";
import { fromRecorded, replyText } from "../transcript";
import type { RecordedTurn } from "../types";

// H1: a reply still open on the server when the page reloads is followed to its end through `/events`, never left
// spinning and never generated again.

const store = () => useLessonStore.getState();
const turn = (id: string) => store().turns.find((t) => t.turnId === id)!;
const settled = () => waitFor(() => expect(store().turns.every((t) => t.status !== "streaming")).toBe(true));

const started = { type: "turn_started" as const, kind: "learner_message" as const, instance_node_id: NODE_1, instance_revision: 4, protocol: "teacher_turn_stream_v3" as const };
const delta = (text: string) => ({ type: "text_delta" as const, text });
const completed = { type: "turn_completed" as const, status: "completed" as const, finish_reason: "stop" as const };

const recorded = (status: string, extra: Partial<RecordedTurn> = {}): RecordedTurn => ({
  turn_id: "t-open", kind: "learner_message", status, learner_text: "SYNTHETIC question", created_at: "2026-10-26T00:00:00Z",
  figure_group_ids: [], ...extra,
});

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe("fromRecorded — an open turn", () => {
  it("is streaming, with no text and a cursor at 0, whatever seq fields the server sends", () => {
    const t = fromRecorded(recorded("open", { committed_through_seq: 7, transcript_through_seq: 5 }));
    expect(t).toMatchObject({ status: "streaming", lastSeq: 0, deltas: [] });
  });
});

describe("useLessonStore — reload during a reply (H1)", () => {
  it("resumes the open turn from seq 0 once, shows the reply once, and ends completed", async () => {
    lessonFixture.setHistory([recorded("open")]);
    lessonFixture.setLog("t-open", [started, delta("one "), delta("two"), completed]);
    await store().load(LESSON_ID);
    await settled();
    expect(resumeRequests).toEqual([{ turnId: "t-open", afterSeq: 0 }]);
    expect(turnRequests).toEqual([]); // never asked again, never a new opening
    expect(turn("t-open").status).toBe("completed");
    expect(replyText(turn("t-open"))).toBe("one two");
  });

  it("a turn the server completed before the reload is shown from history, with no resume", async () => {
    lessonFixture.setHistory([recorded("completed", { teacher_text: "SYNTHETIC done." })]);
    await store().load(LESSON_ID);
    expect(resumeRequests).toEqual([]);
    expect(turn("t-open")).toMatchObject({ status: "completed" });
    expect(replyText(turn("t-open"))).toBe("SYNTHETIC done.");
  });

  it("a resumed stream that drops is resumed again from its cursor without doubling text", async () => {
    lessonFixture.setHistory([recorded("open")]);
    lessonFixture.setLog("t-open", [started, delta("one "), delta("two"), completed]);
    lessonFixture.dropResumeAfter(2); // turn_started + "one ", then the resumed connection drops
    await store().load(LESSON_ID);
    await settled();
    expect(resumeRequests).toEqual([{ turnId: "t-open", afterSeq: 0 }, { turnId: "t-open", afterSeq: 2 }]);
    expect(turn("t-open").status).toBe("completed");
    expect(replyText(turn("t-open"))).toBe("one two");
  });

  it("a turn whose server worker was lost ends interrupted with what was committed, not spinning", async () => {
    lessonFixture.setHistory([recorded("open")]);
    lessonFixture.setLog("t-open", [
      started, delta("partial"),
      { type: "turn_interrupted" as const, cause: "server_lost" as const, transcript_through_seq: 2 },
    ]);
    await store().load(LESSON_ID);
    await settled();
    expect(turn("t-open").status).toBe("interrupted");
    expect(replyText(turn("t-open"))).toBe("partial");
  });

  it("a stream that never closes ends failed (stream_interrupted) after the capped resumes", async () => {
    lessonFixture.setHistory([recorded("open")]);
    lessonFixture.setLog("t-open", [started, delta("partial")]); // no terminal event
    await store().load(LESSON_ID);
    await settled();
    expect(resumeRequests.length).toBe(3);
    expect(turn("t-open")).toMatchObject({ status: "failed", failure: { reason: "stream_interrupted" } });
  });

  it("failed and interrupted turns in history are never resumed", async () => {
    lessonFixture.setHistory([
      recorded("failed", { turn_id: "t-f", failure_reason: "provider_error" }),
      recorded("interrupted", { turn_id: "t-i", teacher_text: "cut" }),
    ]);
    await store().load(LESSON_ID);
    expect(resumeRequests).toEqual([]);
    expect(turn("t-f").status).toBe("failed");
    expect(turn("t-i").status).toBe("interrupted");
  });

  it("Stop on a resumed turn sends one interrupt with what was seen, and the turn takes no more events", async () => {
    lessonFixture.setHistory([recorded("open")]);
    lessonFixture.setLog("t-open", [started, delta("partial")]); // stays open
    lessonFixture.holdStream(1); // the resumed stream sends turn_started, then the tutor is still talking
    await store().load(LESSON_ID);
    await waitFor(() => expect(turn("t-open").lastSeq).toBe(1));
    await store().stop();
    expect(interruptRequests).toHaveLength(1);
    expect(interruptRequests[0].turnId).toBe("t-open");
    await settled();
    expect(turn("t-open").status).toBe("interrupted");
    expect(resumeRequests).toHaveLength(1); // a stopped turn is not resumed again
  });
});

describe("useLessonStore — Stop racing with completion", () => {
  beforeEach(async () => {
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await store().load(LESSON_ID);
  });

  it("a Stop that reaches the server after the reply finished shows the whole reply as completed", async () => {
    lessonFixture.setScript(replyScript("one ", "two ", "three"));
    lessonFixture.holdStream(2); // turn_started + "one ", then the client stops before the rest arrives
    lessonFixture.interruptReports("completed"); // ...but the server had already completed it
    const sending = store().send("SYNTHETIC question");
    await waitFor(() => expect(replyText(store().turns.at(-1)!)).toBe("one "));
    const id = store().turns.at(-1)!.turnId;
    await store().stop();
    await sending;
    expect(interruptRequests).toHaveLength(1);
    expect(turn(id).status).toBe("completed");
    expect(replyText(turn(id))).toBe("one two three");
    expect(turnRequests).toHaveLength(1); // read back from the log, never generated again
  });

  it("a Stop that wins the race ends the turn interrupted at what the learner saw", async () => {
    lessonFixture.setScript(replyScript("one ", "two ", "three"));
    lessonFixture.holdStream(2);
    const sending = store().send("SYNTHETIC question");
    await waitFor(() => expect(replyText(store().turns.at(-1)!)).toBe("one "));
    const id = store().turns.at(-1)!.turnId;
    await store().stop();
    await sending;
    expect(turn(id).status).toBe("interrupted");
    expect(replyText(turn(id))).toBe("one ");
    expect(resumeRequests).toEqual([]);
  });

  it("a newer message sent while the Stop is in flight is never cut by reading back the older reply", async () => {
    lessonFixture.setScript(replyScript("one ", "two ", "three"));
    lessonFixture.holdStream(2);
    lessonFixture.interruptReports("completed");
    const sending = store().send("SYNTHETIC question");
    await waitFor(() => expect(replyText(store().turns.at(-1)!)).toBe("one "));
    const id = store().turns.at(-1)!.turnId;
    const stopping = store().stop();
    const next = store().send("SYNTHETIC second");
    await Promise.all([stopping, sending, next]);
    await settled();
    expect(store().turns.at(-1)).toMatchObject({ learnerText: "SYNTHETIC second", status: "completed" });
    expect(turn(id).status).toBe("interrupted");
    expect(resumeRequests).toEqual([]);
  });
});
