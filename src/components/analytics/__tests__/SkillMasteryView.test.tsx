import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// SkillMasteryView is lazy-loaded only from StudentAnalyticsDashboard's "skill" tab,
// which the app only ever renders with mode="parent" (from ParentHome.tsx) — no
// student-portal route reaches it.
import { SkillMasteryView } from "../SkillMasteryView";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { autoResetStore } from "@/test/helpers/resetStores";

autoResetStore(useAnalyticsStore);

beforeEach(() => {
  useAnalyticsStore.setState({
    cgScores: [{ cg_id: "cg1", cg_name: "Algebra", avg_mastery: 0.72 }],
    skillTree: [
      {
        cg_id: "cg1",
        cg_name: "Algebra",
        avg_mastery: 0.72,
        concepts: [
          {
            c_id: "c1",
            c_name: "Linear Equations",
            los: [{ skill_name: "Solve for x", mastery_level: 0.8, assessment_count: 3 }],
          },
        ],
      },
      { cg_id: "cg2", cg_name: "Geometry", avg_mastery: 0, concepts: [] },
    ],
  });
});

describe("SkillMasteryView", () => {
  it("renders each competency group with its mastery percentage", () => {
    render(<SkillMasteryView />);
    expect(screen.getByText("Algebra")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("locks a competency group with zero mastery instead of letting it expand", () => {
    render(<SkillMasteryView />);
    expect(screen.getByText("Geometry")).toBeInTheDocument();
    // Clicking a 0%-mastery group must not reveal any concepts (guarded in the handler).
    fireEvent.click(screen.getByText("Geometry"));
    expect(screen.queryByText("Linear Equations")).not.toBeInTheDocument();
  });

  it("expands a competency group to reveal its concepts and learning objectives", () => {
    render(<SkillMasteryView />);
    fireEvent.click(screen.getByText("Algebra"));

    expect(screen.getByText("Linear Equations")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Linear Equations"));
    expect(screen.getByText("Solve for x")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("reveals a learning objective's justification on demand", () => {
    render(<SkillMasteryView />);
    fireEvent.click(screen.getByText("Algebra"));
    fireEvent.click(screen.getByText("Linear Equations"));

    fireEvent.click(screen.getByText("See why"));
    expect(
      screen.getByText(/Mastery based on consistent performance in recent practice sessions/),
    ).toBeInTheDocument();
  });
});
