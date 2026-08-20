import { test, expect, type Page } from "@playwright/test";
import { seedAuth } from "../helpers/auth";
import { API, stubApiCatchAll } from "../helpers/api";

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

    await page.getByLabel(/show revoked/i).check();
    await expect(page.getByText("7 of 7 devices")).toBeVisible();
    await expect(page.locator("tr", { hasText: "Desk 7" }).getByText("Revoked")).toBeVisible();
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
