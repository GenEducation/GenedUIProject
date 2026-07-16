import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { UnitCard } from "../UnitCard";

// UnitCard is only ever mounted via ChapterMasteryView <- StudentAnalyticsDashboard,
// and that dashboard is only ever rendered with mode="parent" (from ParentHome.tsx) —
// there is no student-portal route that reaches it. ChapterMasteryView always passes
// hideActions={mode === "parent"}, so in the app today hideActions is ALWAYS true;
// the "actions visible" props below exercise UnitCard's own contract but are not a
// path any real screen currently takes.
const baseProps = {
  unitId: "DOC-1",
  title: "Photosynthesis",
  mastery: 65,
  status: "DEVELOPING" as const,
  coverage: 40,
  sessions: 3,
};

describe("UnitCard", () => {
  it("renders title, mastery, and coverage", () => {
    render(<UnitCard {...baseProps} />);
    expect(screen.getByText("Photosynthesis")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("DEVELOPING")).toBeInTheDocument();
  });

  it("hides action buttons when hideActions is set — the only state real screens render today", () => {
    render(<UnitCard {...baseProps} hideActions />);
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /take test/i })).not.toBeInTheDocument();
  });

  it("shows 'Start' for zero mastery and 'Continue' otherwise (hideActions=false — unreached today)", () => {
    const { rerender } = render(<UnitCard {...baseProps} mastery={0} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();

    rerender(<UnitCard {...baseProps} mastery={40} />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("invokes onAction and onTestAction independently (hideActions=false — unreached today)", () => {
    const onAction = vi.fn();
    const onTestAction = vi.fn();
    render(<UnitCard {...baseProps} onAction={onAction} onTestAction={onTestAction} />);

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onTestAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /take test/i }));
    expect(onTestAction).toHaveBeenCalledTimes(1);
  });

  it("renders a locked placeholder and hides the real content when isLocked", () => {
    render(<UnitCard {...baseProps} isLocked prerequisite="Chapter 2" />);
    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(screen.getByText(/Prerequisite: Chapter 2/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
  });
});
