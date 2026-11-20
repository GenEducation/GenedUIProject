import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { StepActions } from "@/features/partner/types/sources";
import {
  StepTodo,
  needLabel,
  partnerQuestion,
  blankFor,
  waitsOnPlan,
} from "../StepGuide";

/** SYNTHETIC: two blocked steps (backend ADR 0049). */
const STEPS: StepActions[] = [
  {
    section_key: "p8",
    title: "SYNTHETIC: Let us write",
    actions: [{ kind: "decide_proposals", count: 3, activities: 1 }],
  },
  {
    section_key: "p5",
    title: "SYNTHETIC: Let us learn",
    actions: [
      {
        kind: "keep_concept",
        concept_key: "p5:c1",
        concept: "Antonyms",
        detail: "SYNTHETIC why.",
      },
      {
        kind: "add_question",
        concept_key: "p5:c2",
        concept: "Rhymes",
        obligation_key: "pick",
        detail: "SYNTHETIC pick",
      },
    ],
  },
];

function todo(step: StepActions) {
  const props = {
    onKeep: vi.fn(),
    onWrite: vi.fn(),
    onAsk: vi.fn(),
  };
  render(<StepTodo step={step} busy={null} {...props} />);
  return props;
}

describe("StepTodo", () => {
  it("says what a blocked step needs, with the buttons that fix it", () => {
    const props = todo(STEPS[1]);
    expect(screen.getByText(/Zoovi put “Antonyms” on hold/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /keep this concept/i }));
    expect(props.onKeep).toHaveBeenCalledWith("p5:c1");
    fireEvent.click(screen.getByRole("button", { name: /write a question/i }));
    expect(props.onWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionKey: "p5",
        conceptKey: "p5:c2",
        obligationKey: "pick",
        activity: false,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /ask zoovi to propose/i }),
    );
    expect(props.onAsk).toHaveBeenCalledWith("p5");
  });

  it("names proposals to decide without a button: they are on the step itself", () => {
    todo(STEPS[0]);
    expect(
      screen.getByText(
        /3 proposals are waiting for your decision \(1 activity\)/i,
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("needLabel", () => {
  it("gives the step list a short need", () => {
    expect(needLabel(STEPS[0])).toBe("3 to decide");
    expect(needLabel(STEPS[1])).toBe("Concept on hold");
    expect(needLabel(undefined)).toBeNull();
  });

  it("never asks to accept questions when there is nothing to decide: the step waits on Zoovi's plan", () => {
    const planless: StepActions = {
      section_key: "p4",
      title: "SYNTHETIC: II",
      actions: [{ kind: "decide_proposals", count: 0, activities: 0 }],
    };
    expect(waitsOnPlan(planless)).toBe(true);
    expect(waitsOnPlan(STEPS[0])).toBe(false);
    expect(needLabel(planless)).toBe("Waiting on Zoovi's plan");
  });
});

describe("partnerQuestion", () => {
  it("writes the partner's own entry for exactly the objective it is for", () => {
    const target = {
      sectionKey: "p5",
      conceptKey: "p5:c2",
      obligationKey: "pick",
      statement: "SYNTHETIC pick",
      activity: true,
    };
    const body = {
      ...blankFor(target),
      prompt: "SYNTHETIC: say two rhyming words.",
    };
    const entry = partnerQuestion(body, target);
    expect(entry.body.answer_kind).toBe("activity");
    expect(entry.meta.obligation_keys).toEqual(["pick"]);
    expect(entry.body.origin).toBe("partner");
  });
});
