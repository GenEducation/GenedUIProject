import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlacementStepper } from "../PlacementStepper";

function checkmarkCount(container: HTMLElement): number {
  return container.querySelectorAll('img[src="/placement/icons/step-completed.png"]').length;
}

describe("PlacementStepper", () => {
  it("at step 1: only the first circle is active, the rest show plain numbers", () => {
    const { container } = render(<PlacementStepper currentStep={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    // No step is yet "done", so no checkmark image should be present.
    expect(checkmarkCount(container)).toBe(0);
  });

  it("at step 2: the first step is done (checkmark), the second is active, the third is a plain number", () => {
    const { container } = render(<PlacementStepper currentStep={2} />);
    expect(checkmarkCount(container)).toBe(1);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("at step 3: the first two steps are done (checkmarks), the third is active with its own number", () => {
    const { container } = render(<PlacementStepper currentStep={3} />);
    expect(checkmarkCount(container)).toBe(2);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("labels every step Start, Take Test, Complete", () => {
    render(<PlacementStepper currentStep={1} />);
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("Take Test")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });
});
