import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
  it("renders the four headline journey numbers", async () => {
    render(<LearningSignalView />);

    await waitFor(() => expect(screen.getByText("Acquisition")).toBeInTheDocument());
    expect(screen.getByText("12,482")).toBeInTheDocument();
    expect(screen.getByText("10,934")).toBeInTheDocument();
    expect(screen.getByText("8,762")).toBeInTheDocument();
    expect(screen.getByText("6,821")).toBeInTheDocument();
  });

  it("shows the drop-off between stages inline instead of a separate panel", async () => {
    render(<LearningSignalView />);

    await waitFor(() => expect(screen.getByText("Acquisition")).toBeInTheDocument());
    // 12,482 -> 10,934 acquisition-to-onboarding drop, computed from the
    // headline counts rather than a second "Where are students dropping off?"
    // panel restating the same numbers as a chart.
    expect(screen.getByText(/1,548 lost \(12\.4%\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Where are students dropping off/i)).not.toBeInTheDocument();
  });

  it("discloses that immature cohorts were excluded rather than counting them", async () => {
    render(<LearningSignalView />);
    await waitFor(() =>
      expect(screen.getByText(/3 recent days still catching up/i)).toBeInTheDocument(),
    );
  });

  it("renders a suppressed metric as suppressed, never as a zero", async () => {
    render(<LearningSignalView />);

    await waitFor(() => expect(screen.getByText("Learning Quality")).toBeInTheDocument());

    // PLC-05/Hindi is suppressed in the fixtures.
    const rowEl = await screen.findByTestId("subject-Hindi");
    expect(within(rowEl).getByText("Suppressed")).toBeInTheDocument();
    expect(within(rowEl).queryByText("0%")).not.toBeInTheDocument();
    expect(rowEl.textContent).not.toMatch(/\b0%/);
  });

  it("flags a low-confidence metric while still showing its number", async () => {
    render(<LearningSignalView />);

    // Scoped by test id: the diagnostics table also has an English row.
    const rowEl = await screen.findByTestId("subject-English");
    expect(within(rowEl).getByText("81%")).toBeInTheDocument();
    expect(within(rowEl).getByText(/low confidence/i)).toBeInTheDocument();
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

  it("names not-instrumented metrics in the health strip instead of scoring them zero", async () => {
    const user = userEvent.setup();
    render(<LearningSignalView />);

    const details = await screen.findByRole("button", { name: /view details/i });
    expect(screen.getByText(/2 metrics unavailable/i)).toBeInTheDocument();

    await user.click(details);
    expect(await screen.findByText("ACQ-02")).toBeInTheDocument();
    expect(screen.getByText(/No sign-in event is emitted/i)).toBeInTheDocument();
    // RETIRED metrics get no panel and no health entry at all.
    expect(screen.queryByText("ONB-02")).not.toBeInTheDocument();
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
