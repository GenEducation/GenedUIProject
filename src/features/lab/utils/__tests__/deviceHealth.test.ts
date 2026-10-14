import { describe, expect, it } from "vitest";

import { formatRelativeTime, formatUptime } from "@/utils/datetime";
import {
  isRevokedDevice,
  normalizeStatus,
  orderedComponents,
  resolveAddresses,
  summarizeHealth,
} from "../deviceHealth";
import type { DeviceResponse } from "../../types/lab";

/** Verbatim slice of a real gateway response, so the fixtures cannot drift. */
const CHECKED_AT = "2026-08-06T10:33:34Z";

function makeDevice(overrides: Partial<DeviceResponse> = {}): DeviceResponse {
  return {
    id: "86b41ed3-a4b7-430f-b23d-e5c10e06dbde",
    partner_id: "020d4fc3-356a-44e8-83ac-02e27065eee7",
    lab_id: "ef17145e-174b-49f0-8709-35ad3d2d6e17",
    device_label: "Desk",
    hardware_id: "DEV-BF5A-A492",
    health_status: "OFFLINE",
    last_heartbeat_at: "2026-08-06T10:45:13.884800Z",
    device_model: "Raspberry Pi (aarch64)",
    firmware_version: "380255f",
    provisioned_at: "2026-08-05T17:41:54.810919Z",
    first_connected_at: "2026-08-05T17:42:40.817186Z",
    last_connected_at: "2026-08-06T10:03:30.097011Z",
    provisioning_source: "PAIRING",
    is_spare: false,
    revoked_at: null,
    last_ip: "10.10.34.49",
    last_health_at: "2026-08-06T10:33:34.894897Z",
    last_health_report: {
      ip: "10.10.34.49",
      mode: "SCHOOL_LAB",
      type: "device_health",
      failed: [],
      serial: "SNBF5AA492",
      status: "ok",
      trigger: "periodic",
      uptime_s: 8047.5,
      device_id: "DEV-BF5A-A492",
      checked_at: CHECKED_AT,
      components: {
        display: {
          status: "ok",
          detail: "connector 49, 800x800, fb mapped",
          metrics: { width: 800, height: 800, crtc_id: 92, backlight: true, connector_id: 49 },
        },
        speaker: {
          status: "ok",
          detail: "card 3; playback path routed; 13 blocks pulled",
          metrics: {
            mixer: { Speaker: 109, Playback: null, Headphone: 109, "Left Output Mixer PCM": true },
            alsa_card: 3,
            callbacks: 13,
          },
        },
        audio_hat: {
          status: "ok",
          detail: "card 3; capture path routed; 51 frames, peak 23229",
          metrics: { peak: 23229, frames: 51, alsa_card: 3, mixer: { "ADC PCM": 225, Capture: 53 } },
        },
      },
      schema_version: 1,
      firmware_version: "380255f",
    },
    ...overrides,
  };
}

describe("normalizeStatus", () => {
  it("folds known vocabularies", () => {
    expect(normalizeStatus("ok")).toBe("ok");
    expect(normalizeStatus("  PASS ")).toBe("ok");
    expect(normalizeStatus("healthy")).toBe("ok");
    expect(normalizeStatus("Degraded")).toBe("warn");
    expect(normalizeStatus("warning")).toBe("warn");
    expect(normalizeStatus("FAILED")).toBe("fail");
    expect(normalizeStatus("critical")).toBe("fail");
  });
});

describe("summarizeHealth", () => {
  it("treats a passing self-test on an unreachable device as stale", () => {
    // The regression this whole feature hinges on: health_status is OFFLINE
    // while last_health_report.status is "ok".
    const summary = summarizeHealth(makeDevice(), Date.parse("2026-08-06T10:50:00Z"));

    expect(summary.hasReport).toBe(true);
    expect(summary.level).toBe("ok");
    expect(summary.isLinkDown).toBe(true);
    expect(summary.isStale).toBe(true);
  });

  it("handles a device that has never reported", () => {
    const summary = summarizeHealth(
      makeDevice({ last_health_report: null, last_health_at: null }),
    );
    expect(summary.hasReport).toBe(false);
    expect(summary.components).toEqual([]);
    expect(summary.failedNames).toEqual([]);
    expect(summary.uptimeLabel).toBeNull();
  });

  it("escalates to the worst subsystem verdict and names the failures", () => {
    const device = makeDevice();
    device.last_health_report!.components!.speaker.status = "fail";
    device.last_health_report!.failed = ["speaker"];

    const summary = summarizeHealth(device);
    expect(summary.level).toBe("fail");
    expect(summary.failedNames).toEqual(["Speaker"]);
  });

  it("flags firmware drift only when both sides are known and differ", () => {
    expect(summarizeHealth(makeDevice()).firmwareDrift).toBe(false);

    const drifted = makeDevice();
    drifted.last_health_report!.firmware_version = "9efae0f";
    expect(summarizeHealth(drifted).firmwareDrift).toBe(true);

    const missing = makeDevice({ firmware_version: null });
    expect(summarizeHealth(missing).firmwareDrift).toBe(false);
  });

  it("survives a malformed report without throwing", () => {
    const broken = makeDevice({
      last_health_report: { components: null, failed: "not-an-array", uptime_s: "nope" } as never,
    });
    expect(() => summarizeHealth(broken)).not.toThrow();
    const summary = summarizeHealth(broken);
    expect(summary.components).toEqual([]);
    expect(summary.failedNames).toEqual([]);
    expect(summary.uptimeLabel).toBeNull();
  });
});

describe("orderedComponents", () => {
  it("orders known subsystems first, then unknown keys alphabetically", () => {
    const device = makeDevice();
    device.last_health_report!.components!.zigbee_radio = { status: "ok" };
    device.last_health_report!.components!.battery = { status: "warn" };

    const keys = orderedComponents(device.last_health_report).map((c) => c.key);
    expect(keys).toEqual(["display", "speaker", "audio_hat", "battery", "zigbee_radio"]);
  });

  it("renders a subsystem the client has never heard of", () => {
    const view = orderedComponents({
      components: { zigbee_radio: { status: "warn", detail: "weak link" } },
    })[0];

    expect(view.label).toBe("Zigbee Radio");
    expect(view.status).toBe("warn");
    expect(view.statusLabel).toBe("Degraded");
    expect(view.detail).toBe("weak link");
    expect(view.icon).toBeDefined();
  });
});

describe("isRevokedDevice", () => {
  it("detects the revocation prefix even without a timestamp", () => {
    expect(
      isRevokedDevice(
        makeDevice({ hardware_id: "revoked:24931e7a-46e6-416b-8796-ff23ea583861:DEV-BF5A-A492" }),
      ),
    ).toBe(true);
  });

  it("leaves active devices alone", () => {
    expect(isRevokedDevice(makeDevice())).toBe(false);
    expect(isRevokedDevice({ hardware_id: null, revoked_at: null })).toBe(false);
    expect(isRevokedDevice({})).toBe(false);
  });
});

describe("resolveAddresses", () => {
  it("detects an address change since the self-test", () => {
    const moved = makeDevice({ last_ip: "10.10.34.77" });
    expect(resolveAddresses(moved).changed).toBe(true);
  });
});

describe("datetime helpers", () => {
  it("formats uptime across the ladder", () => {
    expect(formatUptime(8047.5)).toBe("2h 14m");
    expect(formatUptime(30)).toBe("just booted");
    expect(formatUptime(900)).toBe("15m");
    expect(formatUptime(7200)).toBe("2h");
    expect(formatUptime(273_600)).toBe("3d 4h");
  });

  it("formats relative times and clamps future clocks", () => {
    const now = Date.parse("2026-08-06T12:00:00Z");
    expect(formatRelativeTime("2026-08-06T11:58:00Z", now)).toBe("2m ago");
    expect(formatRelativeTime("2026-08-06T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-08-05T09:00:00Z", now)).toBe("Yesterday");
    expect(formatRelativeTime("2026-08-06T12:30:00Z", now)).toBe("Just now");
  });
});
