import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";

import { DevicesView } from "../DevicesView";
import type { AdminDeviceListItem, AdminLabStats } from "../../devices/types";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const getLabStats = vi.hoisted(() => vi.fn());
vi.mock("../../adminService", () => ({ getLabStats }));

const fetchAllDevices = vi.hoisted(() => vi.fn());
vi.mock("../../devices/fetchAllDevices", () => ({
  fetchAllDevices,
  FLEET_FETCH_CAP: 2000,
}));

// recharts needs a real layout box, which jsdom doesn't provide.
vi.mock("../DeviceCharts", () => ({
  ChartCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DonutChart: () => <div data-testid="donut" />,
  BySchoolChart: () => <div data-testid="by-school" />,
  FirmwareChart: () => <div data-testid="firmware" />,
  CHART_COLORS: { good: "#059F6D", warn: "#FBBF24", bad: "#FB7185", muted: "#888", neutral: "#0af" },
}));

const NOW = new Date("2026-08-06T12:00:00Z");
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();

function device(o: Partial<AdminDeviceListItem>): AdminDeviceListItem {
  return {
    id: "d1",
    partner_id: "p1",
    partner_organization: "Spring Dale",
    lab_id: "l1",
    lab_name: "Computer Lab 1",
    device_label: "Desk 1",
    hardware_id: "DEV-0001",
    health_status: "ONLINE",
    last_heartbeat_at: minutesAgo(1),
    firmware_version: "1.4.2",
    device_model: "Tab M10",
    is_spare: false,
    revoked_at: null,
    last_ip: "10.0.0.1",
    last_health_at: minutesAgo(1),
    self_test_status: "ok",
    self_test_failed: [],
    ...o,
  };
}

const DEVICES: AdminDeviceListItem[] = [
  device({ id: "ok", device_label: "Desk 1" }),
  device({ id: "off", device_label: "Desk 2", health_status: "OFFLINE", last_heartbeat_at: minutesAgo(90) }),
  device({
    id: "fault",
    device_label: "Desk 3",
    self_test_status: "service_required",
    self_test_failed: ["speaker"],
  }),
  device({ id: "unknown", device_label: "Desk 4", self_test_status: null, self_test_failed: [] }),
  device({ id: "stale", device_label: "Desk 5", health_status: "ONLINE", last_heartbeat_at: minutesAgo(120) }),
  device({ id: "gone", device_label: "Desk 6", revoked_at: minutesAgo(500) }),
];

const STATS: AdminLabStats = {
  total_devices: 5,
  by_health_status: { ONLINE: 4, OFFLINE: 1, NEEDS_ATTENTION: 0 },
  service_required: 1,
  self_test_unknown: 1,
  stale_heartbeat: 1,
  revoked_devices: 1,
  total_labs: 2,
  partners_with_labs: 1,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  push.mockReset();
  getLabStats.mockResolvedValue(STATS);
  fetchAllDevices.mockResolvedValue({ devices: DEVICES, total: 6, truncated: false });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

/**
 * KPI tiles and self-test chips can carry the same words ("Service required"),
 * so address the tile by its `data-kpi-tile` hook rather than by styling
 * classes — the previous `className.includes("uppercase")` walk broke on any
 * unrelated style change, and threw outright on SVG nodes (whose `className`
 * is an SVGAnimatedString, not a string).
 */
function tile(label: string) {
  const el = document.querySelector<HTMLButtonElement>(
    `[data-kpi-tile="${label}"]`
  );
  if (!el) throw new Error(`No KPI tile labelled "${label}"`);
  return el;
}

describe("DevicesView", () => {
  it("renders the fleet summary from the stats payload", async () => {
    render(<DevicesView />);
    expect(await screen.findByText("5 devices · 2 labs · 1 schools")).toBeInTheDocument();
  });

  it("fetches revoked devices so the revoked tile can reconcile with rows", async () => {
    render(<DevicesView />);
    await waitFor(() => expect(fetchAllDevices).toHaveBeenCalled());
    expect(fetchAllDevices).toHaveBeenCalledWith({ include_revoked: true });
  });

  it("hides revoked devices from the table until the toggle is switched on", async () => {
    render(<DevicesView />);
    expect(await screen.findByText("5 of 5 devices")).toBeInTheDocument();
    expect(screen.queryByText("Desk 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/show revoked/i));
    expect(await screen.findByText("6 of 6 devices")).toBeInTheDocument();
    expect(screen.getByText("Desk 6")).toBeInTheDocument();
  });

  it("shows a device's failed components on its self-test chip", async () => {
    render(<DevicesView />);
    await screen.findByText("Desk 3");
    expect(screen.getByText("Service required: speaker")).toBeInTheDocument();
  });

  it("labels a never-reported device as Unknown rather than passing", async () => {
    render(<DevicesView />);
    const row = (await screen.findByText("Desk 4")).closest("tr")!;
    expect(within(row).getByText("Unknown")).toBeInTheDocument();
    expect(within(row).queryByText("Passing")).not.toBeInTheDocument();
  });

  it("flags a device that claims ONLINE but stopped heartbeating as Stale", async () => {
    render(<DevicesView />);
    const row = (await screen.findByText("Desk 5")).closest("tr")!;
    expect(within(row).getByText("Stale")).toBeInTheDocument();
  });

  it("clicking a KPI tile filters the table to that cohort", async () => {
    render(<DevicesView />);
    await screen.findByText("5 of 5 devices");

    fireEvent.click(tile("Service required"));

    expect(await screen.findByText("1 of 1 devices")).toBeInTheDocument();
    expect(screen.getByText("Desk 3")).toBeInTheDocument();
    expect(screen.queryByText("Desk 1")).not.toBeInTheDocument();
  });

  it("navigates to the detail route from a row action", async () => {
    render(<DevicesView />);
    const row = (await screen.findByText("Desk 1")).closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: /view/i }));
    expect(push).toHaveBeenCalledWith("/admin/devices/ok");
  });

  it("warns rather than silently truncating when the fleet exceeds the cap", async () => {
    fetchAllDevices.mockResolvedValue({ devices: DEVICES, total: 2500, truncated: true });
    render(<DevicesView />);
    expect(await screen.findByText(/exceeds the 2000-device/i)).toBeInTheDocument();
  });

  it("still renders the fleet when the stats endpoint fails", async () => {
    // Counts fall back to what we can compute from the rows.
    getLabStats.mockRejectedValue(new Error("boom"));
    render(<DevicesView />);
    expect(await screen.findByText("5 devices")).toBeInTheDocument();
    expect(screen.getByText("Desk 1")).toBeInTheDocument();
  });

  it("surfaces a device-fetch failure as a table error", async () => {
    fetchAllDevices.mockRejectedValue(new Error("gateway down"));
    render(<DevicesView />);
    expect(await screen.findByText("gateway down")).toBeInTheDocument();
  });
});
