import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

import { DeviceDetailView } from "../DeviceDetailView";
import type { AdminDeviceDetail, DeviceDiagnostic } from "../../devices/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const getFleetDevice = vi.hoisted(() => vi.fn());
const getDeviceLogs = vi.hoisted(() => vi.fn());
const listFleetLabs = vi.hoisted(() => vi.fn());
const getDeviceDiagnostic = vi.hoisted(() => vi.fn());
vi.mock("../../adminService", () => ({
  getFleetDevice,
  getDeviceLogs,
  listFleetLabs,
  getDeviceDiagnostic,
}));

/**
 * Default: no gened-health report. The self-test suite below predates this
 * system and must keep passing for a device that has never sent one, so the
 * default is the empty state rather than a populated fixture.
 */
beforeEach(() => {
  getDeviceDiagnostic.mockReset();
  getDeviceDiagnostic.mockResolvedValue(null);
});

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

// ── gened-health system diagnostic ─────────────────────────────

function diagnostic(overrides: Partial<DeviceDiagnostic> = {}): DeviceDiagnostic {
  return {
    serial: "10000000aabbccdd",
    device_key: "DEV-0001",
    reported_device_id: "gened-mk2",
    hostname: "genedmk2",
    device_model: "Raspberry Pi 4 Model B Rev 1.4",
    mode: "PERSONAL",
    firmware_version: "de4f862",
    tool_version: "de4f862",
    deployed_version: "de4f862",
    overall: "WARN",
    tally: { PASS: 30, WARN: 2, FAIL: 0, UNKNOWN: 2, INFO: 5, SKIP: 1 },
    findings: [
      {
        id: "provenance.deploy.runtime_divergence",
        status: "WARN",
        subsystem: "provenance",
        title: "OTA deployment drift",
        detail: "3 files differ between /opt/gened-src and /opt/gened",
        next_step: "Run the same rsync with --dry-run yourself to see the file list.",
      },
    ],
    findings_total: 1,
    received_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    report_age_seconds: 120,
    fresh: true,
    fresh_after_seconds: 900,
    collected_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    clock_synced: true,
    last_ip: "10.0.3.19",
    schema_version: 1,
    redaction: "default",
    ...overrides,
  };
}

function diagCard() {
  return screen.getByText("System diagnostic").closest("section") as HTMLElement;
}

/**
 * The overall verdict, by accessible name. Querying the bare status text would
 * be ambiguous: the same string also appears as a tally label, which is correct
 * in the UI (one is the verdict, one is a count) but matches twice.
 */
function overallVerdict() {
  return within(diagCard()).getByLabelText(/^Overall diagnostic verdict:/);
}

/** A tally label, which renders as the `dt` of its count. */
function tallyLabel(status: string) {
  return within(diagCard()).queryByText(status, { selector: "dt" });
}

describe("DeviceDetailView — gened-health system diagnostic", () => {
  it("keys the diagnostic lookup on hardware_id, not the LabDevice UUID", async () => {
    getFleetDevice.mockResolvedValue(detail({ hardware_id: "DEV-ABCD-1234" }));
    getDeviceDiagnostic.mockResolvedValue(diagnostic());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(getDeviceDiagnostic).toHaveBeenCalled());
    // "d1" is the Lab row's UUID and would find nothing — the diagnostic is
    // mode-independent and lives outside the Lab tables.
    expect(getDeviceDiagnostic).toHaveBeenCalledWith("DEV-ABCD-1234");
  });

  it("renders the verdict, tally and findings", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(diagnostic());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(within(card).getByText("powered by gened-health")).toBeInTheDocument();
    expect(overallVerdict()).toHaveTextContent("WARN");
    expect(within(card).getByText(/Reported/)).toBeInTheDocument();

    // Tally counts present in the payload render; a zero one does not.
    expect(within(card).getByText("30")).toBeInTheDocument();
    expect(tallyLabel("PASS")).toBeInTheDocument();
    expect(tallyLabel("FAIL")).not.toBeInTheDocument();

    // The finding, with its next step.
    expect(within(card).getByText("OTA deployment drift")).toBeInTheDocument();
    expect(within(card).getByText(/3 files differ/)).toBeInTheDocument();
    expect(within(card).getByText(/Next step:/)).toBeInTheDocument();
  });

  it("renders a PASS device without inventing findings", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(
      diagnostic({
        overall: "PASS",
        tally: { PASS: 38, WARN: 0, FAIL: 0 },
        findings: [],
        findings_total: 0,
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(overallVerdict()).toHaveTextContent("PASS");
    expect(within(card).getByText(/Nothing actionable/)).toBeInTheDocument();
  });

  it("shows FAIL findings for a failing device", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(
      diagnostic({
        overall: "FAIL",
        tally: { PASS: 15, FAIL: 3, WARN: 4, UNKNOWN: 2 },
        findings: [
          {
            id: "audio.card.enumeration",
            status: "FAIL",
            subsystem: "audio",
            title: "The WM8960 audio HAT enumerates",
            detail: "no card matching 'wm8960' in /proc/asound/cards",
            next_step: "Check the dtoverlay in /boot/firmware/config.txt.",
          },
        ],
        findings_total: 1,
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(overallVerdict()).toHaveTextContent("FAIL");
    expect(within(card).getByText("The WM8960 audio HAT enumerates")).toBeInTheDocument();
    expect(within(card).getByText("audio")).toBeInTheDocument();
    // UNKNOWN is a real count and must be visible, not folded into healthy.
    expect(tallyLabel("UNKNOWN")).toBeInTheDocument();
  });

  it("never renders UNKNOWN with the healthy colour", async () => {
    /**
     * Contract requirement, not a style preference: UNKNOWN means gened-health
     * could not look. For audio and display it specifically means the app was
     * unreachable, so the hardware verdict is genuinely unknown rather than
     * fine. Painting it the PASS colour would report a confident wrong answer.
     * See the device repo docs/17-gened-health-schema.md, ingestion note 5.
     */
    const HEALTHY = "059F6D"; // the PASS green
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(
      diagnostic({ overall: "UNKNOWN", tally: { UNKNOWN: 4, PASS: 10 } }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    expect(overallVerdict().className).not.toContain(HEALTHY);

    const label = tallyLabel("UNKNOWN") as HTMLElement;
    expect(label).toBeInTheDocument();
    // The colour lives on the chip wrapping the dt/dd pair.
    expect(label.parentElement?.className).not.toContain(HEALTHY);

    // The PASS tally in the same report still gets the healthy colour, so this
    // is asserting UNKNOWN specifically and not just that nothing is green.
    expect(tallyLabel("PASS")?.parentElement?.className).toContain(HEALTHY);
  });

  it("renders the no-report state as unknown, not healthy", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(null);
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(within(card).getByText(/No gened-health report received yet/)).toBeInTheDocument();
    expect(within(card).getByText("unknown")).toBeInTheDocument();
  });

  it("marks a stale report using the server's verdict", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(
      diagnostic({
        fresh: false,
        report_age_seconds: 28 * 60,
        fresh_after_seconds: 900,
        received_at: new Date(Date.now() - 28 * 60_000).toISOString(),
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    // The threshold shown comes from the server payload, not a local constant.
    expect(within(card).getByText(/Stale — no report in over 15m/)).toBeInTheDocument();
    // A stale report still shows its last known verdict.
    expect(overallVerdict()).toHaveTextContent("WARN");
  });

  it("warns when the device clock is not synchronised", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(
      diagnostic({ clock_synced: false, collected_at: "1999-01-01T00:00:00Z" }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(within(card).getByText(/clock is not synchronised/)).toBeInTheDocument();
    // Report age is the server's and must still be presented normally.
    expect(within(card).getByText(/Reported/)).toBeInTheDocument();
  });

  it("does not warn about the clock when it is synchronised", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(diagnostic({ clock_synced: true }));
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    expect(screen.queryByText(/clock is not synchronised/)).not.toBeInTheDocument();
  });

  it("keeps the Lab self-test card intact alongside the diagnostic", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockResolvedValue(diagnostic());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    // Both systems render. The new card is additive, not a replacement.
    expect(screen.getByText("Self-test")).toBeInTheDocument();
    expect(screen.getByText("audio_hat")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("a failing diagnostic fetch does not take down the rest of the page", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getDeviceDiagnostic.mockRejectedValue(new Error("diagnostic service unavailable"));
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    expect(within(diagCard()).getByText(/diagnostic service unavailable/)).toBeInTheDocument();
    // The Lab actions and self-test are unaffected.
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("audio_hat")).toBeInTheDocument();
  });
});
