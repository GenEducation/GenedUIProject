import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

import { DeviceDetailView } from "../DeviceDetailView";
import type { AdminDeviceDetail } from "../../devices/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const getFleetDevice = vi.hoisted(() => vi.fn());
const getDeviceLogs = vi.hoisted(() => vi.fn());
const listFleetLabs = vi.hoisted(() => vi.fn());
vi.mock("../../adminService", () => ({ getFleetDevice, getDeviceLogs, listFleetLabs }));

/**
 * Mirrors the live payload observed in production: a wrapper object with
 * report-level metadata (ip/mode/type/checked_at/schema_version/firmware_version)
 * and the real per-component results nested under `components`. This is the
 * exact shape that previously got misread as "every top-level key is a
 * component", exploding string values like `ip` into one row per character.
 */
function liveSelfTestPayload() {
  return {
    ip: "10.0.3.19",
    mode: "SHOULD_ALWAYS_BE",
    type: "device",
    checked_at: "2026-08-06T02:06:51Z",
    schema_version: "1",
    firmware_version: "1d297c7",
    components: {
      display: {
        status: "ok",
        detail: "connector 49, 800x800, path routed; 13 blocks",
        metrics: { width: 800, height: 800, crtc_id: 92, path: "connector:49" },
      },
      audio_hat: {
        status: "service_required",
        detail: "card 3; capture path routed; 50 frames, peak 32768",
        metrics: {
          peak: 32768,
          mixer: {
            "ADC PCM": 225,
            Capture: 53,
            "Left Input Mixer Boost": true,
            "Right Input Mixer Boost": true,
            "Left Boost Mixer LINPUT1": true,
            "Right Boost Mixer RINPUT1": true,
          },
          frames: 50,
          distinct: 4536,
          alsa_card: 3,
        },
      },
    },
  };
}

function detail(overrides: Partial<AdminDeviceDetail> = {}): AdminDeviceDetail {
  return {
    id: "d1",
    partner_id: "p1",
    partner_organization: "Spring Dale",
    lab_id: "l1",
    lab_name: "Computer Lab 1",
    device_label: "Desk 1",
    hardware_id: "DEV-0001",
    health_status: "ONLINE",
    last_heartbeat_at: "2026-08-06T02:06:00Z",
    firmware_version: "1.4.2",
    device_model: "Tab M10",
    is_spare: false,
    revoked_at: null,
    last_ip: "10.0.3.1", // deliberately distinct from the self-test's reported "ip" below
    last_health_at: "2026-08-06T02:06:51Z",
    self_test_status: "service_required",
    self_test_failed: ["audio_hat"],
    last_health_report: liveSelfTestPayload(),
    device_token_rotated_at: null,
    provisioned_at: "2026-05-01T00:00:00Z",
    first_connected_at: "2026-05-01T00:10:00Z",
    last_connected_at: "2026-08-06T02:06:00Z",
    provisioning_source: "PAIRING",
    ...overrides,
  };
}

describe("DeviceDetailView — self-test parsing", () => {
  it("reads real components from report.components, not the wrapper's top-level keys", async () => {
    getFleetDevice.mockResolvedValue(detail());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("Self-test")).toBeInTheDocument());

    // The two real components render as component cards.
    expect(screen.getByText("display")).toBeInTheDocument();
    expect(screen.getByText("audio_hat")).toBeInTheDocument();

    // Wrapper metadata keys must NOT appear as fake component names.
    expect(screen.queryByText("ip")).not.toBeInTheDocument();
    expect(screen.queryByText("mode")).not.toBeInTheDocument();
    expect(screen.queryByText("checked_at")).not.toBeInTheDocument();

    // A string value like the IP must render whole, not exploded into
    // one row per character (the original bug: Object.entries("10.0.3.19")).
    expect(screen.queryByText("1", { selector: "dt" })).not.toBeInTheDocument();
    expect(screen.queryByText(".", { selector: "dt" })).not.toBeInTheDocument();
  });

  it("surfaces report-level metadata as real fields in the Identity card, not fake components", async () => {
    getFleetDevice.mockResolvedValue(detail());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("Self-test report")).toBeInTheDocument());

    const identity = screen.getByText("Identity").closest("section") as HTMLElement;
    expect(within(identity).getByText("10.0.3.19")).toBeInTheDocument();
    expect(within(identity).getByText("SHOULD_ALWAYS_BE")).toBeInTheDocument();
    expect(within(identity).getByText("1d297c7")).toBeInTheDocument();
  });

  it("renders nested object metrics as real label/value rows, not a JSON dump", async () => {
    getFleetDevice.mockResolvedValue(detail());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("audio_hat")).toBeInTheDocument());

    // The nested `mixer` object's own keys render as their own dt/dd rows —
    // not as a single blob of stringified JSON.
    expect(screen.getByText("ADC PCM")).toBeInTheDocument();
    expect(screen.getByText("225")).toBeInTheDocument();
    expect(screen.getByText("Left Input Mixer Boost")).toBeInTheDocument();
    expect(screen.getAllByText("true").length).toBeGreaterThan(0);

    // No raw JSON anywhere on the page.
    expect(screen.queryByText(/"ADC PCM"/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('{"ADC PCM"');

    // Scalar metrics (peak, frames, alsa_card) still render as compact rows.
    expect(screen.getByText("32768")).toBeInTheDocument();
  });

  it("shows the unknown-hardware-state message when no self-test has ever been reported", async () => {
    getFleetDevice.mockResolvedValue(detail({ last_health_report: null, self_test_status: null }));
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() =>
      expect(screen.getByText(/never reported a self-test/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Self-test report")).not.toBeInTheDocument();
  });
});
