import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import {
  CHECK_ITEM, FIGURE_GROUP, LESSON_ID, OPTION_A,
  answerRequests, lessonFixture, makeLessonInstance, stepRequests, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import type { CheckItem } from "../../types";

import { BoardPanel } from "../BoardPanel";
import { responseFor } from "../StepCard";

const node = makeLessonInstance().active_node!;
const store = () => useLessonStore.getState();

async function open(instance = makeLessonInstance()) {
  lessonFixture.setInstance(instance);
  await store().load(LESSON_ID);
  return render(<BoardPanel />);
}

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", teacher_text: "SYNTHETIC look at this.", created_at: "x", figure_group_ids: [FIGURE_GROUP] }]);
});

describe("BoardPanel — figures", () => {
  it("shows the focused figure described by its learner caption, without repeating the chat", async () => {
    await open();
    const img = screen.getByRole("img", { name: "SYNTHETIC figure" });
    expect(img.getAttribute("src")).toMatch(/\/v1\/visual-images\/pic-1\?exp=1&sig=synthetic$/);
    // The visual carries its own drawn title; the learner caption is its description, not repeated beneath it.
    expect(document.querySelector("figcaption")).toBeNull();
    // The tutor's words live in the chat; the board doesn't repeat them.
    expect(screen.queryByText("SYNTHETIC look at this.")).toBeNull();
    expect(screen.getByText("Learn")).toBeInTheDocument();
  });

  it("an expired picture refreshes the manifest once, then says it couldn't load", async () => {
    await open();
    const reads = lessonFixture.manifestReads;
    fireEvent.error(screen.getByRole("img", { name: "SYNTHETIC figure" }));
    await waitFor(() => expect(lessonFixture.manifestReads).toBe(reads + 1));
    fireEvent.error(await screen.findByRole("img", { name: "SYNTHETIC figure" }));
    expect(await screen.findByText("This picture couldn't load.")).toBeInTheDocument();
  });

  it("keeps every figure on the board; the filmstrip focuses one without removing the others", async () => {
    lessonFixture.setHistory([
      { turn_id: "t1", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [FIGURE_GROUP] },
      { turn_id: "t2", kind: "learner_message", status: "completed", created_at: "x", figure_group_ids: ["g-second"] },
    ]);
    await open();
    // A second picture the board has a URL for (as if from an earlier node's manifest).
    act(() => useLessonStore.setState((s) => ({
      manifest: { ...s.manifest!, figures: { ...s.manifest!.figures, "pic-2": { figure_group_id: "g-second", url: "/v1/visual-images/pic-2", width_px: 10, height_px: 10, mime: "image/png", sha256: "0".repeat(64) } } },
    })));
    const board = screen.getByRole("list", { name: "Figures on the board" });
    expect(within(board).getAllByRole("listitem")).toHaveLength(2);
    expect(within(board).getAllByRole("listitem")[1]).toHaveAttribute("aria-current", "true");

    const strip = screen.getByRole("navigation", { name: "Figures shown in this lesson" });
    fireEvent.click(within(strip).getByRole("button", { name: "Previous figure" }));
    expect(store().focusedFigureId).toBe(FIGURE_GROUP);
    expect(within(board).getAllByRole("listitem")).toHaveLength(2);
    expect(within(board).getAllByRole("listitem")[0]).toHaveAttribute("aria-current", "true");
  });

  it("a figure presented now is inked in; ones already on the board just appear", async () => {
    await open();
    expect(document.querySelector(`[data-figure-id="${FIGURE_GROUP}"]`)?.className).not.toMatch(/lesson-writing/);
    act(() => useLessonStore.setState((s) => ({
      presentedFigureIds: [...s.presentedFigureIds, "g-new"],
      focusedFigureId: "g-new",
      manifest: { ...s.manifest!, figures: { ...s.manifest!.figures, "pic-new": { figure_group_id: "g-new", url: "/v1/visual-images/pic-new", width_px: 10, height_px: 10, mime: "image/png", sha256: "0".repeat(64) } } },
    })));
    expect(document.querySelector('[data-figure-id="g-new"]')?.className).toMatch(/lesson-writing/);
  });

  it("leaves out a figure it has no picture for", async () => {
    lessonFixture.setHistory([
      { turn_id: "t1", kind: "opening", status: "completed", created_at: "x", figure_group_ids: ["earlier-group", FIGURE_GROUP] },
    ]);
    await open();
    expect(within(screen.getByRole("list", { name: "Figures on the board" })).getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("BoardPanel — the step card", () => {
  it("answers a multiple-choice check, shows the result, and the tutor reacts", async () => {
    await open();
    const card = screen.getByRole("form", { name: "SYNTHETIC check?" });
    const submit = within(card).getByRole("button", { name: "Check answer" });
    expect(submit).toBeDisabled();
    fireEvent.click(within(card).getByRole("radio", { name: "SYNTHETIC A" }));
    fireEvent.click(submit);
    expect(await screen.findByText("That's right!")).toBeInTheDocument();
    expect(answerRequests[0]).toMatchObject({ item_id: CHECK_ITEM, channel: "choice", response: { kind: "choice", option_ids: [OPTION_A] } });
    await waitFor(() => expect(turnRequests.at(-1)?.kind).toBe("result_reaction"));
  });

  it("Hint records the request and asks the tutor for a hint turn", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Hint" }));
    await waitFor(() => expect(turnRequests.at(-1)).toMatchObject({ kind: "hint", item_id: CHECK_ITEM }));
    expect(stepRequests[0]).toMatchObject({ route: "hints", body: { item_id: CHECK_ITEM } });
  });

  it("a teach step with every check answered and enough talk offers Next step", async () => {
    await open(makeLessonInstance({ active_node: { ...node, answered_item_ids: [CHECK_ITEM], engagement_count: 1 } }));
    fireEvent.click(screen.getByRole("button", { name: /Next step/ }));
    await waitFor(() => expect(stepRequests).toEqual([{ route: "done", body: expect.objectContaining({ expected_revision: 4 }) }]));
    await waitFor(() => expect(store().instance?.nodes_done).toBe(2));
  });

  it("a teach step still short of talk asks the learner to talk it through", async () => {
    await open(makeLessonInstance({ active_node: { ...node, answered_item_ids: [CHECK_ITEM], engagement_count: 0 } }));
    expect(screen.getByText("Talk it through with your tutor to unlock the next step.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Next step/ })).toBeNull();
  });

  it("after a failed round, offers the choice with the recommended one first", async () => {
    await open(makeLessonInstance({
      next_action: "choose",
      active_node: { ...node, type: "practice", choice: { options: ["try_now", "keep_going"], recommended: "keep_going" } },
    }));
    fireEvent.click(screen.getByRole("button", { name: "Try a new question" }));
    await waitFor(() => expect(stepRequests[0]).toMatchObject({ route: "choice", body: { choice: "try_now" } }));
  });

  it("confirms a reading: yes resubmits the suggestion as confirmed", async () => {
    await open(makeLessonInstance({
      next_action: "confirm_reading",
      active_node: { ...node, pending_reading: { item_id: CHECK_ITEM, original: "SYNTHETIC tpyo", suggestion: "SYNTHETIC typo" } },
    }));
    expect(screen.getByText(/You wrote “SYNTHETIC tpyo”/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, SYNTHETIC typo" }));
    await waitFor(() => expect(answerRequests[0]).toMatchObject({ confirmed_reading: true, response: { kind: "text", text: "SYNTHETIC typo" } }));
  });
});

describe("responseFor", () => {
  const check = (response_type: CheckItem["response_type"]) => ({ response_type }) as CheckItem;
  it("numeric checks send a number; the other typed checks send text", () => {
    expect(responseFor(check("numeric"), " 3/4 ")).toEqual({ kind: "numeric", value: "3/4" });
    expect(responseFor(check("numeric_set"), "2, 3")).toEqual({ kind: "text", text: "2, 3" });
    expect(responseFor(check("symbolic"), "2x+1")).toEqual({ kind: "text", text: "2x+1" });
  });
});
