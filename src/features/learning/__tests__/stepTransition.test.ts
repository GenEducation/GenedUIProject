import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  FIGURE_GROUP, FIGURE_GROUP_2, LESSON_ID, NODE_1, NODE_2,
  interruptRequests, lessonFixture, makeLessonInstance, replyScript, stepRequests, turnRequests,
} from "@/test/msw/handlers/lesson";
import { heldForFigure, useLessonStore } from "../useLessonStore";
import { replyText } from "../transcript";
import { fakeImages, imageRequests } from "./fakeImages";

/**
 * Moving to the next step (Part 5) and figures arriving with the words about them (Part 6), at the store. The MSW
 * lesson is per node: NODE_1 shows FIGURE_GROUP (`pic-1`), NODE_2 shows FIGURE_GROUP_2 (`pic-2`). Pictures load
 * through `fakeImages` (jsdom decodes nothing), so "ready" here means the loader resolved, not that a browser painted it.
 */
const store = () => useLessonStore.getState();
const lastTurn = () => store().turns.at(-1)!;
const settled = () => waitFor(() => expect(store().turns.every((t) => t.status !== "streaming")).toBe(true));
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

const nextNode = () =>
  makeLessonInstance({
    revision: 4,
    active_node: { ...makeLessonInstance().active_node!, instance_node_id: NODE_2, title: "SYNTHETIC node 3" },
  });

/** A held reply on NODE_1: the tutor is still talking (turn_started and its first words sent, the rest not yet). */
async function tutorStillTalking() {
  lessonFixture.setScript(replyScript("SYNTHETIC first words ", "SYNTHETIC late words."));
  lessonFixture.holdStream(2);
  void store().send("SYNTHETIC question");
  await waitFor(() => expect(replyText(lastTurn())).toBe("SYNTHETIC first words "));
  return lastTurn().turnId;
}

beforeEach(async () => {
  fakeImages.install();
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{
    turn_id: "t-question", kind: "opening", status: "completed", teacher_text: "SYNTHETIC what do you notice?",
    created_at: "2026-10-15T10:00:00Z", committed_through_seq: 3, figure_group_ids: [],
  }]);
  await store().load(LESSON_ID);
  turnRequests.length = 0;
});
afterEach(() => fakeImages.uninstall());

describe("moving on to the next step", () => {
  it("before answering the tutor's question: the question stays as it was, and the new step opens on NODE_2", async () => {
    lessonFixture.setInstance(nextNode());
    lessonFixture.setScript(replyScript("SYNTHETIC opening of node 3."));
    await store().done();
    await settled();
    expect(turnRequests.map((r) => [r.kind, r.instance_node_id])).toEqual([["opening", NODE_2]]);
    expect(interruptRequests).toEqual([]); // nothing was streaming: nothing to cut
    expect(store().turns.map((t) => [t.nodeId, t.status])).toEqual([[NODE_1, "completed"], [NODE_2, "completed"]]);
    expect(replyText(lastTurn())).toBe("SYNTHETIC opening of node 3.");
    expect(store().stepTitles[NODE_2]).toBe("SYNTHETIC node 3");
    expect(store().stepPending).toBe(false);
  });

  it("after the tutor finished in this session: the finished reply is untouched and nothing is interrupted", async () => {
    lessonFixture.setScript(replyScript("SYNTHETIC done talking."));
    await store().send("SYNTHETIC question");
    lessonFixture.setInstance(nextNode());
    await store().done();
    await settled();
    expect(interruptRequests).toEqual([]);
    expect(store().turns.find((t) => t.learnerText === "SYNTHETIC question")).toMatchObject({ status: "completed", nodeId: NODE_1 });
    expect(turnRequests.map((r) => r.kind)).toEqual(["learner_message", "opening"]);
  });

  it("while the tutor is still talking: that reply is cut where the learner saw it, and nothing more of it arrives", async () => {
    const old = await tutorStillTalking();
    lessonFixture.setInstance(nextNode());
    lessonFixture.setScript(replyScript("SYNTHETIC opening of node 3."));
    await store().done();
    // Cut at once, reported with what was on screen, before the next step's opening is asked for.
    expect(store().turns.find((t) => t.turnId === old)?.status).toBe("interrupted");
    await waitFor(() => expect(turnRequests.map((r) => r.kind)).toEqual(["learner_message", "opening"]));
    expect(interruptRequests).toEqual([{ turnId: old, visible_seq: 2 }]);
    await settled();
    lessonFixture.releaseStream(); // the old stream's rest, had the client still been reading it
    await tick();
    expect(replyText(store().turns.find((t) => t.turnId === old)!)).toBe("SYNTHETIC first words ");
    expect(replyText(lastTurn())).toBe("SYNTHETIC opening of node 3.");
    expect(lastTurn().nodeId).toBe(NODE_2);
  });

  it("the opening waits for the new step's payload and pictures, not for the old reply to finish", async () => {
    await tutorStillTalking();
    const release = lessonFixture.holdNodeReads();
    lessonFixture.setInstance(nextNode());
    await store().done();
    await tick();
    expect(turnRequests.map((r) => r.kind)).toEqual(["learner_message"]); // still reading NODE_2's payload and manifest
    expect(store().stepPending).toBe(true);
    release();
    await waitFor(() => expect(turnRequests.map((r) => r.kind)).toEqual(["learner_message", "opening"]));
    expect(store().manifest?.figures["pic-2"]).toBeDefined(); // the new step's pictures were in before it opened
    expect(store().payload?.node.title).toBe("SYNTHETIC node 3");
    await settled();
  });

  it("a failed opening is said, with a retry that asks for the opening again", async () => {
    lessonFixture.setInstance(nextNode());
    lessonFixture.failNextTurns(1);
    await store().done();
    await waitFor(() => expect(lastTurn()).toMatchObject({ kind: "opening", status: "failed", nodeId: NODE_2 }));
    const failed = lastTurn().turnId;
    lessonFixture.setScript(replyScript("SYNTHETIC opening, second ask."));
    await store().retry(failed);
    await settled();
    expect(turnRequests.map((r) => [r.kind, r.instance_node_id])).toEqual([["opening", NODE_2], ["opening", NODE_2]]);
    expect(store().turns.some((t) => t.turnId === failed)).toBe(false); // the failure is replaced, not left beside it
    expect(replyText(lastTurn())).toBe("SYNTHETIC opening, second ask.");
  });

  it("a failed turn of a step already left is not retried into the new one", async () => {
    lessonFixture.setScript(() => [{ type: "turn_failed", reason: "model_error", retryable: true, retry: "regenerate" }]);
    await store().send("SYNTHETIC question");
    const failed = lastTurn().turnId;
    expect(lastTurn().status).toBe("failed");
    lessonFixture.setInstance(nextNode());
    await store().done();
    await settled();
    turnRequests.length = 0;
    await store().retry(failed);
    expect(turnRequests).toEqual([]);
  });

  it("a message sent right after Next step waits for the step, and goes on NODE_2 after its opening", async () => {
    lessonFixture.setInstance(nextNode());
    const moving = store().done();
    expect(store().stepPending).toBe(true);
    const sending = store().send("SYNTHETIC right away");
    await Promise.all([moving, sending]);
    await settled();
    expect(turnRequests.map((r) => [r.kind, r.instance_node_id])).toEqual([["opening", NODE_2], ["learner_message", NODE_2]]);
    expect(stepRequests.map((r) => r.route)).toEqual(["done"]);
  });

  it("a Next step the server refuses closes the gap again, so the learner can keep talking on this step", async () => {
    lessonFixture.setInstance(makeLessonInstance({ revision: 9 })); // the screen's revision 4 is stale
    await expect(store().done()).rejects.toMatchObject({ error_code: "CORE_3103" });
    expect(store().stepPending).toBe(false);
    await store().send("SYNTHETIC still here");
    expect(turnRequests.at(-1)).toMatchObject({ kind: "learner_message", instance_node_id: NODE_1 });
  });

  it("a manifest read that fails on the new step is tried again before the step opens", async () => {
    lessonFixture.setInstance(nextNode());
    lessonFixture.failNextManifests(1);
    const attempts = lessonFixture.manifestAttempts;
    await store().done();
    await waitFor(() => expect(turnRequests.map((r) => r.kind)).toEqual(["opening"]));
    expect(lessonFixture.manifestAttempts).toBe(attempts + 2);
    expect(store().manifest?.figures["pic-2"]).toBeDefined();
    await settled();
  });

  it("a late event of the step left (a voice reply's words or figure) is ignored", async () => {
    store().setVoiceSession("synthetic-voice-1");
    store().voiceTurnStarted("vt-old", "SYNTHETIC spoken question");
    store().voiceTurnEvent({ v: 3, turn_id: "vt-old", seq: 1, type: "turn_started", kind: "learner_message", instance_node_id: NODE_1, instance_revision: 4, protocol: "teacher_turn_stream_v3" });
    store().voiceTurnEvent({ v: 3, turn_id: "vt-old", seq: 2, type: "text_delta", text: "SYNTHETIC spoken words " });
    lessonFixture.setInstance(nextNode());
    await store().done();
    expect(store().turns.find((t) => t.turnId === "vt-old")?.status).toBe("interrupted");
    store().voiceTurnEvent({ v: 3, turn_id: "vt-old", seq: 3, type: "figure_presented", figure_group_id: FIGURE_GROUP });
    store().voiceTurnEvent({ v: 3, turn_id: "vt-old", seq: 4, type: "text_delta", text: "SYNTHETIC late." });
    expect(replyText(store().turns.find((t) => t.turnId === "vt-old")!)).toBe("SYNTHETIC spoken words ");
    expect(store().presentedFigureIds).toEqual([]);
    expect(store().focusedFigureId).toBeNull();
    // Voice: the socket reconnects for NODE_2 and the server speaks its opening; the screen asks for none and is not left waiting.
    await tick();
    expect(turnRequests).toEqual([]);
    expect(interruptRequests).toEqual([]); // a voice reply is cancelled by its socket being replaced, not by a report
    expect(store().stepPending).toBe(false);
  });

  it("voice: a reconnect ends the replaced session's replies, even when their end never arrived", () => {
    store().setVoiceSession("synthetic-voice-1");
    store().voiceTurnStarted("vt-1", "SYNTHETIC spoken");
    store().setVoiceSession("synthetic-voice-2");
    expect(store().turns.find((t) => t.turnId === "vt-1")?.status).toBe("interrupted");
  });

  it("the reply that itself moved the lesson on plays out, then the next step opens", async () => {
    lessonFixture.setScript((request) =>
      request.kind === "learner_message"
        ? [
            { type: "state_changed", instance: nextNode() },
            { type: "text_delta", text: "SYNTHETIC well done." },
            { type: "turn_completed", status: "completed", finish_reason: "stop" },
          ]
        : [{ type: "text_delta", text: "SYNTHETIC node 3 opening." }, { type: "turn_completed", status: "completed", finish_reason: "stop" }],
    );
    await store().send("SYNTHETIC answer");
    await settled();
    await waitFor(() => expect(turnRequests.map((r) => r.kind)).toEqual(["learner_message", "opening"]));
    await settled();
    const [, reaction, opening] = store().turns;
    expect(reaction).toMatchObject({ status: "completed", nodeId: NODE_1 });
    expect(replyText(reaction)).toBe("SYNTHETIC well done.");
    expect(opening).toMatchObject({ kind: "opening", nodeId: NODE_2 });
    expect(interruptRequests).toEqual([]);
  });
});

describe("a figure and the words about it", () => {
  const presenting = (group: string, ...texts: string[]) => () => [
    { type: "figure_presented" as const, figure_group_id: group },
    ...texts.map((text) => ({ type: "text_delta" as const, text })),
    { type: "turn_completed" as const, status: "completed" as const, finish_reason: "stop" as const },
  ];

  it("already in the manifest: the words show once the picture is decoded", async () => {
    lessonFixture.setScript(presenting(FIGURE_GROUP, "SYNTHETIC look at this."));
    await store().send("SYNTHETIC show me");
    await waitFor(() => expect(store().figureStatus[FIGURE_GROUP]).toBe("ready"));
    expect(heldForFigure(lastTurn(), store().figureStatus)).toBe(false);
    expect(store().focusedFigureId).toBe(FIGURE_GROUP);
  });

  it("a picture still downloading holds the words, even after the reply has finished streaming", async () => {
    fakeImages.hold("pic-1");
    store().reset();
    await store().load(LESSON_ID);
    lessonFixture.setScript(presenting(FIGURE_GROUP, "SYNTHETIC look at this."));
    await store().send("SYNTHETIC show me");
    expect(lastTurn().status).toBe("completed");
    expect(store().figureStatus[FIGURE_GROUP]).toBe("pending");
    expect(heldForFigure(lastTurn(), store().figureStatus)).toBe(true);
    fakeImages.release("pic-1");
    await waitFor(() => expect(store().figureStatus[FIGURE_GROUP]).toBe("ready"));
    expect(heldForFigure(lastTurn(), store().figureStatus)).toBe(false);
  });

  it("a picture that fails is refreshed once, then the words show with the figure marked failed; a retry can recover it", async () => {
    fakeImages.fail("pic-1");
    store().reset();
    await store().load(LESSON_ID);
    const reads = lessonFixture.manifestReads;
    lessonFixture.setScript(presenting(FIGURE_GROUP, "SYNTHETIC look at this."));
    await store().send("SYNTHETIC show me");
    await waitFor(() => expect(store().figureStatus[FIGURE_GROUP]).toBe("failed"));
    expect(lessonFixture.manifestReads).toBe(reads + 1); // fresh URLs, once
    expect(heldForFigure(lastTurn(), store().figureStatus)).toBe(false);
    fakeImages.fail();
    await store().retryFigure(FIGURE_GROUP);
    expect(store().figureStatus[FIGURE_GROUP]).toBe("ready");
  });

  it("a figure the manifest does not have yet is fetched again; still missing, it fails rather than hold the words", async () => {
    lessonFixture.omitFromManifest(FIGURE_GROUP);
    store().reset();
    await store().load(LESSON_ID);
    lessonFixture.setScript(presenting(FIGURE_GROUP, "SYNTHETIC look at this."));
    await store().send("SYNTHETIC show me");
    await waitFor(() => expect(store().figureStatus[FIGURE_GROUP]).toBe("failed"));
    expect(heldForFigure(lastTurn(), store().figureStatus)).toBe(false);
    lessonFixture.omitFromManifest(); // signed now
    await store().retryFigure(FIGURE_GROUP);
    expect(store().figureStatus[FIGURE_GROUP]).toBe("ready");
  });

  it("a delayed manifest: the figure waits for it, then shows with its words", async () => {
    lessonFixture.omitFromManifest(FIGURE_GROUP);
    store().reset();
    await store().load(LESSON_ID);
    lessonFixture.omitFromManifest();
    const release = lessonFixture.holdNodeReads();
    lessonFixture.setScript(presenting(FIGURE_GROUP, "SYNTHETIC look at this."));
    await store().send("SYNTHETIC show me");
    expect(store().figureStatus[FIGURE_GROUP]).toBe("pending");
    release();
    await waitFor(() => expect(store().figureStatus[FIGURE_GROUP]).toBe("ready"));
  });

  it("the manifest's pictures are fetched when it loads, before any is presented (§9.2)", async () => {
    store().reset();
    imageRequests.length = 0;
    await store().load(LESSON_ID);
    expect(imageRequests.some((src) => src.includes("pic-1"))).toBe(true);
  });

  it("the new step's opening presents its figure: the words wait for that figure, the old step's figure stays", async () => {
    fakeImages.hold("pic-2");
    lessonFixture.setInstance(nextNode());
    lessonFixture.setScript(presenting(FIGURE_GROUP_2, "SYNTHETIC here is node 3's picture."));
    await store().done();
    await waitFor(() => expect(lastTurn()).toMatchObject({ kind: "opening", status: "completed" }));
    expect(store().focusedFigureId).toBe(FIGURE_GROUP_2);
    expect(heldForFigure(lastTurn(), store().figureStatus)).toBe(true);
    fakeImages.release("pic-2");
    await waitFor(() => expect(heldForFigure(lastTurn(), store().figureStatus)).toBe(false));
    expect(store().manifest?.figures["pic-1"]).toBeDefined(); // merged, so the earlier step's picture can still be drawn
  });

  it("a held reply cut by Next step reports nothing of its words as seen", async () => {
    fakeImages.hold("pic-1");
    store().reset();
    await store().load(LESSON_ID);
    lessonFixture.setScript(presenting(FIGURE_GROUP, "SYNTHETIC words about the picture ", "SYNTHETIC more."));
    lessonFixture.holdStream(3); // turn_started, figure_presented, the first words
    void store().send("SYNTHETIC show me");
    await waitFor(() => expect(lastTurn().deltas).toHaveLength(1));
    const old = lastTurn().turnId;
    lessonFixture.setInstance(nextNode());
    await store().done();
    await waitFor(() => expect(interruptRequests).toHaveLength(1));
    expect(interruptRequests[0]).toEqual({ turnId: old, visible_seq: 2 }); // through the figure event, not the held words
  });
});
