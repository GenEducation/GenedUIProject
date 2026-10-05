import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

import { MIN_HOLD_MS, ParentLoader } from "../ParentLoader";

const base = {
  isVisible: true,
  isComplete: false,
  isHandoff: false,
  stage: "entry" as const,
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("ParentLoader", () => {
  it("announces the stage's status line", () => {
    render(<ParentLoader {...base} stage="signup" onFinished={vi.fn()} />);
    advance(50);
    expect(screen.getByRole("status")).toHaveTextContent("Creating your family account");
  });

  it("names the family once it's known", () => {
    render(
      <ParentLoader
        {...base}
        childrenList={[
          { id: "s1", name: "Aarav Sharma", avatar: "/a.png" },
          { id: "s2", name: "Priya Mehta", avatar: "/b.png" },
        ]}
        onFinished={vi.fn()}
      />,
    );
    advance(150);
    expect(screen.getByRole("status")).toHaveTextContent("Gathering Aarav & Priya's progress");
  });

  it("during a hand-off, navigates once the cap has been seen and never dismisses itself", () => {
    const onCelebrated = vi.fn();
    const onFinished = vi.fn();
    render(<ParentLoader {...base} isComplete isHandoff onCelebrated={onCelebrated} onFinished={onFinished} />);

    advance(MIN_HOLD_MS - 200);
    expect(onCelebrated).not.toHaveBeenCalled();
    advance(400);
    expect(onCelebrated).toHaveBeenCalledTimes(1);

    advance(10_000);
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("when the destination is ready, leaves only after the minimum hold", () => {
    const onFinished = vi.fn();
    const { rerender } = render(<ParentLoader {...base} onFinished={onFinished} />);
    advance(100);
    rerender(<ParentLoader {...base} isComplete onFinished={onFinished} />);

    advance(MIN_HOLD_MS - 300);
    expect(onFinished).not.toHaveBeenCalled();
    advance(600); // hold passes
    advance(400); // exit fade
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("never appears for a load that finishes within its appear delay", () => {
    const onFinished = vi.fn();
    const { rerender } = render(<ParentLoader {...base} appearDelayMs={200} onFinished={onFinished} />);
    advance(100);
    rerender(<ParentLoader {...base} appearDelayMs={200} isComplete onFinished={onFinished} />);
    advance(10);

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("says so when a wait runs long", () => {
    render(<ParentLoader {...base} onFinished={vi.fn()} />);
    advance(6500);
    expect(screen.getByRole("status")).toHaveTextContent("Still working, thanks for your patience");
  });
});
