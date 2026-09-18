import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { MetricMeta } from "@/features/admin/analytics/types";
import { diagnosticsFixture, metaFixture } from "@/test/fixtures/learningSignal";

import { DiagnosticsTable } from "../DiagnosticsTable";

/** metaFixture with PLC-06's review_rules blanked, as an out-of-sync registry would give. */
function metaWithoutRules(): MetricMeta[] {
  return metaFixture.map((m) =>
    m.metric_id === "PLC-06" ? { ...m, review_rules: null } : m,
  );
}

function rowFor(itemCode: string) {
  return screen
    .getAllByRole("row")
    .find((r) => within(r).queryByText(itemCode)) as HTMLElement;
}

describe("DiagnosticsTable", () => {
  it("shows payload.item_code rather than parsing entity_key", () => {
    render(<DiagnosticsTable rows={diagnosticsFixture} meta={metaFixture} />);

    expect(screen.getByText("Q-104")).toBeInTheDocument();
    // The composite key must not leak into the cell.
    expect(screen.queryByText(/CBSE\.G6\.MATH/)).not.toBeInTheDocument();
  });

  it("flags items using the thresholds from /meta", () => {
    render(<DiagnosticsTable rows={diagnosticsFixture} meta={metaFixture} />);

    // p = 0.97, above PLC-06's published p_ceiling of 0.95.
    expect(within(rowFor("Q-104")).getByText("Very High")).toBeInTheDocument();
    // p = 0.09, below p_floor of 0.15.
    expect(within(rowFor("Q-217")).getByText("Very Low")).toBeInTheDocument();
    // p = 0.58, inside the band.
    expect(within(rowFor("Q-091")).getByText("Normal")).toBeInTheDocument();
  });

  it("follows a threshold change in /meta without a code change", () => {
    const widened = metaFixture.map((m) =>
      m.metric_id === "PLC-06"
        ? { ...m, review_rules: { p_floor: 0.05, p_ceiling: 0.99, time_multiple: 2 } }
        : m,
    );
    render(<DiagnosticsTable rows={diagnosticsFixture} meta={widened} />);

    // Q-217 (p = 0.09) now sits inside the wider band.
    expect(within(rowFor("Q-217")).getByText("Normal")).toBeInTheDocument();
    // Q-104 clears the widened p_ceiling but still trips the time rule:
    // 168s median against a 45s expectation and time_multiple 2.
    expect(within(rowFor("Q-104")).getByText("High")).toBeInTheDocument();
  });

  it("renders no flag when /meta publishes no rules, rather than guessing", () => {
    render(<DiagnosticsTable rows={diagnosticsFixture} meta={metaWithoutRules()} />);

    // Silently falling back to the old hardcoded 0.15/0.95 would assert a
    // judgement the registry never made — the same class of lie as a false zero.
    for (const label of ["Very High", "Very Low", "Normal"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByText("Review")).not.toBeInTheDocument();
    // The rows themselves still render.
    expect(screen.getByText("Q-104")).toBeInTheDocument();
  });

  it("renders an empty state with no rows", () => {
    render(<DiagnosticsTable rows={[]} meta={metaFixture} />);
    expect(screen.getByText(/No item diagnostics for this range yet/i)).toBeInTheDocument();
  });
});
