import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CHECK_ITEM, LESSON_ID, lessonFixture, syntheticPayload } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { StepCard } from "../StepCard";
import { initialArrangement } from "../../check/formats";
import { progressNote, writtenNote } from "../../check/progress";
import type { AnswerResult, CheckItem } from "../../types";

/** The shared question frame (Phase 1): progress beside the Check button, and an answer to change that stays marked. SYNTHETIC data. */
const base: CheckItem = {
  id: CHECK_ITEM,
  prompt: "SYNTHETIC question",
  response_type: "mcq",
  role: "checkpoint",
  options: [
    { id: "o1", text: "SYNTHETIC alpha" },
    { id: "o2", text: "SYNTHETIC beta" },
  ],
  figure_groups: [],
};

const answer = vi.fn(async (): Promise<AnswerResult | null> => null);

async function show(check: CheckItem) {
  lessonFixture.reset();
  useLessonStore.getState().reset();
  localStorage.clear();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
  await useLessonStore.getState().load(LESSON_ID);
  const payload = syntheticPayload();
  payload.node.check_items = [check];
  answer.mockReset();
  useLessonStore.setState({ payload, answer: answer as never });
  render(<StepCard />);
}

const submit = () => screen.getByRole("button", { name: /check answer/i });

describe("progressNote", () => {
  const empty = { arranged: initialArrangement(base), selected: null, typed: "" };

  it("counts pairs made without saying which are right", () => {
    const matching: CheckItem = { ...base, response_type: "matching", left_entries: ["a", "b", "c"] };
    expect(progressNote(matching, { ...empty, arranged: { ...empty.arranged, pairs: { a: "x" } } })).toEqual({
      key: "matchedProgress",
      vars: { n: 1, m: 3 },
      ready: false,
    });
    expect(progressNote(matching, { ...empty, arranged: { ...empty.arranged, pairs: { a: "x", b: "y", c: "z" } } })?.ready).toBe(true);
  });

  it("asks for a choice, then says nothing once one is made", () => {
    expect(progressNote(base, empty)).toEqual({ key: "chooseOne", ready: false });
    expect(progressNote(base, { ...empty, selected: "o1" })).toBeNull();
  });

  it("says how much more a written answer needs", () => {
    expect(writtenNote(12, 20)).toEqual({ key: "writtenNeedMore", vars: { n: 8 }, ready: false });
    expect(writtenNote(20, 20)).toBeNull();
  });
});

describe("the question card", () => {
  it("says why Check answer cannot be pressed yet, and the button is described by it", async () => {
    await show(base);
    expect(submit()).toBeDisabled();
    expect(submit()).toHaveAccessibleDescription("Choose one answer.");
    await userEvent.click(screen.getByRole("radio", { name: "SYNTHETIC alpha" }));
    expect(submit()).toBeEnabled();
    expect(screen.queryByText("Choose one answer.")).toBeNull();
  });

  it("keeps an answer to change marked, with a note, until the learner changes it", async () => {
    await show(base);
    const instance = useLessonStore.getState().instance!;
    answer.mockResolvedValue({
      attempt_id: null,
      outcome: "incorrect",
      correct: false,
      eligibility_reason: null,
      round_id: null,
      round_state: null,
      replayed: false,
      instance,
    } as unknown as AnswerResult);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "SYNTHETIC alpha" }));
    await user.click(submit());
    expect(await screen.findByText("Not quite yet. Change your answer and check it again.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "SYNTHETIC alpha" })).toHaveAttribute("data-tone", "try");

    await user.click(screen.getByRole("radio", { name: "SYNTHETIC beta" }));
    expect(screen.queryByText("Not quite yet. Change your answer and check it again.")).toBeNull();
    expect(screen.getByRole("radio", { name: "SYNTHETIC beta" })).not.toHaveAttribute("data-tone");
  });

  it("letters the options, and keeps the letter out of their names", async () => {
    await show(base);
    const marks = [...document.querySelectorAll('[role="radio"] .lesson-choice-mark')].map((m) => m.textContent);
    expect(marks).toEqual(["A", "B"]);
    expect(screen.getByRole("radio", { name: "SYNTHETIC alpha" })).toBeInTheDocument();
  });

  it("is one Tab stop, and the arrow keys move and choose like a native radio group", async () => {
    await show(base);
    const user = userEvent.setup();
    const [alpha, beta] = screen.getAllByRole("radio");
    expect(alpha).toHaveAttribute("tabindex", "0");
    expect(beta).toHaveAttribute("tabindex", "-1");
    alpha.focus();
    await user.keyboard("{ArrowDown}");
    expect(beta).toHaveAttribute("aria-checked", "true");
    expect(beta).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(alpha).toHaveAttribute("aria-checked", "true");
    expect(alpha).toHaveFocus();
    await user.keyboard("{End}");
    expect(beta).toHaveAttribute("aria-checked", "true");
  });
});
