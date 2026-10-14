import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

import { resetAnalyticsMetaCache } from "@/features/admin/analytics/analyticsService";
import { server } from "@/test/msw/server";
import { emptyAnalyticsHandlers } from "@/test/msw/handlers/analytics";

import { LearningSignalView } from "../LearningSignalView";

// recharts measures its container, and jsdom reports every box as 0×0, so the
// charts would never render children. Only the surrounding numbers matter here.
vi.mock("../charts", () => ({
  ActivationTrend: () => <div data-testid="activation-trend" />,
  TimeHistogram: () => <div data-testid="time-histogram" />,
  Gauge: ({ label }: { label: string }) => <div data-testid="gauge">{label}</div>,
}));

beforeEach(() => {
  // /meta is cached for the page's lifetime; without this the second test
  // would reuse the first's catalogue.
  resetAnalyticsMetaCache();
  localStorage.setItem("gened_auth_token", "test-token");
});

describe("LearningSignalView", () => {
  it("renders a suppressed metric as suppressed, never as a zero", async () => {
    render(<LearningSignalView />);

    await waitFor(() => expect(screen.getByText("Learning Quality")).toBeInTheDocument());

    // PLC-05/Hindi is suppressed in the fixtures.
    const rowEl = await screen.findByTestId("subject-Hindi");
    expect(within(rowEl).getByText("Suppressed")).toBeInTheDocument();
    expect(within(rowEl).queryByText("0%")).not.toBeInTheDocument();
    expect(rowEl.textContent).not.toMatch(/\b0%/);
  });

  it("renders ONB-05 as not instrumented instead of a derived breakdown", async () => {
    render(<LearningSignalView />);

    await waitFor(() =>
      expect(screen.getByText(/Where students stop/i)).toBeInTheDocument(),
    );

    // This panel used to show three bars, the first computed as
    // 1 − completion − abandonment. That number came from arithmetic, not the API.
    expect(screen.getAllByText("Not instrumented").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Per-step events aren't written by the merged onboarding form/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Before starting")).not.toBeInTheDocument();
  });

  it("labels placement completion time as median and p90, never as an average", async () => {
    render(<LearningSignalView />);

    await waitFor(() => expect(screen.getByText("Learning Quality")).toBeInTheDocument());
    expect(screen.getByText("Median")).toBeInTheDocument();
    expect(screen.getByText("90% complete within")).toBeInTheDocument();
    // PLC-04 has no honest single scalar; calling it an average would be a lie.
    expect(screen.queryByText(/average/i)).not.toBeInTheDocument();
  });

  it("renders explicit empty states — not zeros — when every endpoint is empty", async () => {
    server.use(...emptyAnalyticsHandlers);
    const { container } = render(<LearningSignalView />);

    await waitFor(() =>
      expect(
        screen.getByText(/No cohorts have completed the journey window yet/i),
      ).toBeInTheDocument(),
    );

    expect(screen.getByText(/No item diagnostics for this range yet/i)).toBeInTheDocument();

    // The specific failure this dashboard must avoid: a page of confident zeros.
    expect(container.textContent).not.toMatch(/\b0%/);
    expect(container.textContent).not.toMatch(/NaN/);
  });
});
