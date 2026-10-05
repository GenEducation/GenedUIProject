import { test, expect, type Page } from "@playwright/test";
import { seedAuth } from "../helpers/auth";
import { API, stubApiCatchAll } from "../helpers/api";
import type {
  CanonicalDevice,
  FleetDeviceRow,
  FleetStats,
} from "../../src/features/admin/devices/types";

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

interface FleetDevice {
  id: string;
  device_label: string;
  hardware_id: string;
  health_status: "ONLINE" | "OFFLINE" | "NEEDS_ATTENTION";
  last_heartbeat_at: string | null;
  partner_organization: string;
  lab_name: string;
  firmware_version: string | null;
  self_test_status: "ok" | "service_required" | null;
  self_test_failed: string[];
  revoked_at?: string | null;
  is_spare?: boolean;
}

/** Deliberately covers every state the UI has to distinguish. */
const DEVICES: FleetDevice[] = [
  {
    id: "dev-online",
    device_label: "Desk 1",
    hardware_id: "DEV-BF5A-A492",
    health_status: "ONLINE",
    last_heartbeat_at: minutesAgo(1),
    partner_organization: "Spring Dale Public School",
    lab_name: "Computer Lab 1",
    firmware_version: "1.4.2",
    self_test_status: "ok",
    self_test_failed: [],
  },
  {
    id: "dev-fault",
    device_label: "Desk 2",
    hardware_id: "DEV-11C2-77A0",
    health_status: "ONLINE",
    last_heartbeat_at: minutesAgo(2),
    partner_organization: "Spring Dale Public School",
    lab_name: "Computer Lab 1",
    firmware_version: "1.4.2",
    self_test_status: "service_required",
    self_test_failed: ["speaker"],
  },
  {
    id: "dev-stale",
    device_label: "Desk 3",
    hardware_id: "DEV-9931-B002",
    health_status: "ONLINE", // claims online but stopped reporting
    last_heartbeat_at: minutesAgo(240),
    partner_organization: "Spring Dale Public School",
    lab_name: "Computer Lab 2",
    firmware_version: "1.3.9",
    self_test_status: "ok",
    self_test_failed: [],
  },
  {
    id: "dev-unknown",
    device_label: "Desk 4",
    hardware_id: "DEV-4410-CC31",
    health_status: "ONLINE",
    last_heartbeat_at: minutesAgo(3),
    partner_organization: "Oakridge International",
    lab_name: "Lab A",
    firmware_version: null,
    self_test_status: null, // never reported — unknown, not healthy
    self_test_failed: [],
  },
  {
    id: "dev-offline",
    device_label: "Desk 5",
    hardware_id: "DEV-7781-0A12",
    health_status: "OFFLINE",
    last_heartbeat_at: minutesAgo(1440),
    partner_organization: "Oakridge International",
    lab_name: "Lab A",
    firmware_version: "1.3.9",
    self_test_status: "ok",
    self_test_failed: [],
  },
  {
    id: "dev-attention",
    device_label: "Desk 6",
    hardware_id: "DEV-6620-91FF",
    health_status: "NEEDS_ATTENTION",
    last_heartbeat_at: minutesAgo(12),
    partner_organization: "Greenwood High",
    lab_name: "Innovation Lab",
    firmware_version: "1.4.2",
    self_test_status: "service_required",
    self_test_failed: ["mic", "camera"],
  },
  {
    id: "dev-revoked",
    device_label: "Desk 7",
    hardware_id: "DEV-0001-DEAD",
    health_status: "OFFLINE",
    last_heartbeat_at: minutesAgo(9000),
    partner_organization: "Greenwood High",
    lab_name: "Innovation Lab",
    firmware_version: "1.2.0",
    self_test_status: null,
    self_test_failed: [],
    revoked_at: minutesAgo(5000),
  },
];

const STATS = {
  total_devices: 6, // excludes the revoked unit
  by_health_status: { ONLINE: 4, OFFLINE: 1, NEEDS_ATTENTION: 1 },
  service_required: 2,
  self_test_unknown: 1,
  stale_heartbeat: 1,
  revoked_devices: 1,
  total_labs: 4,
  partners_with_labs: 3,
};

// ── The mode-independent fleet table (Phase 4) ──────────────────────────────
//
// Separate from DEVICES above, which is the Lab ENROLLMENT list. These rows come
// from GET /admin/devices and cover hardware the Lab table structurally cannot:
// a PERSONAL unit, one still in its box, and a legacy row with no serial yet.
//
// Typed against the real contract on purpose. `tsc` covers e2e/, so a backend
// field that gets renamed breaks this fixture at compile time instead of
// silently feeding the table a shape it never sees in production.
//
// These labels deliberately avoid "Desk N": the Lab assertions below address
// rows by label, and a collision would make `locator("tr", {hasText})` ambiguous
// across the two tables.

const FLEET_INTERVAL = 3600;
const FLEET_FRESH_AFTER = FLEET_INTERVAL * 3;

function fleetRow(o: Partial<FleetDeviceRow> & { fleet_key: string }): FleetDeviceRow {
  return {
    record: "CANONICAL",
    id: null,
    serial: null,
    reported_device_id: null,
    lab_hardware_id: null,
    derived_device_key: null,
    label: null,
    device_model: null,
    last_reported_mode: null,
    provenance: null,
    connectivity: { state: "UNKNOWN", source: "NONE", reason: "no_presence_channel" },
    last_seen_at: null,
    last_seen_source: null,
    last_seen_age_seconds: null,
    first_seen_at: null,
    diagnostic_freshness: "NEVER_REPORTED",
    diagnostic_verdict: null,
    report_age_seconds: null,
    received_at: null,
    findings_total: 0,
    tally: {},
    needs_attention: false,
    attention_reasons: [],
    fresh_after_seconds: FLEET_FRESH_AFTER,
    report_interval_seconds: FLEET_INTERVAL,
    firmware_version: null,
    tool_version: null,
    deployed_version: null,
    hostname: null,
    lab: null,
    revoked: false,
    revoked_at: null,
    ...o,
  };
}

/** A lab unit that is reachable and passing, and has a detail page. */
const FLEET_LAB = fleetRow({
  fleet_key: "serial:1000000000000001",
  id: "11111111-0000-0000-0000-000000000001",
  serial: "1000000000000001",
  reported_device_id: "gened-mk2",
  lab_hardware_id: "DEV-BF5A-A492",
  label: "Lab Unit Alpha",
  last_reported_mode: "SCHOOL_LAB",
  provenance: "ENROLLED",
  connectivity: { state: "ONLINE", source: "LAB_WS", reason: null },
  last_seen_at: minutesAgo(1),
  last_seen_source: "LAB_WS",
  last_seen_age_seconds: 60,
  diagnostic_freshness: "FRESH",
  diagnostic_verdict: "PASS",
  report_age_seconds: 600,
  received_at: minutesAgo(10),
  firmware_version: "1.4.2",
  lab: {
    lab_device_id: "dev-online",
    device_label: "Lab Unit Alpha",
    hardware_id: "DEV-BF5A-A492",
    lab_id: "l1",
    partner_id: "p1",
    health_status: "ONLINE",
    last_heartbeat_at: minutesAgo(1),
    is_spare: false,
    revoked_at: null,
  },
});

/** A PERSONAL unit: reachable over MQTT, FAILing, and with no detail page. */
const FLEET_PERSONAL = fleetRow({
  fleet_key: "serial:1000000000000002",
  id: "11111111-0000-0000-0000-000000000002",
  serial: "1000000000000002",
  reported_device_id: "gened-home-7",
  label: "Home Unit Bravo",
  last_reported_mode: "PERSONAL",
  provenance: "SELF_REGISTERED",
  connectivity: { state: "ONLINE", source: "MQTT_STATUS", reason: null },
  last_seen_at: minutesAgo(4),
  last_seen_source: "MQTT_STATUS",
  last_seen_age_seconds: 240,
  diagnostic_freshness: "FRESH",
  diagnostic_verdict: "FAIL",
  report_age_seconds: 900,
  received_at: minutesAgo(15),
  findings_total: 3,
  tally: { FAIL: 1, WARN: 2 },
  needs_attention: true,
  attention_reasons: ["diagnostic_fail"],
  firmware_version: "1.4.2",
});

/** Pre-registered and never heard from. UNKNOWN reach, never OFFLINE. */
const FLEET_BOXED = fleetRow({
  fleet_key: "serial:1000000000000003",
  id: "11111111-0000-0000-0000-000000000003",
  serial: "1000000000000003",
  label: "Boxed Unit Charlie",
  provenance: "PRE_PROVISIONED",
});

/** Legacy Lab enrollment: no canonical serial yet, awaiting Phase 3 firmware. */
const FLEET_LEGACY = fleetRow({
  fleet_key: "lab:dev-attention",
  record: "LEGACY_LAB",
  lab_hardware_id: "DEV-6620-91FF",
  label: "Legacy Unit Delta",
  connectivity: { state: "OFFLINE", source: "LAB_WS", reason: null },
  last_seen_at: minutesAgo(12),
  last_seen_source: "LAB_WS",
  last_seen_age_seconds: 720,
  lab: {
    lab_device_id: "dev-attention",
    device_label: "Legacy Unit Delta",
    hardware_id: "DEV-6620-91FF",
    lab_id: "l2",
    partner_id: "p2",
    health_status: "NEEDS_ATTENTION",
    last_heartbeat_at: minutesAgo(12),
    is_spare: false,
    revoked_at: null,
  },
});

/** Hidden until "Include revoked" is on — it has nothing but a dead enrollment. */
const FLEET_REVOKED = fleetRow({
  fleet_key: "lab:dev-revoked",
  record: "LEGACY_LAB",
  lab_hardware_id: "DEV-0001-DEAD",
  label: "Retired Unit Echo",
  revoked: true,
  revoked_at: minutesAgo(5000),
});

const FLEET_LIVE = [FLEET_LAB, FLEET_PERSONAL, FLEET_BOXED, FLEET_LEGACY];

/**
 * `GET /admin/devices/{key}` for the DETAIL page's System diagnostic card.
 *
 * Deliberately a real gened-health document rather than a 404: a 404 would also
 * be honest, but the browser logs it as a failed request and this page's tests
 * assert a clean console, so the card's empty state would be bought at the cost
 * of the assertion that catches genuine runtime errors.
 */
const CANONICAL_DETAIL: CanonicalDevice = {
  id: "11111111-0000-0000-0000-000000000009",
  serial: "1000000000000009",
  reported_device_id: "gened-mk2",
  lab_hardware_id: "DEV-11C2-77A0",
  derived_device_key: "DEV-0000-0009",
  label: "Desk 2",
  device_model: "Raspberry Pi 4 Model B",
  last_reported_mode: "SCHOOL_LAB",
  provenance: "ENROLLED",
  connectivity: { state: "ONLINE", source: "LAB_WS", reason: null },
  last_seen_at: minutesAgo(1),
  last_seen_source: "LAB_WS",
  last_seen_age_seconds: 60,
  first_seen_at: minutesAgo(60 * 24 * 30),
  diagnostic_freshness: "FRESH",
  diagnostic_verdict: "WARN",
  // ACTIVE: this fixture is a desk currently in a Lab, heartbeating a minute
  // ago, so the detail page must keep rendering it in the present tense with
  // every Lab action available.
  lab_tenancy: {
    state: "ACTIVE",
    reason: null,
    enrollment: {
      lab_device_id: "99999999-0000-0000-0000-000000000009",
      device_label: "Desk 2",
      hardware_id: "DEV-11C2-77A0",
      lab_id: "22222222-0000-0000-0000-000000000009",
      partner_id: "33333333-0000-0000-0000-000000000009",
      firmware_version: "1.4.2",
      health_status: "ONLINE",
      last_heartbeat_at: minutesAgo(1),
      evidence_at: minutesAgo(1),
    },
  },
  diagnostic: {
    serial: "1000000000000009",
    device_key: "DEV-0000-0009",
    reported_device_id: "gened-mk2",
    hostname: "gened-mk2",
    device_model: "Raspberry Pi 4 Model B",
    mode: "SCHOOL_LAB",
    firmware_version: "1.4.2",
    tool_version: "gened-health/1",
    deployed_version: "b7bce87",
    overall: "WARN",
    tally: { PASS: 38, WARN: 2, INFO: 1 },
    findings: [
      {
        id: "storage.root.free",
        status: "WARN",
        subsystem: "storage",
        title: "Root filesystem is filling up",
        detail: "2.1 GB free of 29 GB",
        next_step: "Clear old logs or expand the image.",
      },
    ],
    findings_total: 41,
    received_at: minutesAgo(12),
    report_age_seconds: 720,
    fresh: true,
    fresh_after_seconds: FLEET_FRESH_AFTER,
    diagnostic_freshness: "FRESH",
    report_interval_seconds: FLEET_INTERVAL,
    collected_at: minutesAgo(12),
    clock_synced: true,
    last_ip: "10.10.34.49",
    schema_version: 1,
    redaction: "default",
  },
};

const FLEET_STATS: FleetStats = {
  total: 5,
  by_record: { CANONICAL: 3, LEGACY_LAB: 2 },
  by_provenance: { PRE_PROVISIONED: 1, SELF_REGISTERED: 1, ENROLLED: 1, UNREGISTERED: 2 },
  by_connectivity: { ONLINE: 2, OFFLINE: 2, UNKNOWN: 1 },
  by_freshness: { FRESH: 2, NEVER_REPORTED: 3 },
  by_verdict: { PASS: 1, FAIL: 1, NONE: 3 },
  by_mode: { PERSONAL: 1, SCHOOL_LAB: 1, UNREPORTED: 3 },
  needs_attention: 1,
  by_attention_reason: { diagnostic_fail: 1 },
  revoked: 1,
  truncated: false,
  fresh_after_seconds: FLEET_FRESH_AFTER,
  report_interval_seconds: FLEET_INTERVAL,
};

async function mockFleet(page: Page) {
  // Catch-all first; more specific routes registered after it take precedence.
  await stubApiCatchAll(page);

  await page.route(`${API}/admin/lab/stats`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATS) }),
  );

  await page.route(`${API}/admin/lab/devices?**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: DEVICES,
        total: DEVICES.length,
        page: 1,
        page_size: 200,
      }),
    }),
  );

  await page.route(`${API}/admin/lab/devices/*`, (route) => {
    const id = route.request().url().split("/").pop()!;
    const base = DEVICES.find((d) => d.id === id) ?? DEVICES[0];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...base,
        partner_id: "p1",
        lab_id: "l1",
        device_model: "Lenovo Tab M10",
        is_spare: false,
        last_ip: "10.10.34.49",
        last_health_at: minutesAgo(2),
        provisioned_at: minutesAgo(60 * 24 * 90),
        first_connected_at: minutesAgo(60 * 24 * 90),
        last_connected_at: minutesAgo(5),
        device_token_rotated_at: null,
        provisioning_source: "PAIRING",
        last_health_report: {
          // Per HealthReport in src/features/admin/devices/types.ts, per-component
          // results live under `.components`; anything else here is report-level
          // metadata. DeviceDetailView reads `last_health_report.components`.
          components: {
            speaker: { status: "service_required", detail: "No output detected on test tone" },
            mic: { status: "ok", metrics: { gain_db: 12 } },
            storage: { status: "ok", metrics: { free_mb: 24_310 } },
          },
        },
      }),
    });
  });

  // ── Phase 4: the fleet table's own endpoints ──────────────────────────────
  //
  // These MUST be stubbed, not left to the catch-all. The catch-all answers
  // every unmocked API call with a bare `[]` — a 200 with the wrong shape — and
  // the page under test is the one that mounts FleetTable. Leaving them out is
  // how four tests on this page failed while reporting the LAB header missing:
  // the stats tiles threw during render and unmounted the whole route.
  //
  // So this is also the regression guard. If these stubs are removed, the e2e
  // goes back to exercising an empty state instead of the fleet table.

  // The detail page's canonical lookup (Phase 1/2), keyed on hardware_id. Left
  // to the catch-all this returns `[]` — a 200 the card reads as a registered
  // device with no diagnostic, a state no real backend produces.
  //
  // Registered BEFORE the stats route so the exact /stats match below wins:
  // Playwright gives precedence to the last matching route registered.
  await page.route(`${API}/admin/devices/*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(CANONICAL_DETAIL),
    }),
  );

  await page.route(`${API}/admin/devices/stats`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FLEET_STATS),
    }),
  );

  await page.route(`${API}/admin/devices?**`, (route) => {
    // Honour include_revoked, because the toggle is a server query here — the
    // component filters nothing locally, so a stub that ignored the parameter
    // would make the toggle look broken.
    const url = new URL(route.request().url());
    const includeRevoked = url.searchParams.get("include_revoked") === "true";
    const items = includeRevoked ? [...FLEET_LIVE, FLEET_REVOKED] : FLEET_LIVE;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items,
        total: items.length,
        page: 1,
        page_size: 25,
        sort: url.searchParams.get("sort") ?? "attention",
        truncated: false,
        fresh_after_seconds: FLEET_FRESH_AFTER,
        report_interval_seconds: FLEET_INTERVAL,
      }),
    });
  });
}

test.describe("admin device fleet dashboard", () => {
  test("fleet page renders KPIs, charts and every device state", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    await seedAuth(page, "admin");
    await mockFleet(page);
    await page.goto("/admin/devices");
    await page.waitForLoadState("networkidle");

    // Header summary comes from the stats payload.
    await expect(page.getByText("6 devices · 4 labs · 3 schools")).toBeVisible();

    // Revoked devices are excluded from the table until the toggle is on.
    await expect(page.getByText("6 of 6 devices")).toBeVisible();
    await expect(page.getByText("Desk 7")).toHaveCount(0);

    // The two-axis model: a device can be reachable AND faulty.
    const faulty = page.locator("tr", { hasText: "Desk 2" });
    await expect(faulty.getByText("Online")).toBeVisible();
    await expect(faulty.getByText("Service required: speaker")).toBeVisible();

    // Claims ONLINE but stopped heartbeating → Stale, not Online.
    await expect(page.locator("tr", { hasText: "Desk 3" }).getByText("Stale")).toBeVisible();

    // Never reported a self-test → Unknown, never Passing.
    const unknown = page.locator("tr", { hasText: "Desk 4" });
    await expect(unknown.getByText("Unknown")).toBeVisible();
    await expect(unknown.getByText("Passing")).toHaveCount(0);

    // All four charts mounted (recharts renders inline SVG).
    await expect(page.locator(".recharts-wrapper")).toHaveCount(4);

    expect(errors).toEqual([]);
  });

  test("show-revoked toggle reveals decommissioned units", async ({ page }) => {
    await seedAuth(page, "admin");
    await mockFleet(page);
    await page.goto("/admin/devices");
    await page.waitForLoadState("networkidle");

    // "Show revoked" is the LAB table's toggle. The fleet table below has its
    // own, named "Include revoked" precisely so this locator stays unambiguous.
    await page.getByLabel(/show revoked/i).check();
    await expect(page.getByText("7 of 7 devices")).toBeVisible();
    await expect(page.locator("tr", { hasText: "Desk 7" }).getByText("Revoked")).toBeVisible();
  });

  // ── The mode-independent fleet table (Phase 4) ────────────────────────────

  test("the fleet table lists hardware the Lab enrollment table cannot", async ({ page }) => {
    // This test is also the proof that the fixture EXERCISES the fleet table. If
    // the /admin/devices stubs are dropped, the catch-all's `[]` leaves the
    // table empty and every assertion here fails — rather than the suite quietly
    // passing against a component that rendered nothing.
    await seedAuth(page, "admin");
    await mockFleet(page);
    await page.goto("/admin/devices");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("[data-fleet-row]")).toHaveCount(4);

    // A PERSONAL unit: it has no Lab enrollment, so the table above cannot
    // represent it at all. That is the entire reason this surface exists.
    const personal = page.locator('[data-fleet-row="serial:1000000000000002"]');
    await expect(personal.getByText("Home Unit Bravo")).toBeVisible();
    await expect(personal.getByText("PERSONAL")).toBeVisible();

    // Four dimensions, side by side and never collapsed.
    await expect(personal.getByLabel("Connectivity: ONLINE")).toBeVisible();
    await expect(personal.getByLabel("Verdict: FAIL")).toBeVisible();
    await expect(personal.getByLabel("Data age: FRESH")).toBeVisible();
    await expect(personal.locator("[data-attention-reason]")).toHaveCount(1);

    // A legacy row has no canonical serial and says so, rather than showing a
    // mutable hardware_id in the serial's place.
    // `exact` because the record column legitimately says it too, as
    // "Lab only — no serial yet". This asserts the IDENTITY cell specifically.
    await expect(
      page
        .locator('[data-fleet-row="lab:dev-attention"]')
        .getByText("no serial yet", { exact: true }),
    ).toBeVisible();

    // The tiles come from the fleet-wide stats payload.
    await expect(page.locator('[data-fleet-tile="Fleet size"]')).toContainText("5");
    await expect(page.locator('[data-fleet-tile="Offline"]')).toContainText("2");
    // OFFLINE is counted separately from attention, on purpose.
    await expect(page.locator('[data-fleet-tile="Needs attention"]')).toContainText("1");
  });

  test("the fleet's include-revoked toggle is a server query", async ({ page }) => {
    await seedAuth(page, "admin");
    await mockFleet(page);
    await page.goto("/admin/devices");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("[data-fleet-row]")).toHaveCount(4);
    await page.getByLabel(/include revoked/i).check();

    await expect(page.locator("[data-fleet-row]")).toHaveCount(5);
    await expect(
      page.locator('[data-fleet-row="lab:dev-revoked"]').getByText("Enrollment revoked"),
    ).toBeVisible();
  });

  test("a 200 with an unexpected stats body does not take down the Devices page", async ({
    page,
  }) => {
    // The regression this file exists to prevent. `stats.by_connectivity.ONLINE`
    // on a non-FleetStats body threw during render, and with no error boundary
    // above a client component the throw unmounted the entire route — so the
    // LAB table disappeared because of a fault in the FLEET table's tiles.
    await seedAuth(page, "admin");
    await mockFleet(page);
    // Registered last, so it wins over mockFleet's stats route.
    await page.route(`${API}/admin/devices/stats`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );

    await page.goto("/admin/devices");
    await page.waitForLoadState("networkidle");

    // The Lab surface, which has nothing to do with the bad payload, is intact.
    await expect(page.getByText("6 devices · 4 labs · 3 schools")).toBeVisible();
    await expect(page.getByText("6 of 6 devices")).toBeVisible();
    await expect(page.locator("tr", { hasText: "Desk 2" })).toBeVisible();

    // And the fleet table still lists its rows; only the counts degrade.
    await expect(page.locator("[data-fleet-row]")).toHaveCount(4);
    await expect(page.locator('[data-fleet-tile="Online"]')).toContainText("0");
    await expect(page.locator('[data-fleet-tile="Online"]')).not.toContainText("undefined");
  });

  test("a KPI tile filters the table to its cohort", async ({ page }) => {
    await seedAuth(page, "admin");
    await mockFleet(page);
    await page.goto("/admin/devices");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Service required/ }).first().click();

    await expect(page.getByText("2 of 2 devices")).toBeVisible();
    await expect(page.getByText("Desk 1")).toHaveCount(0);
  });

  test("drilling into a device shows its self-test breakdown", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    await seedAuth(page, "admin");
    await mockFleet(page);
    await page.goto("/admin/devices");
    await page.waitForLoadState("networkidle");

    await page.locator("tr", { hasText: "Desk 2" }).getByRole("button", { name: /view/i }).click();

    await expect(page).toHaveURL(/\/admin\/devices\/dev-fault/);
    // The failing component and its detail line are the point of the page.
    await expect(page.getByText("No output detected on test tone")).toBeVisible();
    await expect(page.getByText("free_mb")).toBeVisible();
    // Sidebar keeps Devices highlighted on the nested route.
    // Scope to the sidebar: the page's "All devices" back button also matches "Devices".
    await expect(
      page.locator("aside").getByRole("button", { name: "Devices", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    expect(errors).toEqual([]);
  });
});
