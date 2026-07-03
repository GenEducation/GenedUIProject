import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// MetricCard is only mounted inside StudentAnalyticsDashboard, which the app only ever
// renders with mode="parent" (from ParentHome.tsx) — no student-portal route reaches it.
import { MetricCard } from "../MetricCard";

describe("MetricCard", () => {
  it("renders the label and value", () => {
    render(<MetricCard label="Overall Score" value={87} />);
    expect(screen.getByText("Overall Score")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("renders a subValue and status badge when provided", () => {
    render(<MetricCard label="Skill Index" value={72} subValue="/ 100" status="On Track" />);
    expect(screen.getByText("/ 100")).toBeInTheDocument();
    expect(screen.getByText("On Track")).toBeInTheDocument();
  });

  it("clamps the progress bar width between 0 and 100", () => {
    const { container } = render(
      <MetricCard label="Coverage" value="150%" showProgress progress={150} />,
    );
    const fill = container.querySelector(".h-full.transition-all") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("renders segmented progress with per-segment widths", () => {
    const { container } = render(
      <MetricCard
        label="Distribution"
        value="—"
        showProgress
        isSegmented
        segments={[{ color: "#059669", width: 60 }, { color: "#D97706", width: 40 }]}
      />,
    );
    const segments = container.querySelectorAll('[style*="background-color"]');
    expect(segments).toHaveLength(2);
  });

  it("shows an up trend and a down trend with the right styling", () => {
    const { rerender, container } = render(
      <MetricCard label="Trend" value={1} trend={{ value: "+5%", isPositive: true }} />,
    );
    expect(screen.getByText("+5%")).toBeInTheDocument();
    expect(container.querySelector(".text-\\[\\#059669\\]")).toBeInTheDocument();

    rerender(<MetricCard label="Trend" value={1} trend={{ value: "-5%", isPositive: false }} />);
    expect(screen.getByText("-5%")).toBeInTheDocument();
    expect(container.querySelector(".text-red-500")).toBeInTheDocument();
  });
});
