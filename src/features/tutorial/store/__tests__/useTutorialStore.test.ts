import { describe, it, expect, beforeEach } from "vitest";
import { useTutorialStore } from "../useTutorialStore";

const celebrationArmed = () => {
  const { hasEnded, hasDismissedCelebration } = useTutorialStore.getState();
  return hasEnded && !hasDismissedCelebration;
};

describe("useTutorialStore — the confetti after the tour", () => {
  beforeEach(() => useTutorialStore.setState({ isActive: false, hasEnded: false, hasDismissedCelebration: true, celebrateOnEnd: false }));

  it("arms it once a new student's onboarding tour is watched to the end", () => {
    useTutorialStore.getState().startTutorial({ celebrate: true });
    useTutorialStore.getState().completeTutorial();
    expect(celebrationArmed()).toBe(true);
  });

  it("never arms it for a replay from Profile, even when started straight from a click", () => {
    // Profile wires the button as `() => startTutorial()`; a bare handler would pass the click event.
    useTutorialStore.getState().startTutorial({ nativeEvent: {} } as never);
    useTutorialStore.getState().completeTutorial();
    expect(celebrationArmed()).toBe(false);

    useTutorialStore.getState().startTutorial();
    useTutorialStore.getState().completeTutorial();
    expect(celebrationArmed()).toBe(false);
  });
});
