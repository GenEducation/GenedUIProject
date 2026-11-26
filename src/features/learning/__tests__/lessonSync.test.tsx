/**
 * Lesson-sync reproducers (Phase 0): the screen, the voice and the lesson's step must agree.
 *
 * Each test states the behaviour the lesson should have. An `it.fails` reproduces a known bug still open: it is expected to fail
 * until the fix lands, and the fix turns it into a plain `it` in the same change. SYNTHETIC data only.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import {
  CHECK_ITEM, LESSON_ID, NODE_1, NODE_2, OPTION_A, lessonFixture, makeLessonInstance, syntheticPayload, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../useLessonStore";
import { StepCard } from "../components/StepCard";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const ATTEMPT = "99999999-0000-4000-8000-0000000000aa";
const store = () => useLessonStore.getState();
const lastTurn = () => store().turns.at(-1)!;

/** The lesson after the chapter's first step is finished: on the next step. */
const movedOn = () =>
  makeLessonInstance({
    nodes_done: 2,
    revision: 5,
    active_node: { ...makeLessonInstance().active_node!, instance_node_id: NODE_2, title: "SYNTHETIC node 3" },
  });

/** Hold every answer at the server until the returned function is called; it then answers `correct` with `instance`. */
const holdAnswers = (instance: () => ReturnType<typeof makeLessonInstance>) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  server.use(
    http.post(`${BASE}/v1/instances/:instanceId/responses`, async () => {
      await gate;
      return HttpResponse.json({
        attempt_id: ATTEMPT, outcome: "correct", correct: true, eligibility_reason: null, round_id: null,
        round_state: "open", replayed: false, instance: instance(),
      });
    }),
  );
  return release;
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

beforeEach(async () => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
  await store().load(LESSON_ID);
  turnRequests.length = 0;
});

describe("lesson sync: the popup belongs to its step (phase 1)", () => {
  it("applies a step change even when a spoken reply cuts in before it arrives", async () => {
    // The child types the answer; the server moves the lesson on and says so first in that reply. A spoken reply starts before
    // the step change reaches the screen: the change is dropped, the old step's popup stays on screen.
    lessonFixture.setScript(() => [
      { type: "state_changed", instance: movedOn() },
      { type: "text_delta", text: "SYNTHETIC right." },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    lessonFixture.holdStream(1); // only turn_started has arrived
    const sending = store().send("SYNTHETIC 12");
    await waitFor(() => expect(lastTurn().status).toBe("streaming"));
    act(() => store().voiceTurnStarted("voice-synthetic-1", "SYNTHETIC hello"));
    lessonFixture.releaseStream();
    await sending;
    await waitFor(() => expect(store().instance?.active_node?.instance_node_id).toBe(NODE_2));
  });

  it("asks for the reaction on the step the answer was given on, even if the lesson moved meanwhile", async () => {
    // A chat reply is still streaming when the card is answered (slow network). That reply moves the lesson on before the answer
    // returns. The reaction must name the answer's step (the server refuses an attempt named on another step), not whichever
    // step is current when the answer returns.
    lessonFixture.setScript(() => [
      { type: "state_changed", instance: movedOn() },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    lessonFixture.holdStream(1); // the chat reply has started; its step change has not arrived
    const sending = store().send("SYNTHETIC next please");
    await waitFor(() => expect(lastTurn().status).toBe("streaming"));
    const release = holdAnswers(movedOn);
    const answering = store().answer(CHECK_ITEM, { kind: "choice", option_ids: [OPTION_A] });
    lessonFixture.releaseStream();
    await sending;
    expect(store().instance?.active_node?.instance_node_id).toBe(NODE_2);
    release();
    await answering;
    await waitFor(() => expect(turnRequests.some((r) => r.kind === "result_reaction")).toBe(true));
    expect(turnRequests.find((r) => r.kind === "result_reaction")).toMatchObject({ instance_node_id: NODE_1, attempt_id: ATTEMPT });
  });

  it("holds a typed message while a popup answer is on its way, so both never land on the same step", async () => {
    const release = holdAnswers(() => makeLessonInstance({ revision: 5 }));
    const answering = store().answer(CHECK_ITEM, { kind: "choice", option_ids: [OPTION_A] });
    const sending = store().send("SYNTHETIC 12");
    await tick();
    expect(turnRequests.filter((r) => r.kind === "learner_message")).toEqual([]);
    release();
    await answering;
    await sending;
  });
});

describe("lesson sync: no popup over an unfinished explanation (phase 2)", () => {
  it.fails("shows the presented check only once the reply that presents it has finished", async () => {
    // The reply that introduces the question says check_presented first, before its words. The card must not pop up over the
    // explanation: answering it then cuts the explanation off and the concept is half taught.
    const base = store().instance!;
    const hidden = { ...base, active_node: { ...base.active_node!, check_presented: false } };
    lessonFixture.setInstance(hidden);
    act(() => useLessonStore.setState({ instance: hidden, payload: syntheticPayload() }));
    const presented = { ...hidden, active_node: { ...hidden.active_node!, check_presented: true } };
    lessonFixture.setScript(() => [
      { type: "state_changed", instance: presented },
      { type: "text_delta", text: "SYNTHETIC first, think about the halves." },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    lessonFixture.holdStream(2); // turn_started and state_changed have arrived; the words have not
    const sending = store().send("SYNTHETIC ok");
    await waitFor(() => expect(store().instance?.active_node?.check_presented).toBe(true));
    render(<StepCard />);
    expect(screen.queryByRole("button", { name: /check answer/i })).not.toBeInTheDocument();
    lessonFixture.releaseStream();
    await sending;
    await waitFor(() => expect(screen.getByRole("button", { name: /check answer/i })).toBeInTheDocument());
  });
});
