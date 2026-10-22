import { describe, expect, it } from "vitest";
import {
  MAINTENANCE_COPY,
  MAINTENANCE_ROUTES,
  isMaintenanceRoute,
} from "../maintenance";

describe("isMaintenanceRoute", () => {
  it.each(MAINTENANCE_ROUTES)("gates %s exactly", (route) => {
    expect(isMaintenanceRoute(route)).toBe(true);
  });

  it("gates the nested device detail route", () => {
    expect(isMaintenanceRoute("/admin/devices/DEV-1234-5678")).toBe(true);
  });

  it("gates a device key that arrives percent-encoded", () => {
    expect(isMaintenanceRoute("/admin/devices/serial%3ADEV-1")).toBe(true);
  });

  it.each(["/admin", "/admin/users", "/admin/analytics", "/admin/ingestions"])(
    "leaves %s alone",
    (route) => {
      expect(isMaintenanceRoute(route)).toBe(false);
    },
  );

  // The reason matching is segment-aware rather than a bare startsWith: a
  // sibling route sharing a prefix is a different screen.
  it("does not gate a sibling route that merely shares a prefix", () => {
    expect(isMaintenanceRoute("/admin/devices-archive")).toBe(false);
    expect(isMaintenanceRoute("/admin/agents-v2")).toBe(false);
  });
});

describe("MAINTENANCE_COPY", () => {
  it("says what is wrong and that nothing was lost", () => {
    expect(MAINTENANCE_COPY.title).toMatch(/maintenance/i);
    expect(MAINTENANCE_COPY.body).toMatch(/new backend/i);
  });
});
