import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeviceHealthStrip } from "../DeviceHealthStrip";
import { DeviceDiagnosticsModal } from "../DeviceDiagnosticsModal";
import type { DeviceResponse } from "../../types/lab";

/**
 * Fixtures are the literal gateway response for lab
 * ef17145e-174b-49f0-8709-35ad3d2d6e17, so these tests fail if the rendering
 * assumptions drift from the real payload.
 */
const ONLINE_DESK: DeviceResponse = {
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
    checked_at: "2026-08-06T10:33:34Z",
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
          speaker_raw: 109,
        },
      },
      audio_hat: {
        status: "ok",
        detail: "card 3; capture path routed; 51 frames, peak 23229",
        metrics: {
          peak: 23229,
          frames: 51,
          distinct: 4756,
          alsa_card: 3,
          mixer: { "ADC PCM": 225, Capture: 53, "Left Input Mixer Boost": true },
        },
      },
    },
    schema_version: 1,
    firmware_version: "380255f",
  },
};

const REVOKED_DESK: DeviceResponse = {
  ...ONLINE_DESK,
  id: "24931e7a-46e6-416b-8796-ff23ea583861",
  device_label: "Desk 1",
  hardware_id: "revoked:24931e7a-46e6-416b-8796-ff23ea583861:DEV-BF5A-A492",
  last_heartbeat_at: null,
  firmware_version: "9efae0f",
  first_connected_at: null,
  last_connected_at: null,
  revoked_at: "2026-08-05T16:35:00.733700Z",
  last_health_report: null,
  last_health_at: null,
  last_ip: null,
};

describe("DeviceHealthStrip", () => {
  it("renders one glyph per reported subsystem", () => {
    render(<DeviceHealthStrip device={ONLINE_DESK} onOpenDiagnostics={vi.fn()} />);

    expect(screen.getByTitle("Display — OK")).toBeInTheDocument();
    expect(screen.getByTitle("Speaker — OK")).toBeInTheDocument();
    expect(screen.getByTitle("Microphone — OK")).toBeInTheDocument();
  });

  it("frames a passing report on an offline device as historical", () => {
    render(<DeviceHealthStrip device={ONLINE_DESK} onOpenDiagnostics={vi.fn()} />);

    // The device self-reported "ok" but is unreachable — the rail must say so.
    expect(screen.getByRole("button").textContent).toContain("Last self-test");
    expect(screen.getByRole("button").getAttribute("aria-label")).toContain("Last known");
  });

  it("shows uptime from the report", () => {
    render(<DeviceHealthStrip device={ONLINE_DESK} onOpenDiagnostics={vi.fn()} />);
    expect(screen.getByRole("button").textContent).toContain("2h 14m");
  });

  it("renders nothing for a revoked device", () => {
    const { container } = render(
      <DeviceHealthStrip device={REVOKED_DESK} onOpenDiagnostics={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the device has never reported", () => {
    const { container } = render(
      <DeviceHealthStrip
        device={{ ...ONLINE_DESK, last_health_report: null }}
        onOpenDiagnostics={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens diagnostics when clicked", async () => {
    const onOpen = vi.fn();
    render(<DeviceHealthStrip device={ONLINE_DESK} onOpenDiagnostics={onOpen} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith(ONLINE_DESK);
  });

  it("renders a subsystem the client has never seen before", () => {
    const withNewSubsystem: DeviceResponse = {
      ...ONLINE_DESK,
      last_health_report: {
        ...ONLINE_DESK.last_health_report,
        components: {
          ...ONLINE_DESK.last_health_report!.components,
          zigbee_radio: { status: "some_future_state", detail: "n/a" },
        },
      },
    };
    render(<DeviceHealthStrip device={withNewSubsystem} onOpenDiagnostics={vi.fn()} />);
    expect(screen.getByTitle("Zigbee Radio — Unknown")).toBeInTheDocument();
  });
});

describe("DeviceDiagnosticsModal", () => {
  it("renders nothing when no device is selected", () => {
    const { container } = render(<DeviceDiagnosticsModal device={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("separates live link state from the last self-test", () => {
    render(<DeviceDiagnosticsModal device={ONLINE_DESK} onClose={vi.fn()} />);

    expect(screen.getByText("Link")).toBeInTheDocument();
    expect(screen.getByText("Last known self-test")).toBeInTheDocument();
    expect(
      screen.getByText(/not reachable right now[\s\S]*state at the time of the last check/i),
    ).toBeInTheDocument();
  });

  it("renders every metric, including nested mixer values, without hardcoding names", () => {
    render(<DeviceDiagnosticsModal device={ONLINE_DESK} onClose={vi.fn()} />);

    expect(screen.getByText("23229")).toBeInTheDocument(); // audio_hat.peak
    expect(screen.getByText("4756")).toBeInTheDocument(); // audio_hat.distinct
    expect(screen.getByText("92")).toBeInTheDocument(); // display.crtc_id
    expect(screen.getAllByText("Mixer").length).toBe(2); // nested sub-grids
    expect(screen.getByText("Left Output Mixer PCM")).toBeInTheDocument();
    // Acronyms in mixer channel names survive humanization intact.
    expect(screen.getByText("ADC PCM")).toBeInTheDocument();
  });

  it("shows the device identity and cleaned hardware id", () => {
    render(<DeviceDiagnosticsModal device={ONLINE_DESK} onClose={vi.fn()} />);

    expect(screen.getByText("Desk")).toBeInTheDocument();
    expect(screen.getByText("DEV-BF5A-A492")).toBeInTheDocument();
    expect(screen.getByText("SNBF5AA492")).toBeInTheDocument();
    expect(screen.getAllByText("10.10.34.49").length).toBeGreaterThan(0);
  });

  it("strips the revocation prefix from a revoked device's hardware id", () => {
    render(<DeviceDiagnosticsModal device={REVOKED_DESK} onClose={vi.fn()} />);
    expect(screen.getByText("DEV-BF5A-A492")).toBeInTheDocument();
    expect(screen.queryByText(/^revoked:/)).not.toBeInTheDocument();
    expect(screen.getByText("No self-test reported yet")).toBeInTheDocument();
  });

  it("warns when the address changed since the self-test", () => {
    render(
      <DeviceDiagnosticsModal device={{ ...ONLINE_DESK, last_ip: "10.10.34.77" }} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/moved to a different address/i)).toBeInTheDocument();
    expect(screen.getByText("Address (current)")).toBeInTheDocument();
    expect(screen.getByText("Address (at self-test)")).toBeInTheDocument();
  });

  it("calls out failing subsystems", () => {
    const failing: DeviceResponse = {
      ...ONLINE_DESK,
      last_health_report: {
        ...ONLINE_DESK.last_health_report,
        status: "fail",
        failed: ["audio_hat"],
        components: {
          ...ONLINE_DESK.last_health_report!.components,
          audio_hat: { status: "fail", detail: "no capture device", metrics: {} },
        },
      },
    };
    render(<DeviceDiagnosticsModal device={failing} onClose={vi.fn()} />);

    expect(screen.getByText(/1 subsystem failing/i)).toBeInTheDocument();
    expect(screen.getByText(/Microphone\./)).toBeInTheDocument();
    expect(screen.getByText("no capture device")).toBeInTheDocument();
  });

  it("warns on firmware drift between the record and the report", () => {
    const drifted: DeviceResponse = {
      ...ONLINE_DESK,
      last_health_report: { ...ONLINE_DESK.last_health_report, firmware_version: "9efae0f" },
    };
    render(<DeviceDiagnosticsModal device={drifted} onClose={vi.fn()} />);
    expect(screen.getByText(/update may not have completed/i)).toBeInTheDocument();
  });

  it("closes on Escape and on the close button", async () => {
    const onClose = vi.fn();
    render(<DeviceDiagnosticsModal device={ONLINE_DESK} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();

    onClose.mockClear();
    await userEvent.click(screen.getByLabelText("Close diagnostics"));
    expect(onClose).toHaveBeenCalled();
  });

  it("exposes the raw report for support escalation", () => {
    render(<DeviceDiagnosticsModal device={ONLINE_DESK} onClose={vi.fn()} />);
    const raw = screen.getByText("Raw report").closest("details");
    expect(within(raw!).getByText(/"schema_version": 1/)).toBeInTheDocument();
  });

  it("survives a report whose components map is malformed", () => {
    const broken: DeviceResponse = {
      ...ONLINE_DESK,
      last_health_report: { status: "ok", components: null as never },
    };
    expect(() => render(<DeviceDiagnosticsModal device={broken} onClose={vi.fn()} />)).not.toThrow();
  });
});
