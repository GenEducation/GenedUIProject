import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useActiveStep } from "../hooks";

// Step tops relative to the viewport; the test moves them to simulate scrolling.
let tops = [600, 1200, 1800, 2400];

function Steps() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useActiveStep(ref, 4);
  return (
    <div ref={ref}>
      <output>{active}</output>
      {tops.map((_, i) => (
        <div key={i} data-step={i} />
      ))}
    </div>
  );
}

function scrollTo(next: number[]) {
  tops = next;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("useActiveStep", () => {
  beforeEach(() => {
    tops = [600, 1200, 1800, 2400];
    vi.stubGlobal("innerHeight", 1000);
    // Run the frame straight away (returning 0, as if it has already been and gone).
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const i = Number(this.dataset.step ?? -1);
      return { top: i >= 0 ? tops[i] : 0 } as DOMRect;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("follows the last step past the middle of the screen, and holds the last one after it", () => {
    render(<Steps />);
    expect(screen.getByRole("status")).toHaveTextContent("0");
    scrollTo([-200, 400, 1000, 1600]);
    expect(screen.getByRole("status")).toHaveTextContent("1");
    // a fast flick straight past step 3 lands on 4
    scrollTo([-1900, -1300, -700, 300]);
    expect(screen.getByRole("status")).toHaveTextContent("3");
    // still in the reading room below step 4
    scrollTo([-2800, -2200, -1600, -600]);
    expect(screen.getByRole("status")).toHaveTextContent("3");
    // and back up
    scrollTo([-500, 100, 700, 1300]);
    expect(screen.getByRole("status")).toHaveTextContent("1");
  });
});
