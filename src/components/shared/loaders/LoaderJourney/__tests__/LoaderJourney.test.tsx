import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { LoaderJourney } from "../LoaderJourney";

describe("LoaderJourney handoff", () => {
  it("fires onCelebrated only after the trophy has held for the minimum celebration duration, and suppresses onFinished", async () => {
    const onCelebrated = vi.fn();
    const onFinished = vi.fn();

    const { rerender } = render(
      <LoaderJourney isVisible isComplete={false} isHandoff onCelebrated={onCelebrated} onFinished={onFinished} />,
    );

    rerender(
      <LoaderJourney isVisible isComplete isHandoff onCelebrated={onCelebrated} onFinished={onFinished} />,
    );

    expect(onCelebrated).not.toHaveBeenCalled();

    await waitFor(() => expect(onCelebrated).toHaveBeenCalledTimes(1), { timeout: 4000 });
    // Handoff mode: destination owns dismissal, so onFinished must not fire.
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("self-dismisses via onFinished when not in a handoff", async () => {
    const onFinished = vi.fn();

    const { rerender } = render(<LoaderJourney isVisible isComplete={false} onFinished={onFinished} />);

    rerender(<LoaderJourney isVisible isComplete onFinished={onFinished} />);

    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1), { timeout: 4000 });
  });
});
