import { describe, it, expect, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import {
  CHECK_ITEM, FIGURE_GROUP, LESSON_ID, NODE_1, NODE_2, OPTION_A,
  answerRequests, interruptRequests, lessonFixture, makeLessonInstance, replyScript, resumeRequests, turnRequests,
} from "@/test/msw/handlers/lesson";
import { picturesFor, useLessonStore } from "../useLessonStore";
import { replyText } from "../transcript";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const store = () => useLessonStore.getState();
const lastTurn = () => store().turns.at(-1)!;
const settled = () => waitFor(() => expect(store().turns.every((t) => t.status !== "streaming")).toBe(true));

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe("useLessonStore — loading", () => {
  it("loads the lesson and, on a fresh node, the tutor opens once", async () => {
    await store().load(LESSON_ID);
    expect(store().status).toBe("ready");
    expect(store().payload?.node.title).toBe("SYNTHETIC node 2");
    await settled();
    expect(turnRequests.map((r) => r.kind)).toEqual(["opening"]);
    expect(turnRequests[0].instance_node_id).toBe(NODE_1);
    expect(replyText(lastTurn())).toBe("SYNTHETIC reply.");
  });

  it("rebuilds the transcript from history and does not open again", async () => {
    lessonFixture.setHistory([{
      turn_id: "t-old", kind: "opening", status: "completed", teacher_text: "SYNTHETIC earlier.",
      created_at: "2026-10-09T00:00:00Z", committed_through_seq: 3, figure_group_ids: [FIGURE_GROUP],
    }]);
    await store().load(LESSON_ID);
    expect(turnRequests).toEqual([]);
    expect(store().turns.map(replyText)).toEqual(["SYNTHETIC earlier."]);
    expect(store().presentedFigureIds).toEqual([FIGURE_GROUP]);
    expect(store().focusedFigureId).toBe(FIGURE_GROUP);
  });

  it("shows the backend's message when the lesson can't be read", async () => {
    await store().load("not-this-lesson");
    expect(store().status).toBe("error");
  });
});

describe("useLessonStore — turns", () => {
  beforeEach(async () => {
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await store().load(LESSON_ID);
  });

  it("sends a learner message with text and latency, and streams the reply", async () => {
    lessonFixture.setScript(replyScript("A ", "B"));
    await store().send("  SYNTHETIC question  ");
    expect(turnRequests[0]).toMatchObject({ kind: "learner_message", text: "SYNTHETIC question", instance_node_id: NODE_1 });
    expect(typeof turnRequests[0].latency_ms).toBe("number");
    expect(lastTurn()).toMatchObject({ learnerText: "SYNTHETIC question", status: "completed" });
    expect(replyText(lastTurn())).toBe("A B");
  });

  it("resumes a dropped stream from its cursor without doubling text", async () => {
    lessonFixture.setScript(replyScript("one ", "two ", "three"));
    lessonFixture.dropAfter(2); // turn_started + "one "
    await store().send("SYNTHETIC question");
    expect(resumeRequests).toEqual([{ turnId: lastTurn().turnId, afterSeq: 2 }]);
    expect(replyText(lastTurn())).toBe("one two three");
    expect(lastTurn().status).toBe("completed");
  });

  it("puts a presented figure on the whiteboard and the filmstrip", async () => {
    lessonFixture.setScript(() => [
      { type: "figure_presented", figure_group_id: FIGURE_GROUP },
      { type: "text_delta", text: "Look." },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    await store().send("show me");
    expect(store().presentedFigureIds).toEqual([FIGURE_GROUP]);
    expect(store().focusedFigureId).toBe(FIGURE_GROUP);
    expect(picturesFor(store().manifest, FIGURE_GROUP)[0].src).toMatch(/\/v1\/visual-images\/pic-1\?exp=1&sig=synthetic$/);
  });

  it("follows state_changed: the lesson moves to the next node and rereads its payload", async () => {
    const reads = lessonFixture.manifestReads;
    const next = makeLessonInstance({ nodes_done: 2, revision: 5, active_node: { ...makeLessonInstance().active_node!, instance_node_id: NODE_2, title: "SYNTHETIC node 3" } });
    lessonFixture.setScript(() => [
      { type: "state_changed", instance: next },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    await store().send("done");
    expect(store().instance?.nodes_done).toBe(2);
    await waitFor(() => expect(store().payload?.node.title).toBe("SYNTHETIC node 3"));
    expect(lessonFixture.manifestReads).toBe(reads + 1);
  });

  it("marks a retryable failure and regenerates it", async () => {
    lessonFixture.setScript(() => [{ type: "turn_failed", reason: "model_error", retryable: true, retry: "regenerate" }]);
    await store().send("SYNTHETIC question");
    const failed = lastTurn();
    expect(failed.failure).toEqual({ reason: "model_error", retryable: true });
    lessonFixture.setScript(replyScript("again"));
    await store().retry(failed.turnId);
    expect(turnRequests.at(-1)).toMatchObject({ kind: "regenerate", regenerates: failed.turnId });
    expect(replyText(lastTurn())).toBe("again");
  });

  it("stop interrupts the open turn at the last seq seen", async () => {
    // A stream that stays open after its first text, as a live reply does.
    server.use(http.post(`${BASE}/v1/instances/:id/teacher-turns`, async ({ request }) => {
      const { turn_id } = (await request.json()) as { turn_id: string };
      const frame = (seq: number, body: object) => `id: ${turn_id}:${seq}\ndata: ${JSON.stringify({ v: 3, turn_id, seq, ...body })}\n\n`;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(frame(1, { type: "turn_started" }) + frame(2, { type: "text_delta", text: "partial" })));
        },
      });
      return new HttpResponse(stream, { headers: { "content-type": "text/event-stream" } });
    }));
    const sending = store().send("SYNTHETIC question");
    await waitFor(() => expect(replyText(lastTurn())).toBe("partial"));
    await store().stop();
    await sending;
    expect(interruptRequests).toEqual([{ turnId: lastTurn().turnId, visible_seq: 2 }]);
    expect(lastTurn().status).toBe("interrupted");
    expect(replyText(lastTurn())).toBe("partial");
  });
});

describe("useLessonStore — answers", () => {
  beforeEach(async () => {
    lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
    await store().load(LESSON_ID);
  });

  it("answers with the current revision, then the tutor reacts to the result", async () => {
    const result = await store().answer(CHECK_ITEM, { kind: "choice", option_ids: [OPTION_A] });
    expect(answerRequests[0]).toMatchObject({ item_id: CHECK_ITEM, expected_revision: 4, channel: "choice" });
    expect(result?.outcome).toBe("correct");
    expect(store().instance?.revision).toBe(5);
    await settled();
    expect(turnRequests.at(-1)).toMatchObject({ kind: "result_reaction", attempt_id: result?.attempt_id });
  });

  it("on a stale revision (409), rereads the lesson and rethrows", async () => {
    lessonFixture.setInstance(makeLessonInstance({ revision: 9 }));
    await expect(store().answer(CHECK_ITEM, { kind: "choice", option_ids: [OPTION_A] })).rejects.toMatchObject({ error_code: "CORE_3103" });
    expect(store().instance?.revision).toBe(9);
  });
});
