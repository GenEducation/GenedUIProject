import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NetworkPanel } from "../panels/NetworkPanel";
import { SystemPanel } from "../panels/SystemPanel";
import { StoragePanel } from "../panels/StoragePanel";
import { PowerPanel } from "../panels/PowerPanel";
import { ServicesPanel } from "../panels/ServicesPanel";
import { ProvenancePanel } from "../panels/ProvenancePanel";
import type {
  NetworkPanel as NetworkPanelT,
  SystemPanel as SystemPanelT,
  StoragePanel as StoragePanelT,
  PowerPanel as PowerPanelT,
  ServicesPanel as ServicesPanelT,
  ProvenancePanel as ProvenancePanelT,
} from "../reportTypes";

describe("Panels", () => {
  describe("NetworkPanel", () => {
    it("renders network details, WiFi association, and server observed IP", () => {
      const panel: NetworkPanelT = {
        primary_ip: { state: "OK", value: "192.168.1.50", unit: null, source_check: "chk", note: null },
        interfaces: {
          state: "OK",
          value: [{ name: "wlan0", addresses: ["192.168.1.50/24"], operstate: "up", carrier: true }],
          unit: null,
          source_check: "chk",
          note: null,
        },
        default_routes: { state: "OK", value: ["192.168.1.1 via wlan0"], unit: null, source_check: "chk", note: null },
        nameservers: { state: "OK", value: ["1.1.1.1"], unit: null, source_check: "chk", note: null },
        addresses_hidden_from_the_app: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        wifi: {
          state: "OK",
          value: [
            {
              interface: "wlan0",
              ssid: "School-WiFi-5G",
              signal_dbm: -58,
              signal_percent: 84,
              band: "5GHz",
              channel: 36,
              tx_bitrate_mbps: 150,
            },
          ],
          unit: null,
          source_check: "network.wifi.association",
          note: null,
        },
        regulatory_domain: { state: "OK", value: "IN", unit: null, source_check: "chk", note: null },
        own_hotspot_active: { state: "OK", value: false, unit: null, source_check: "chk", note: null },
        active_connections: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        hostname_running: { state: "OK", value: "gened-mk4", unit: null, source_check: "chk", note: null },
        hostname_configured: { state: "OK", value: "gened-mk4", unit: null, source_check: "chk", note: null },
        mdns_collision_generation: { state: "OK", value: 0, unit: null, source_check: "chk", note: null },
        server_observed_ip: {
          state: "OK",
          value: "203.0.113.19",
          unit: null,
          source_check: null,
          note: "NAT peer",
        },
        sources: {
          "network.wifi.association": { status: "INFO", detail: "associated to School-WiFi-5G", next_step: null },
        },
      };

      render(<NetworkPanel panel={panel} />);
      expect(screen.getByText("192.168.1.50")).toBeInTheDocument();
      expect(screen.getByText("203.0.113.19")).toBeInTheDocument();
      expect(screen.getByText("School-WiFi-5G")).toBeInTheDocument();
      expect(screen.getByText("-58 dBm (84%)")).toBeInTheDocument();
      expect(screen.getByText(/associated to School-WiFi-5G/)).toBeInTheDocument();
    });

    it("renders NOT_REPORTED message when wifi check is absent", () => {
      const panel: NetworkPanelT = {
        primary_ip: { state: "OK", value: "10.0.0.5", unit: null, source_check: null, note: null },
        interfaces: { state: "OK", value: [], unit: null, source_check: null, note: null },
        default_routes: { state: "OK", value: [], unit: null, source_check: null, note: null },
        nameservers: { state: "OK", value: [], unit: null, source_check: null, note: null },
        addresses_hidden_from_the_app: { state: "OK", value: [], unit: null, source_check: null, note: null },
        wifi: { state: "NOT_REPORTED", value: null, unit: null, source_check: null, note: null },
        regulatory_domain: { state: "NOT_REPORTED", value: null, unit: null, source_check: null, note: null },
        own_hotspot_active: { state: "OK", value: false, unit: null, source_check: null, note: null },
        active_connections: { state: "OK", value: [], unit: null, source_check: null, note: null },
        hostname_running: { state: "OK", value: "gened", unit: null, source_check: null, note: null },
        hostname_configured: { state: "OK", value: "gened", unit: null, source_check: null, note: null },
        mdns_collision_generation: { state: "OK", value: 0, unit: null, source_check: null, note: null },
        server_observed_ip: { state: "NOT_IN_METRICS", value: null, unit: null, source_check: null, note: null },
        sources: {},
      };

      render(<NetworkPanel panel={panel} />);
      expect(screen.getByText("WiFi association not reported by this firmware")).toBeInTheDocument();
    });

    it("renders WiFi association and network interfaces when provided as dictionary objects", () => {
      const panel: NetworkPanelT = {
        primary_ip: { state: "OK", value: "10.86.203.5", unit: null, source_check: "chk", note: null },
        interfaces: {
          state: "OK",
          value: {
            wlan0: { addresses: ["10.86.203.5/24"], operstate: "up", carrier: true },
          },
          unit: null,
          source_check: "chk",
          note: null,
        },
        default_routes: { state: "OK", value: ["default via 10.86.203.1 dev wlan0"], unit: null, source_check: "chk", note: null },
        nameservers: { state: "OK", value: ["10.86.203.1"], unit: null, source_check: "chk", note: null },
        addresses_hidden_from_the_app: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        wifi: {
          state: "OK",
          value: {
            wlan0: {
              ssid: "Pixel 10a",
              signal_dbm: -42,
              signal_percent: 86,
              band: "2.4GHz",
              channel: 1,
              tx_bitrate_mbps: 72.2,
              interface_type: "managed",
            },
          },
          unit: null,
          source_check: "network.wifi.association",
          note: null,
        },
        regulatory_domain: { state: "OK", value: "IN", unit: null, source_check: "chk", note: null },
        own_hotspot_active: { state: "OK", value: false, unit: null, source_check: "chk", note: null },
        active_connections: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        hostname_running: { state: "OK", value: "gened-pi", unit: null, source_check: "chk", note: null },
        hostname_configured: { state: "OK", value: "gened-pi", unit: null, source_check: "chk", note: null },
        mdns_collision_generation: { state: "OK", value: 0, unit: null, source_check: "chk", note: null },
        server_observed_ip: { state: "OK", value: "10.86.203.5", unit: null, source_check: null, note: null },
        sources: {
          "network.wifi.association": { status: "INFO", detail: "wlan0 joined to Pixel 10a at -42 dBm", next_step: null },
        },
      };

      render(<NetworkPanel panel={panel} />);
      expect(screen.getByText("Pixel 10a")).toBeInTheDocument();
      expect(screen.getByText("-42 dBm (86%)")).toBeInTheDocument();
      expect(screen.getByText("Band: 2.4GHz")).toBeInTheDocument();
      expect(screen.getByText("72.2 Mbps tx")).toBeInTheDocument();
      expect(screen.getAllByText("wlan0")).toHaveLength(2);
    });
  });

  describe("SystemPanel", () => {
    it("renders system health, SoC temp and load metrics", () => {
      const panel: SystemPanelT = {
        uptime_seconds: { state: "OK", value: 3600, unit: "s", source_check: "chk", note: null },
        uptime_human: { state: "OK", value: "1h 00m", unit: null, source_check: "chk", note: null },
        boot_id: { state: "OK", value: "boot-abc-123", unit: null, source_check: "chk", note: null },
        load_1m: { state: "OK", value: 0.42, unit: null, source_check: "chk", note: null },
        load_5m: { state: "OK", value: 0.35, unit: null, source_check: "chk", note: null },
        load_15m: { state: "OK", value: 0.28, unit: null, source_check: "chk", note: null },
        soc_temperature_c: { state: "OK", value: 48.5, unit: "C", source_check: "chk", note: null },
        thermal_note: { state: "OK", value: "normal", unit: null, source_check: "chk", note: null },
        throttling: { state: "OK", value: { currently_throttled: false }, unit: null, source_check: "chk", note: null },
        memory: { state: "OK", value: { total_mb: 1824, available_mb: 1100 }, unit: null, source_check: "chk", note: null },
        clock_synchronized: { state: "OK", value: true, unit: null, source_check: "chk", note: null },
        timezone: { state: "OK", value: "Asia/Kolkata", unit: null, source_check: "chk", note: null },
        os: { state: "OK", value: "Debian 12", unit: null, source_check: "chk", note: null },
        kernel: { state: "OK", value: "6.6.20+rpt", unit: null, source_check: "chk", note: null },
        model: { state: "OK", value: "Raspberry Pi 4 Model B Rev 1.5", unit: null, source_check: "chk", note: null },
        wifi_regdomain_declared: { state: "OK", value: "IN", unit: null, source_check: "chk", note: null },
        kernel_tainted: { state: "OK", value: "0", unit: null, source_check: "chk", note: null },
        sources: {},
      };

      render(<SystemPanel panel={panel} />);
      expect(screen.getByText("1h 00m")).toBeInTheDocument();
      expect(screen.getByText("48.5 C")).toBeInTheDocument();
      expect(screen.getByText("0.42, 0.35, 0.28")).toBeInTheDocument();
      expect(screen.getByText("Raspberry Pi 4 Model B Rev 1.5")).toBeInTheDocument();
      expect(screen.getByText("Debian 12")).toBeInTheDocument();
    });
  });

  describe("StoragePanel", () => {
    it("renders filesystems table and low space warnings", () => {
      const panel: StoragePanelT = {
        filesystems: {
          state: "OK",
          value: [
            { mount: "/", size_human: "29G", used_human: "7.2G", free_human: "21G", use_pct: "26%" },
          ],
          unit: null,
          source_check: "chk",
          note: null,
        },
        low_space: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        read_only_mounts: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        overlay_active: { state: "OK", value: true, unit: null, source_check: "chk", note: null },
        writes_persist: { state: "OK", value: true, unit: null, source_check: "chk", note: null },
        sources: {},
      };

      render(<StoragePanel panel={panel} />);
      expect(screen.getByText("/")).toBeInTheDocument();
      expect(screen.getByText("29G")).toBeInTheDocument();
      expect(screen.getByText("21G")).toBeInTheDocument();
      expect(screen.getByText("Active Overlay")).toBeInTheDocument();
    });
  });

  describe("PowerPanel", () => {
    it("renders battery level and charger state", () => {
      const panel: PowerPanelT = {
        battery_percent: { state: "OK", value: 87, unit: "%", source_check: "chk", note: null },
        battery_voltage_v: { state: "OK", value: 4.12, unit: "V", source_check: "chk", note: null },
        charger_present: { state: "OK", value: true, unit: null, source_check: "chk", note: null },
        power_source: { state: "OK", value: "BATTERY", unit: null, source_check: "chk", note: null },
        battery_configuration: { state: "SKIPPED", value: null, unit: null, source_check: "chk", note: null },
        charger_configuration: { state: "SKIPPED", value: null, unit: null, source_check: "chk", note: null },
        sources: {},
      };

      render(<PowerPanel panel={panel} />);
      expect(screen.getByText("87 %")).toBeInTheDocument();
      expect(screen.getByText("4.12 V")).toBeInTheDocument();
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  describe("ServicesPanel", () => {
    it("renders app components and service units", () => {
      const panel: ServicesPanelT = {
        units: {
          state: "OK",
          value: [{ name: "gened-app.service", active_state: "active", sub_state: "running", restart_count: 0 }],
          unit: null,
          source_check: "chk",
          note: null,
        },
        units_with_restarts: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        app_serving: { state: "OK", value: { http_status: 200, pid: 1420 }, unit: null, source_check: "chk", note: null },
        app_report_components: {
          state: "OK",
          value: {
            power: { status: "ok", detail: "Battery normal", metrics: { percent: 87 } },
          },
          unit: null,
          source_check: "chk",
          note: null,
        },
        app_report_failed: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        app_report_checked_at: { state: "OK", value: "2026-10-07T00:00:00Z", unit: null, source_check: "chk", note: null },
        app_report_not_covered: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        journal_persistent: { state: "OK", value: true, unit: null, source_check: "chk", note: null },
        slow_units: { state: "OK", value: [], unit: null, source_check: "chk", note: null },
        sources: {},
      };

      render(<ServicesPanel panel={panel} />);
      expect(screen.getByText("200")).toBeInTheDocument();
      expect(screen.getByText("1420")).toBeInTheDocument();
      expect(screen.getByText("gened-app.service")).toBeInTheDocument();
      expect(screen.getByText("Battery normal")).toBeInTheDocument();
    });
  });

  describe("ProvenancePanel", () => {
    it("renders mode, versions, and git tree provenance", () => {
      const panel: ProvenancePanelT = {
        mode: { state: "OK", value: "PERSONAL", unit: null, source_check: "chk", note: null },
        mode_source: { state: "OK", value: "file:/etc/gened-device/mode", unit: null, source_check: "chk", note: null },
        mode_file_present: { state: "OK", value: true, unit: null, source_check: "chk", note: null },
        firmware_stamp: { state: "OK", value: "7dad1fd", unit: null, source_check: "chk", note: null },
        firmware_stamp_present: { state: "OK", value: true, unit: null, source_check: "chk", note: null },
        tool_version: { state: "OK", value: "0.9.1", unit: null, source_check: "chk", note: null },
        deployed_version: { state: "OK", value: "0.9.1", unit: null, source_check: "chk", note: null },
        git_trees: { state: "OK", value: { clean: true }, unit: null, source_check: "chk", note: null },
        distinct_heads: { state: "OK", value: ["7dad1fd"], unit: null, source_check: "chk", note: null },
        code_drift: { state: "OK", value: { drift: false }, unit: null, source_check: "chk", note: null },
        ota_interlock: { state: "OK", value: { would_abort: false }, unit: null, source_check: "chk", note: null },
        ota_last_run: { state: "OK", value: null, unit: null, source_check: "chk", note: null },
        crash_budget: { state: "OK", value: { remaining: 5 }, unit: null, source_check: "chk", note: null },
        recovery_transaction: { state: "OK", value: null, unit: null, source_check: "chk", note: null },
        stored: {
          mode: "PERSONAL",
          firmware_version: "7dad1fd",
          tool_version: "0.9.1",
          deployed_version: "0.9.1",
        },
        sources: {},
      };

      render(<ProvenancePanel panel={panel} />);
      expect(screen.getAllByText("PERSONAL").length).toBeGreaterThan(0);
      expect(screen.getByText("file:/etc/gened-device/mode")).toBeInTheDocument();
      expect(screen.getAllByText("7dad1fd").length).toBeGreaterThan(0);
    });
  });
});
