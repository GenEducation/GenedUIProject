import { describe, it, expect, vi, afterEach } from "vitest";

import {
  deriveConn,
  deriveService,
  isHeartbeatStale,
  STALE_HEARTBEAT_MINUTES,
} from "../../components/deviceHealth";
import type { AdminDeviceListItem } from "../types";

const NOW = new Date("2026-08-06T12:00:00Z");

function device(overrides: Partial<AdminDeviceListItem> = {}): AdminDeviceListItem {
  return {
    id: "d1",
    partner_id: "p1",
    partner_organization: "Spring Dale",
    lab_id: "l1",
    lab_name: "Computer Lab 1",
    device_label: "Desk 1",
    hardware_id: "DEV-0001",
    health_status: "ONLINE",
    last_heartbeat_at: NOW.toISOString(),
    firmware_version: "1.4.2",
    device_model: "Lenovo Tab M10",
    is_spare: false,
    revoked_at: null,
    last_ip: "10.0.0.1",
    last_health_at: NOW.toISOString(),
    self_test_status: "ok",
    self_test_failed: [],
    ...overrides,
  };
}

function minutesAgo(n: number) {
  return new Date(NOW.getTime() - n * 60_000).toISOString();
}

afterEach(() => {
  vi.useRealTimers();
});

function freezeNow() {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
}

describe("deriveConn — precedence", () => {
  it("revoked wins over every other signal", () => {
    freezeNow();
    expect(
      deriveConn(device({ revoked_at: minutesAgo(5), health_status: "ONLINE" })),
    ).toBe("REVOKED");
    expect(
      deriveConn(device({ revoked_at: minutesAgo(5), health_status: "NEEDS_ATTENTION" })),
    ).toBe("REVOKED");
  });

  it("downgrades a device that claims ONLINE but stopped heartbeating to STALE", () => {
    freezeNow();
    const d = device({
      health_status: "ONLINE",
      last_heartbeat_at: minutesAgo(STALE_HEARTBEAT_MINUTES + 1),
    });
    expect(deriveConn(d)).toBe("STALE");
  });

  it("treats ONLINE with no heartbeat at all as STALE, not ONLINE", () => {
    freezeNow();
    expect(deriveConn(device({ last_heartbeat_at: null }))).toBe("STALE");
  });

  it("an OFFLINE device is never counted as stale", () => {
    freezeNow();
    expect(isHeartbeatStale(device({ health_status: "OFFLINE", last_heartbeat_at: null }))).toBe(
      false,
    );
  });
});

describe("deriveService — unknown is not healthy", () => {
  it("maps a null status to UNKNOWN — never to OK", () => {
    expect(deriveService({ self_test_status: null })).toBe("UNKNOWN");
  });

  it("an empty self_test_failed with a null status is UNKNOWN, not clean", () => {
    // The spec's explicit trap: [] means "clean" only when status is "ok".
    const d = device({ self_test_status: null, self_test_failed: [] });
    expect(deriveService(d)).toBe("UNKNOWN");
  });
});
