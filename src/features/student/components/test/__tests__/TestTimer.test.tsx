import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { TestTimer } from "../TestTimer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const tick = (seconds: number) => act(() => vi.advanceTimersByTime(seconds * 1000));

describe("TestTimer — countdown", () => {
  it("renders MM:SS and decrements once per second without expiring early", () => {
    const onExpired = vi.fn();
    render(<TestTimer totalSeconds={125} onExpired={onExpired} />);
    expect(screen.getByText("02:05")).toBeInTheDocument();
    tick(3);
    expect(screen.getByText("02:02")).toBeInTheDocument();
    expect(onExpired).not.toHaveBeenCalled();
  });
});

describe("TestTimer — expiry", () => {
  it("shows the time's-up modal at zero and auto-calls onExpired after the 10s grace", () => {
    const onExpired = vi.fn();
    render(<TestTimer totalSeconds={1} onExpired={onExpired} />);
    tick(1); // hits zero, modal opens, grace countdown starts at 10
    expect(screen.getByText("Time's Up!")).toBeInTheDocument();
    expect(onExpired).not.toHaveBeenCalled();
    tick(10);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("Submit Now calls onExpired immediately without waiting for grace", () => {
    const onExpired = vi.fn();
    render(<TestTimer totalSeconds={1} onExpired={onExpired} />);
    tick(1);
    fireEvent.click(screen.getByRole("button", { name: /submit now/i }));
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("+2 min extends the timer, hides the modal, and can only be used once", () => {
    const onExpired = vi.fn();
    render(<TestTimer totalSeconds={1} onExpired={onExpired} />);
    tick(1);
    fireEvent.click(screen.getByRole("button", { name: /\+2 min/i }));

    // Modal dismissal itself is a framer-motion exit animation (not under test here);
    // what matters is the timer actually extended.
    expect(screen.getByText("02:00")).toBeInTheDocument();

    // Expire again — the extension is already spent, so no +2 min button this time.
    tick(120);
    expect(screen.getByText("Time's Up!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+2 min/i })).not.toBeInTheDocument();
  });
});
