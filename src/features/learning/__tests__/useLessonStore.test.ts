import { describe, it, expect, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  CHECK_ITEM, FIGURE_GROUP, LESSON_ID, NODE_1, NODE_2, OPTION_A,
  answerRequests, lessonFixture, makeLessonInstance, replyScript, resumeRequests, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../useLessonStore";
import { replyText } from "../transcript";

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
