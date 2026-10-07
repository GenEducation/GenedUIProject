import { describe, it, expect } from "vitest";
import { parseDeviceRoute, deviceHref } from "../deviceRoute";

describe("deviceRoute", () => {
  describe("parseDeviceRoute", () => {
    it("parses serial:<serial> into canonical route", () => {
      const parsed = parseDeviceRoute("serial:1000000000000001");
      expect(parsed).toEqual({
        kind: "canonical",
        key: "1000000000000001",
      });
    });

    it("parses lab:<uuid> into lab route", () => {
      const uuid = "aaaaaaaa-0000-0000-0000-000000000001";
      const parsed = parseDeviceRoute(`lab:${uuid}`);
      expect(parsed).toEqual({
        kind: "lab",
        key: uuid,
      });
    });

    it("parses health:<device_id> into canonical route", () => {
      const parsed = parseDeviceRoute("health:DEV-8888-8888");
      expect(parsed).toEqual({
        kind: "canonical",
        key: "DEV-8888-8888",
      });
    });

    it("parses a bare UUID into lab route to preserve old bookmarks", () => {
      const uuid = "12345678-1234-1234-1234-123456789abc";
      const parsed = parseDeviceRoute(uuid);
      expect(parsed).toEqual({
        kind: "lab",
        key: uuid,
      });
    });

    it("parses uppercase bare UUID into lab route", () => {
      const uuid = "ABCDEF01-2345-6789-ABCD-EF0123456789";
      const parsed = parseDeviceRoute(uuid);
      expect(parsed).toEqual({
        kind: "lab",
        key: uuid,
      });
    });

    it("parses DEV-XXXX-XXXX identifier into canonical route", () => {
      const parsed = parseDeviceRoute("DEV-11C2-77A0");
      expect(parsed).toEqual({
        kind: "canonical",
        key: "DEV-11C2-77A0",
      });
    });

    it("parses bare serial into canonical route", () => {
      const parsed = parseDeviceRoute("1000000000000001");
      expect(parsed).toEqual({
        kind: "canonical",
        key: "1000000000000001",
      });
    });

    it("parses hostname into canonical route", () => {
      const parsed = parseDeviceRoute("gened-mk4");
      expect(parsed).toEqual({
        kind: "canonical",
        key: "gened-mk4",
      });
    });

    it("handles URL encoded segments", () => {
      const parsed = parseDeviceRoute(encodeURIComponent("serial:1000000000000001"));
      expect(parsed).toEqual({
        kind: "canonical",
        key: "1000000000000001",
      });
    });
  });

  describe("deviceHref", () => {
    it("generates correct URL for canonical serial fleet_key", () => {
      expect(deviceHref({ fleet_key: "serial:1000000000000001" })).toBe(
        "/admin/devices/serial%3A1000000000000001",
      );
    });

    it("generates correct URL for lab fleet_key", () => {
      expect(
        deviceHref({ fleet_key: "lab:aaaaaaaa-0000-0000-0000-000000000001" }),
      ).toBe("/admin/devices/lab%3Aaaaaaaaa-0000-0000-0000-000000000001");
    });

    it("generates correct URL for health fleet_key", () => {
      expect(deviceHref({ fleet_key: "health:DEV-8888-8888" })).toBe(
        "/admin/devices/health%3ADEV-8888-8888",
      );
    });
  });
});
