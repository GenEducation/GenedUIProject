import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../../services/onboardingService", () => ({
  onboardingService: { completeGeneralOnboarding: vi.fn() },
}));

import { onboardingService } from "../../../services/onboardingService";
import { GeneralOnboardingWizard } from "../GeneralOnboardingWizard";

const completeMock = vi.mocked(onboardingService.completeGeneralOnboarding);

const studentProfile = {
  user_id: "u1",
  username: "Ada",
  age: 10,
  grade: 6,
  ai_name: "Nia",
};

// Sage bubbles type their message out via a timer; clicking one while it's still
// mid-type instantly reveals the full text and fires onDone (see SageBubble.revealAll).
// The bubble carries `cursor: pointer` in its inline style precisely while undone.
function revealCurrentBubble(container: HTMLElement) {
  const bubble = container.querySelector('div[style*="cursor: pointer"]') as HTMLElement;
  fireEvent.click(bubble);
}

async function answerQuestion(container: HTMLElement, value: string) {
  revealCurrentBubble(container);
  const textarea = await waitFor(() => screen.getByRole("textbox"));
  fireEvent.change(textarea, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
}

// The counter is JSX `{step + 1} of {TOTAL_STEPS}`, which compiles to three separate
// text nodes inside one leafless div — getByText's exact-string match won't span that,
// so match on the div's own concatenated textContent instead.
function stepCounter(n: number) {
  return (_: string, el: Element | null) =>
    el?.children.length === 0 && el.textContent?.replace(/\s+/g, " ").trim() === `${n} of 6`;
}

beforeEach(() => {
  completeMock.mockReset().mockResolvedValue(undefined as never);
});

describe("GeneralOnboardingWizard — step progression", () => {
  it("walks Welcome -> 4 questions -> Done, then submits and calls onComplete", async () => {
    const onComplete = vi.fn();
    const { container } = render(
      <GeneralOnboardingWizard studentProfile={studentProfile} onComplete={onComplete} />,
    );

    // Step 0: Welcome
    revealCurrentBubble(container);
    const start = await waitFor(() => screen.getByRole("button", { name: /let's get started/i }));
    fireEvent.click(start);

    // Steps 1-4: the four questions, in constants.ts order.
    await answerQuestion(container, "I learn by watching videos");
    expect(screen.getByText(stepCounter(3))).toBeInTheDocument();

    await answerQuestion(container, "Space and math puzzles");
    expect(screen.getByText(stepCounter(4))).toBeInTheDocument();

    await answerQuestion(container, "Explaining things clearly");
    expect(screen.getByText(stepCounter(5))).toBeInTheDocument();

    await answerQuestion(container, "Time management");

    // Step 5: Done
    revealCurrentBubble(container);
    await waitFor(() => expect(screen.getByText(/You're all set, Ada!/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /let's start learning/i }));

    await waitFor(() =>
      expect(completeMock).toHaveBeenCalledWith({
        student_id: "u1",
        name: "Ada",
        age: 10,
        grade: 6,
        learning_preferences: ["I learn by watching videos"],
        interests: ["Space and math puzzles"],
        strengths: ["Explaining things clearly"],
        weaknesses: ["Time management"],
      }),
    );
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("lets the student go back a question and preserves the typed answer", async () => {
    const { container } = render(
      <GeneralOnboardingWizard studentProfile={studentProfile} onComplete={vi.fn()} />,
    );
    revealCurrentBubble(container);
    fireEvent.click(await waitFor(() => screen.getByRole("button", { name: /let's get started/i })));

    await answerQuestion(container, "First answer");
    revealCurrentBubble(container);
    await waitFor(() => screen.getByRole("textbox"));

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    await waitFor(() => expect(screen.getByText(stepCounter(2))).toBeInTheDocument());
  });

  it("shows an error and stops submitting when the save fails", async () => {
    completeMock.mockRejectedValue(new Error("network"));
    const onComplete = vi.fn();
    const { container } = render(
      <GeneralOnboardingWizard studentProfile={studentProfile} onComplete={onComplete} />,
    );
    revealCurrentBubble(container);
    fireEvent.click(await waitFor(() => screen.getByRole("button", { name: /let's get started/i })));
    await answerQuestion(container, "a");
    await answerQuestion(container, "b");
    await answerQuestion(container, "c");
    await answerQuestion(container, "d");
    revealCurrentBubble(container);
    await waitFor(() => screen.getByRole("button", { name: /let's start learning/i }));

    fireEvent.click(screen.getByRole("button", { name: /let's start learning/i }));

    await waitFor(() =>
      expect(screen.getByText(/Failed to save your preferences/i)).toBeInTheDocument(),
    );
    expect(onComplete).not.toHaveBeenCalled();
  });
});
