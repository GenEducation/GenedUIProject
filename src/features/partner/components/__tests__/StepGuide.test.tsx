import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { StepActions } from "@/features/partner/types/sources";
import { StepGuide, partnerQuestion, blankFor } from "../StepGuide";

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

function guide() {
  const props = {
    onOpen: vi.fn(),
    onKeep: vi.fn(),
    onWrite: vi.fn(),
    onAsk: vi.fn(),
  };
  render(<StepGuide steps={STEPS} accepted={4} busy={null} {...props} />);
  return props;
}

describe("StepGuide", () => {
  it("names each blocked step, why, and the button that fixes it", () => {
    const props = guide();
    expect(screen.getByText(/2 lesson steps need you/i)).toBeTruthy();
    expect(
      screen.getByText(
        /3 proposals are waiting for your decision \(1 activity\)/i,
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /review this step/i }));
    expect(props.onOpen).toHaveBeenCalledWith("p8");
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
  });

  it("says everything is covered when no step needs the partner", () => {
    render(
      <StepGuide
        steps={[]}
        accepted={4}
        busy={null}
        onOpen={vi.fn()}
        onKeep={vi.fn()}
        onWrite={vi.fn()}
        onAsk={vi.fn()}
      />,
    );
    expect(screen.getByText(/every lesson step is covered/i)).toBeTruthy();
  });

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
