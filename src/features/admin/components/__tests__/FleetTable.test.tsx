/**
 * Phase 4: the mode-independent fleet table.
 *
 * The fixtures mirror the backend suite's ten states, because the thing worth
 * protecting is that each of them RENDERS DISTINCTLY. A UI that collapses two of
 * them is not caught by any backend test — the API can be perfectly correct
 * while the screen shows a stale PASS as healthy.
 *
 * The other half of this file is about the data flow: every control must send a
 * query. A client-side filter would search only the visible page, and an
 * operator would conclude a device does not exist.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";

import { FleetTable } from "../FleetTable";
import type {
  FleetDeviceRow,
  FleetStats,
  PaginatedFleet,
} from "../../devices/types";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const listFleetRegistryDevices = vi.hoisted(() => vi.fn());
const getFleetDeviceStats = vi.hoisted(() => vi.fn());
vi.mock("../../adminService", () => ({
  listFleetRegistryDevices,
  getFleetDeviceStats,
}));

const NOW = Date.now();
const minutesAgo = (n: number) => new Date(NOW - n * 60_000).toISOString();

/** The server's own windows, as the endpoint publishes them. */
const REPORT_INTERVAL = 3600;
const FRESH_AFTER = REPORT_INTERVAL * 3;

function row(o: Partial<FleetDeviceRow>): FleetDeviceRow {
  return {
    record: "CANONICAL",
    fleet_key: "serial:1000000000000002",
    id: "11111111-1111-1111-1111-111111111111",
    serial: "1000000000000002",
    reported_device_id: "gened-mk2",
    lab_hardware_id: null,
    derived_device_key: "DEV-0000-0002",
    label: null,
    device_model: "Raspberry Pi 4 Model B",
    last_reported_mode: "PERSONAL",
    provenance: "SELF_REGISTERED",
    connectivity: { state: "UNKNOWN", source: "NONE", reason: "no_presence_channel" },
    last_seen_at: minutesAgo(5),
    last_seen_source: "HEALTH_POST",
    last_seen_age_seconds: 300,
    first_seen_at: minutesAgo(5000),
    diagnostic_freshness: "FRESH",
    diagnostic_verdict: "PASS",
    report_age_seconds: 300,
    received_at: minutesAgo(5),
    findings_total: 0,
    tally: { PASS: 32 },
    needs_attention: false,
    attention_reasons: [],
    fresh_after_seconds: FRESH_AFTER,
    report_interval_seconds: REPORT_INTERVAL,
    firmware_version: "7c35e28",
    tool_version: "1.2.0",
    deployed_version: "abc1234",
    hostname: "gened-pi",
    lab: null,
    revoked: false,
    revoked_at: null,
    ...o,
  };
}

// ── The ten states ─────────────────────────────────────────────

const PRE_PROVISIONED = row({
  fleet_key: "serial:1000000000000001",
  serial: "1000000000000001",
  reported_device_id: null,
  derived_device_key: "DEV-0000-0001",
  label: "Warehouse spare",
  provenance: "PRE_PROVISIONED",
  last_reported_mode: null,
  last_seen_at: null,
  last_seen_source: null,
  last_seen_age_seconds: null,
  diagnostic_freshness: "NEVER_REPORTED",
  diagnostic_verdict: null,
  report_age_seconds: null,
  received_at: null,
  tally: {},
  firmware_version: null,
  tool_version: null,
  deployed_version: null,
  hostname: null,
});

const MODERN_HEALTHY = row({});

const MODERN_FAIL = row({
  fleet_key: "serial:1000000000000003",
  serial: "1000000000000003",
  diagnostic_verdict: "FAIL",
  findings_total: 1,
  tally: { PASS: 30, FAIL: 1 },
  needs_attention: true,
  attention_reasons: ["diagnostic_fail"],
});

const STALE_DIAGNOSTIC = row({
  fleet_key: "serial:1000000000000004",
  serial: "1000000000000004",
  diagnostic_verdict: "PASS",
  diagnostic_freshness: "STALE",
  report_age_seconds: FRESH_AFTER + 60,
  received_at: minutesAgo(181),
  last_seen_at: minutesAgo(181),
  needs_attention: true,
  attention_reasons: ["diagnostic_stale"],
});

const OFFLINE_BUT_FRESH = row({
  fleet_key: "serial:1000000000000005",
  serial: "1000000000000005",
  connectivity: { state: "OFFLINE", source: "MQTT_STATUS", reason: null },
  diagnostic_verdict: "PASS",
  diagnostic_freshness: "FRESH",
});

const UNKNOWN_CONNECTIVITY = row({
  fleet_key: "serial:1000000000000006",
  serial: "1000000000000006",
  connectivity: { state: "UNKNOWN", source: "MQTT_STATUS", reason: "no_status_seen" },
});

const LEGACY_LAB = row({
  record: "LEGACY_LAB",
  fleet_key: "lab:aaaaaaaa-0000-0000-0000-000000000001",
  id: null,
  serial: null,
  reported_device_id: null,
  lab_hardware_id: "legacy-lab-unit",
  derived_device_key: null,
  label: "Desk 7",
  last_reported_mode: null,
  provenance: null,
  connectivity: {
    state: "ONLINE",
    source: "LAB_WS",
    reason: null,
    heartbeat_age_seconds: 10,
    grace_seconds: 90,
  },
  last_seen_source: "LAB_WS",
  diagnostic_freshness: "NEVER_REPORTED",
  diagnostic_verdict: null,
  report_age_seconds: null,
  received_at: null,
  tally: {},
  firmware_version: "1.4.2",
  tool_version: null,
  hostname: null,
  lab: {
    lab_device_id: "aaaaaaaa-0000-0000-0000-000000000001",
    device_label: "Desk 7",
    hardware_id: "legacy-lab-unit",
    lab_id: "l1",
    partner_id: "p1",
    health_status: "ONLINE",
    last_heartbeat_at: minutesAgo(0),
    is_spare: false,
    revoked_at: null,
  },
});

const LEGACY_PERSONAL = row({
  record: "LEGACY_PERSONAL",
  fleet_key: "health:DEV-8888-8888",
  id: null,
  serial: null,
  reported_device_id: "DEV-8888-8888",
  derived_device_key: null,
  label: null,
  last_reported_mode: null,
  provenance: null,
  connectivity: { state: "ONLINE", source: "MQTT_STATUS", reason: null },
  last_seen_source: "MQTT_HEALTH",
  diagnostic_freshness: "NEVER_REPORTED",
  diagnostic_verdict: null,
  report_age_seconds: null,
  received_at: null,
  tally: {},
  firmware_version: null,
  tool_version: null,
  hostname: null,
  self_test_status: "service_required",
  self_test_failed: ["speaker"],
});

const DUAL = row({
  fleet_key: "serial:1000000000000007",
  serial: "1000000000000007",
  reported_device_id: "gened-mk2",
  lab_hardware_id: "gened-mk2",
  label: "Desk 2",
  last_reported_mode: "SCHOOL_LAB",
  provenance: "ENROLLED",
  connectivity: {
    state: "ONLINE",
    source: "LAB_WS",
    reason: null,
    heartbeat_age_seconds: 5,
    grace_seconds: 90,
  },
  last_seen_source: "LAB_WS",
  diagnostic_verdict: "WARN",
  tally: { PASS: 30, WARN: 1 },
  lab: {
    lab_device_id: "bbbbbbbb-0000-0000-0000-000000000002",
    device_label: "Desk 2",
    hardware_id: "gened-mk2",
    lab_id: "l1",
    partner_id: "p1",
    health_status: "ONLINE",
    last_heartbeat_at: minutesAgo(0),
    is_spare: false,
    revoked_at: null,
  },
});

const REVOKED = row({
  fleet_key: "serial:1000000000000008",
  serial: "1000000000000008",
  reported_device_id: "gened-mk4",
  label: "Desk 11",
  provenance: "ENROLLED",
  diagnostic_freshness: "NEVER_REPORTED",
  diagnostic_verdict: null,
  report_age_seconds: null,
  received_at: null,
  tally: {},
  firmware_version: null,
  tool_version: null,
  hostname: null,
  revoked: true,
  revoked_at: minutesAgo(1440),
});

const ALL_ROWS = [
  MODERN_FAIL,
  STALE_DIAGNOSTIC,
  PRE_PROVISIONED,
  MODERN_HEALTHY,
  OFFLINE_BUT_FRESH,
  UNKNOWN_CONNECTIVITY,
  LEGACY_LAB,
  LEGACY_PERSONAL,
  DUAL,
  REVOKED,
];

const STATS: FleetStats = {
  total: 11,
  by_record: { CANONICAL: 8, LEGACY_LAB: 2, LEGACY_PERSONAL: 1 },
  by_provenance: { PRE_PROVISIONED: 1, SELF_REGISTERED: 5, ENROLLED: 2, UNREGISTERED: 3 },
  by_connectivity: { ONLINE: 3, OFFLINE: 1, UNKNOWN: 7 },
  by_freshness: { FRESH: 5, STALE: 1, NEVER_REPORTED: 5 },
  by_verdict: { PASS: 4, WARN: 1, FAIL: 1, NONE: 5 },
  by_mode: { PERSONAL: 5, SCHOOL_LAB: 1, UNREPORTED: 5 },
  needs_attention: 2,
  by_attention_reason: { diagnostic_fail: 1, diagnostic_stale: 1 },
  revoked: 2,
  truncated: false,
  fresh_after_seconds: FRESH_AFTER,
  report_interval_seconds: REPORT_INTERVAL,
};

function page(items: FleetDeviceRow[], o: Partial<PaginatedFleet> = {}): PaginatedFleet {
  return {
    items,
    total: items.length,
    page: 1,
    page_size: 25,
    sort: "attention",
    truncated: false,
    fresh_after_seconds: FRESH_AFTER,
    report_interval_seconds: REPORT_INTERVAL,
    ...o,
  };
}

/** The query object from the most recent call. */
const lastQuery = () =>
  listFleetRegistryDevices.mock.calls[listFleetRegistryDevices.mock.calls.length - 1][0];

const cells = (key: string) =>
  within(document.querySelector(`[data-fleet-row="${key}"]`) as HTMLElement);

/**
 * Drive a shared `Select`.
 *
 * It is a popover button, not a native `<select>`, so `fireEvent.change` on the
 * trigger silently does nothing and every assertion downstream passes or fails
 * for the wrong reason. The panel portals under `<body>` and its items carry
 * `role="option"`, which is also how we avoid matching an option label against
 * identical text in a table cell — "FAIL" appears as both.
 */
async function choose(ariaLabel: string, optionLabel: string) {
  // Addressed by role: the open panel's listbox carries the SAME aria-label as
  // its trigger, so a plain getByLabelText becomes ambiguous the moment one
  // select has been opened — and then breaks only on the second interaction.
  fireEvent.click(screen.getByRole("combobox", { name: ariaLabel }));
  const options = await screen.findAllByRole("option");
  const match = options.find((o) => o.textContent?.trim() === optionLabel);
  if (!match) {
    throw new Error(
      `no option "${optionLabel}" in ${ariaLabel}; saw: ` +
        options.map((o) => o.textContent?.trim()).join(" | "),
    );
  }
  fireEvent.click(match);
}

/** No attention chips at all — checked structurally, not by matching an em dash,
 *  which also renders for an absent provenance in the same row. */
function expectNoAttention(key: string) {
  expect(
    document.querySelectorAll(`[data-fleet-row="${key}"] [data-attention-reason]`),
  ).toHaveLength(0);
}

beforeEach(() => {
  vi.clearAllMocks();
  listFleetRegistryDevices.mockResolvedValue(page(ALL_ROWS));
  getFleetDeviceStats.mockResolvedValue(STATS);
});

async function renderFleet() {
  render(<FleetTable />);
  await waitFor(() => expect(listFleetRegistryDevices).toHaveBeenCalled());
  await screen.findByText(/Showing 1/);
}

// ── 1. Each state renders distinctly ──────────────────────────

describe("the ten fleet states", () => {
  it("shows a pre-provisioned device as awaiting contact, not as healthy", async () => {
    await renderFleet();
    const cell = cells("serial:1000000000000001");

    expect(cell.getByText("Warehouse spare")).toBeInTheDocument();
    expect(cell.getByText("Pre-registered")).toBeInTheDocument();
    expect(cell.getByText("No report yet")).toBeInTheDocument();
    expect(cell.getByLabelText("Data age: NEVER_REPORTED")).toBeInTheDocument();
    // Never heard from, and the row says so instead of showing a stale date.
    expect(cell.getByText("never")).toBeInTheDocument();
    // A device still in its box is not a device that has gone silent.
    expect(cell.queryByText(/A check failed/)).not.toBeInTheDocument();
  });

  it("shows a healthy modern device as fresh and passing", async () => {
    await renderFleet();
    const cell = cells("serial:1000000000000002");

    expect(cell.getByLabelText("Verdict: PASS")).toBeInTheDocument();
    expect(cell.getByLabelText("Data age: FRESH")).toBeInTheDocument();
    expect(cell.getByText("PERSONAL")).toBeInTheDocument();
    expect(cell.getByText("7c35e28")).toBeInTheDocument();
  });

  it("names the reason a failing device needs attention", async () => {
    await renderFleet();
    const cell = cells("serial:1000000000000003");

    expect(cell.getByLabelText("Verdict: FAIL")).toBeInTheDocument();
    expect(cell.getByText("A check failed")).toBeInTheDocument();
  });

  it("shows a stale diagnostic as stale even though the verdict passed", async () => {
    // The pair a single health light destroys: the device said it was fine, and
    // that statement is now older than three reporting intervals.
    await renderFleet();
    const cell = cells("serial:1000000000000004");

    expect(cell.getByLabelText("Verdict: PASS")).toBeInTheDocument();
    expect(cell.getByLabelText("Data age: STALE")).toBeInTheDocument();
    expect(cell.getByText("Diagnostic data has aged out")).toBeInTheDocument();
  });

  it("shows offline and fresh at the same time, as two separate facts", async () => {
    await renderFleet();
    const cell = cells("serial:1000000000000005");

    expect(cell.getByLabelText("Connectivity: OFFLINE")).toBeInTheDocument();
    expect(cell.getByLabelText("Data age: FRESH")).toBeInTheDocument();
    expect(cell.getByLabelText("Verdict: PASS")).toBeInTheDocument();
    // Unreachable is not a hardware fault.
    expectNoAttention("serial:1000000000000005");
  });

  it("distinguishes the two causes of UNKNOWN connectivity", async () => {
    await renderFleet();

    const noChannel = cells("serial:1000000000000002").getByLabelText(
      "Connectivity: UNKNOWN",
    );
    expect(noChannel.getAttribute("title")).toMatch(/no live connection channel/i);
    expect(cells("serial:1000000000000002").getByText("no presence channel")).toBeInTheDocument();

    const noStatus = cells("serial:1000000000000006").getByLabelText(
      "Connectivity: UNKNOWN",
    );
    expect(noStatus.getAttribute("title")).toMatch(/no connection status has been seen/i);
  });

  it("shows a legacy Lab device with its real presence channel and no serial", async () => {
    await renderFleet();
    const cell = cells("lab:aaaaaaaa-0000-0000-0000-000000000001");

    expect(cell.getByText("Desk 7")).toBeInTheDocument();
    // No serial, stated as such rather than filled in from a mutable alias.
    expect(cell.getByText("no serial yet")).toBeInTheDocument();
    expect(cell.getByText(/Lab only/)).toBeInTheDocument();
    expect(cell.getByLabelText("Connectivity: ONLINE")).toBeInTheDocument();
    // Twice, and both are meant: the transport that proved it is reachable, and
    // the transport that produced its last_seen. An operator cannot read "40
    // minutes ago" without knowing which channel said so.
    expect(cell.getAllByText("LAB_WS")).toHaveLength(2);
    // Never having reported gened-health is firmware age, not a fault.
    expectNoAttention("lab:aaaaaaaa-0000-0000-0000-000000000001");
  });

  it("explains WHY a legacy row has no serial rather than just flagging it", async () => {
    await renderFleet();
    const cell = cells("health:DEV-8888-8888");

    expect(cell.getByText(/MQTT only/)).toBeInTheDocument();
    expect(cell.getByText("no serial yet").getAttribute("title")).toMatch(
      /DEVICE_SERIAL rather than the SoC value/,
    );
  });

  it("shows a dual modern-and-legacy device once, with its lab context", async () => {
    await renderFleet();

    expect(
      document.querySelectorAll('[data-fleet-row="serial:1000000000000007"]'),
    ).toHaveLength(1);
    const cell = cells("serial:1000000000000007");
    expect(cell.getByText("SCHOOL_LAB")).toBeInTheDocument();
    expect(cell.getByLabelText("Connectivity: ONLINE")).toBeInTheDocument();
    // WARN is visible but does not demand attention.
    expect(cell.getByLabelText("Verdict: WARN")).toBeInTheDocument();
    expectNoAttention("serial:1000000000000007");
  });

  it("keeps a canonical device visible after its enrollment is revoked", async () => {
    // The asymmetry is the point of the registry: the hardware record outlives
    // the tenancy, so partner churn cannot delete our inventory.
    await renderFleet();
    const cell = cells("serial:1000000000000008");

    expect(cell.getByText("Enrollment revoked")).toBeInTheDocument();
    expect(cell.getByText("Desk 11")).toBeInTheDocument();
  });

  it("renders every fixture as exactly one row", async () => {
    await renderFleet();
    expect(document.querySelectorAll("[data-fleet-row]")).toHaveLength(ALL_ROWS.length);
  });
});

// ── 2. No local thresholds, no local derivation ───────────────

describe("the client decides nothing", () => {
  it("names the cadence from the server's own interval", async () => {
    await renderFleet();
    expect(screen.getByText(/Expected hourly/)).toBeInTheDocument();
  });

  it("follows the server when the cadence changes", async () => {
    // The Lab surface hardcoded 10 minutes against a 15-minute server and the
    // two disagreed on screen. Retuning the backend must move this text.
    listFleetRegistryDevices.mockResolvedValue(
      page(ALL_ROWS, { report_interval_seconds: 1800, fresh_after_seconds: 5400 }),
    );
    await renderFleet();

    expect(screen.getByText(/Expected every 30 min/)).toBeInTheDocument();
    expect(screen.queryByText(/Expected hourly/)).not.toBeInTheDocument();
  });

  it("renders the server's freshness label rather than recomputing from age", async () => {
    // A row the server calls FRESH stays FRESH even with an age past the window,
    // because the server owns the decision. If the client were deriving it, this
    // row would flip to STALE and the two surfaces could disagree.
    const contradictory = row({
      fleet_key: "serial:9000000000000001",
      serial: "9000000000000001",
      diagnostic_freshness: "FRESH",
      report_age_seconds: FRESH_AFTER * 10,
      received_at: minutesAgo(3000),
    });
    listFleetRegistryDevices.mockResolvedValue(page([contradictory]));
    await renderFleet();

    expect(
      cells("serial:9000000000000001").getByLabelText("Data age: FRESH"),
    ).toBeInTheDocument();
  });

  it("never turns a diagnostic age into a connectivity claim", async () => {
    await renderFleet();

    // The freshest report on screen, with no presence transport. It must still
    // read UNKNOWN -- a report says when a device SPOKE, not whether it is
    // reachable now.
    const cell = cells("serial:1000000000000002");
    expect(cell.getByLabelText("Data age: FRESH")).toBeInTheDocument();
    expect(cell.getByLabelText("Connectivity: UNKNOWN")).toBeInTheDocument();
    expect(cell.queryByLabelText("Connectivity: OFFLINE")).not.toBeInTheDocument();
  });

  it("never renders UNKNOWN or STALE with the healthy colour", async () => {
    await renderFleet();
    const healthy = "#059F6D";

    for (const label of [
      "Connectivity: UNKNOWN",
      "Data age: STALE",
      "Data age: NEVER_REPORTED",
    ]) {
      for (const el of screen.queryAllByLabelText(label)) {
        expect(el.className).not.toContain(healthy);
        expect(el.className).not.toContain("emerald");
      }
    }
  });

  it("does not infer a mode from which table a record came from", async () => {
    await renderFleet();
    // A Lab enrollment is obviously a lab device and still has no REPORTED mode.
    const cell = cells("lab:aaaaaaaa-0000-0000-0000-000000000001");
    const mode = cell.getByText("not reported");
    expect(mode.getAttribute("title")).toMatch(/never inferred/i);
  });
});

// ── 3. Every control is a server query ────────────────────────

describe("server-driven controls", () => {
  it("sends the default query on mount", async () => {
    await renderFleet();
    expect(lastQuery()).toMatchObject({
      sort: "attention",
      page: 1,
      include_revoked: false,
    });
    expect(lastQuery().q).toBeUndefined();
  });

  it("sends the search term instead of filtering the page", async () => {
    await renderFleet();
    fireEvent.change(screen.getByLabelText("Search the fleet"), {
      target: { value: "gened-mk2" },
    });
    await waitFor(() => expect(lastQuery().q).toBe("gened-mk2"));
    // Every row is still rendered: the server decides what matches, not the DOM.
    expect(document.querySelectorAll("[data-fleet-row]")).toHaveLength(ALL_ROWS.length);
  });

  it.each([
    ["Filter by connectivity", "Offline", "connectivity", "OFFLINE"],
    ["Filter by data age", "Stale", "freshness", "STALE"],
    ["Filter by verdict", "FAIL", "verdict", "FAIL"],
    ["Filter by record", "Lab only", "record", "LEGACY_LAB"],
    ["Filter by provenance", "Pre-registered", "provenance", "PRE_PROVISIONED"],
  ])("sends %s as a query parameter", async (label, option, key, value) => {
    await renderFleet();
    await choose(label, option);
    await waitFor(() => expect(lastQuery()[key]).toBe(value));
  });

  it("treats 'no attention needed' as a real filter, not an absent one", async () => {
    await renderFleet();

    await choose("Filter by attention", "No attention needed");
    await waitFor(() => expect(lastQuery().needs_attention).toBe(false));

    await choose("Filter by attention", "Needs attention");
    await waitFor(() => expect(lastQuery().needs_attention).toBe(true));

    // And "any" must drop the parameter rather than send false.
    await choose("Filter by attention", "Attention: any");
    await waitFor(() => expect(lastQuery().needs_attention).toBeUndefined());
  });

  it("sends the sort rather than reordering the rows locally", async () => {
    await renderFleet();
    await choose("Sort the fleet", "Sort: Least recently seen");
    await waitFor(() => expect(lastQuery().sort).toBe("last_seen"));
  });

  it("sends include_revoked", async () => {
    await renderFleet();
    fireEvent.click(screen.getByLabelText(/show revoked/i));
    await waitFor(() => expect(lastQuery().include_revoked).toBe(true));
  });

  it("returns to page 1 when a filter changes", async () => {
    // Otherwise narrowing the fleet while on page 4 lands on an empty page and
    // reads as "no such device".
    listFleetRegistryDevices.mockResolvedValue(
      page(ALL_ROWS, { total: 90, page: 1, page_size: 10 }),
    );
    await renderFleet();

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(lastQuery().page).toBe(2));

    await choose("Filter by verdict", "FAIL");
    await waitFor(() => expect(lastQuery().page).toBe(1));
  });
});

// ── 4. Pagination reads from the server's total ───────────────

describe("pagination", () => {
  beforeEach(() => {
    listFleetRegistryDevices.mockResolvedValue(
      page(ALL_ROWS, { total: 95, page: 1, page_size: 10 }),
    );
  });

  it("sizes the pager from total, not from the rows on screen", async () => {
    await renderFleet();
    expect(screen.getByText("Showing 1–10 of 95")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 10")).toBeInTheDocument();
  });

  it("disables Previous on the first page", async () => {
    await renderFleet();
    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("marks the count as a floor when the server truncated its scan", async () => {
    listFleetRegistryDevices.mockResolvedValue(
      page(ALL_ROWS, { total: 5000, page: 1, page_size: 10, truncated: true }),
    );
    await renderFleet();

    expect(screen.getByText(/Showing 1–10 of 5000\+/)).toBeInTheDocument();
    expect(screen.getByText(/are floors rather than totals/)).toBeInTheDocument();
  });
});

// ── 5. Stats are fleet-wide ──────────────────────────────────

describe("stats tiles", () => {
  it("renders the server's fleet-wide counts", async () => {
    await renderFleet();

    const tile = (label: string) =>
      document.querySelector(`[data-fleet-tile="${label}"]`)!.textContent ?? "";

    expect(tile("Fleet size")).toContain("11");
    expect(tile("Needs attention")).toContain("2");
    expect(tile("Online")).toContain("3");
    expect(tile("Unknown reach")).toContain("7");
    expect(tile("No serial yet")).toContain("3");
  });

  it("gives OFFLINE its own tile, because attention deliberately excludes it", async () => {
    // needs_attention is diagnostic-only: a classroom is offline every evening,
    // so folding connectivity in would flag the fleet nightly. That is only a
    // safe decision while the offline count stays visible on its own — if this
    // tile goes, the decision silently becomes "offline is not shown".
    await renderFleet();

    const offline = document.querySelector('[data-fleet-tile="Offline"]')!;
    expect(offline.textContent).toContain("1");
    expect(offline.textContent).toMatch(/not counted as attention/i);
    expect(document.querySelector('[data-fleet-tile="Needs attention"]')!.textContent).toContain(
      "2",
    );
  });

  it("marks the tiles as floors when the stats scan truncated but the list did not", async () => {
    // The two payloads carry independent flags and legitimately disagree: a
    // narrow search makes the list exact while the fleet-wide stats stay capped.
    // Reading only the list's flag showed six capped counts as a census.
    getFleetDeviceStats.mockResolvedValue({ ...STATS, total: 5000, truncated: true });
    listFleetRegistryDevices.mockResolvedValue(page(ALL_ROWS, { truncated: false }));
    await renderFleet();

    expect(document.querySelector('[data-fleet-tile="Fleet size"]')!.textContent).toContain(
      "5000+",
    );
    expect(screen.getByText(/are floors rather than totals/)).toBeInTheDocument();
  });

  it("shows a bare count when nothing truncated", async () => {
    await renderFleet();

    expect(document.querySelector('[data-fleet-tile="Fleet size"]')!.textContent).not.toContain(
      "+",
    );
    expect(screen.queryByText(/are floors rather than totals/)).toBeNull();
  });

  it("does not re-request stats scoped to a filter", async () => {
    // The tiles exist so an operator can check the filtered rows add up. A tile
    // that recounted itself under the filter could not do that -- and the Lab
    // surface's tiles and rows disagreed on screen for exactly this reason.
    await renderFleet();
    await choose("Filter by verdict", "FAIL");
    await waitFor(() => expect(lastQuery().verdict).toBe("FAIL"));

    for (const call of getFleetDeviceStats.mock.calls) {
      expect(call).toHaveLength(0);
    }
  });

  it("still shows the table when the stats request fails", async () => {
    getFleetDeviceStats.mockRejectedValue(new Error("boom"));
    await renderFleet();

    expect(document.querySelector('[data-fleet-tile="Fleet size"]')).toBeNull();
    expect(document.querySelectorAll("[data-fleet-row]").length).toBeGreaterThan(0);
  });
});

// ── 6. Links and failure modes ───────────────────────────────

describe("navigation and errors", () => {
  it("links only the devices that actually have a detail page", async () => {
    await renderFleet();

    // Lab-enrolled: the detail page loads from the Lab endpoint and keys on
    // lab_devices.id.
    const lab = cells("lab:aaaaaaaa-0000-0000-0000-000000000001");
    fireEvent.click(lab.getByText("View"));
    expect(push).toHaveBeenCalledWith(
      "/admin/devices/aaaaaaaa-0000-0000-0000-000000000001",
    );

    // A personal or pre-registered unit has no such record, so no link is shown
    // rather than one that would 404.
    expect(cells("serial:1000000000000001").queryByText("View")).toBeNull();
    expect(cells("health:DEV-8888-8888").queryByText("View")).toBeNull();
  });

  it("shows an error instead of an empty fleet when the request fails", async () => {
    listFleetRegistryDevices.mockRejectedValue(new Error("gateway exploded"));
    render(<FleetTable />);

    expect(await screen.findByText("gateway exploded")).toBeInTheDocument();
    expect(screen.queryByText(/No devices match/)).toBeNull();
  });

  it("distinguishes an empty result from a failed one", async () => {
    listFleetRegistryDevices.mockResolvedValue(page([]));
    render(<FleetTable />);

    expect(await screen.findByText(/No devices match these filters/)).toBeInTheDocument();
  });
});
