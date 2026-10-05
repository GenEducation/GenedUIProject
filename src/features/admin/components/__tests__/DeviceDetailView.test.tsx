import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

import { DeviceDetailView } from "../DeviceDetailView";
import type {
  AdminDeviceDetail,
  CanonicalDevice,
  DeviceDiagnostic,
} from "../../devices/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const getFleetDevice = vi.hoisted(() => vi.fn());
const getDeviceLogs = vi.hoisted(() => vi.fn());
const listFleetLabs = vi.hoisted(() => vi.fn());
const getCanonicalDevice = vi.hoisted(() => vi.fn());
vi.mock("../../adminService", () => ({
  getFleetDevice,
  getDeviceLogs,
  listFleetLabs,
  getCanonicalDevice,
}));

/**
 * Default: not in the canonical registry. The self-test suite below predates
 * this system and must keep passing for a device that has never sent a
 * gened-health report, so the default is the empty state rather than a
 * populated fixture.
 */
beforeEach(() => {
  getCanonicalDevice.mockReset();
  getCanonicalDevice.mockResolvedValue(null);
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
    // Explicit rather than leaning on the "absent means ACTIVE" fallback: these
    // suites describe a device that IS currently in a Lab, and the historical
    // suite at the bottom of this file is testing the opposite.
    lab_tenancy_state: "ACTIVE",
    lab_tenancy_reason: null,
    ...overrides,
  };
}

describe("DeviceDetailView — self-test parsing", () => {
  it("reads real components from report.components, not the wrapper's top-level keys", async () => {
    getFleetDevice.mockResolvedValue(detail());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("Lab self-test")).toBeInTheDocument());

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

  it("surfaces report-level metadata as real fields in the Lab enrollment card, not fake components", async () => {
    getFleetDevice.mockResolvedValue(detail());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText(/Lab self-test report/)).toBeInTheDocument());

    const identity = screen.getByText("Lab enrollment").closest("section") as HTMLElement;
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
      expect(screen.getByText(/never reported a Lab self-test/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Lab self-test report/)).not.toBeInTheDocument();
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
    fresh_after_seconds: 10_800,
    diagnostic_freshness: "FRESH",
    report_interval_seconds: 3600,
    collected_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    clock_synced: true,
    last_ip: "10.0.3.19",
    schema_version: 1,
    redaction: "default",
    ...overrides,
  };
}

/**
 * The canonical device wrapper. Defaults to a device with NO presence transport,
 * because that is the ordinary state of a PERSONAL unit on a scheduled cadence —
 * and the case most likely to be wrongly rendered as offline.
 */
function canonical(overrides: Partial<CanonicalDevice> = {}): CanonicalDevice {
  // `"diagnostic" in overrides` rather than `??`: an explicit null means
  // "registered but has never reported", which is a state this card renders
  // differently from the default. `??` would silently replace it with a
  // populated report and the never-reported branch would never be tested.
  const diag = "diagnostic" in overrides ? overrides.diagnostic! : diagnostic();
  return {
    id: "11111111-1111-1111-1111-111111111111",
    serial: "10000000aabbccdd",
    reported_device_id: "gened-mk2",
    lab_hardware_id: null,
    derived_device_key: "DEV-AABB-CCDD",
    label: null,
    device_model: "Raspberry Pi 4 Model B Rev 1.4",
    last_reported_mode: "PERSONAL",
    provenance: "SELF_REGISTERED",
    connectivity: { state: "UNKNOWN", source: "NONE", reason: "no_presence_channel" },
    last_seen_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    last_seen_source: "HEALTH_POST",
    last_seen_age_seconds: 120,
    first_seen_at: new Date(Date.now() - 86_400_000).toISOString(),
    diagnostic_freshness: diag?.diagnostic_freshness ?? "NEVER_REPORTED",
    diagnostic_verdict: diag?.overall ?? null,
    // Default NONE: the canonical fixture is a PERSONAL unit with no Lab
    // history at all. The historical case is built explicitly below, so a
    // default of HISTORICAL here would silently put every other test in this
    // file into the repurposed-hardware branch.
    lab_tenancy: { state: "NONE", reason: null, enrollment: null },
    ...overrides,
    diagnostic: diag,
  };
}

function diagCard() {
  return screen.getByText("System diagnostic").closest("section") as HTMLElement;
}

/** The connectivity state, by accessible name. */
function connState() {
  return within(diagCard()).getByLabelText(/^Connectivity:/);
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
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic() }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(getCanonicalDevice).toHaveBeenCalled());
    // "d1" is the Lab row's UUID and would find nothing — the canonical device
    // is mode-independent and lives outside the Lab tables.
    expect(getCanonicalDevice).toHaveBeenCalledWith("DEV-ABCD-1234");
  });

  it("renders the verdict, tally and findings", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic() }),
    );
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
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic({
        overall: "PASS",
        tally: { PASS: 38, WARN: 0, FAIL: 0 },
        findings: [],
        findings_total: 0,
      }), }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(overallVerdict()).toHaveTextContent("PASS");
    expect(within(card).getByText(/Nothing actionable/)).toBeInTheDocument();
  });

  it("shows FAIL findings for a failing device", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic({
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
      }), }),
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
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic({ overall: "UNKNOWN", tally: { UNKNOWN: 4, PASS: 10 } }), }),
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
    /**
     * Registered but has never reported — distinct from "not in the registry",
     * which Phase 2 added as its own state and which is asserted separately.
     */
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(canonical({ diagnostic: null }));
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(within(card).getByText(/No gened-health report received yet/)).toBeInTheDocument();
    expect(within(card).getByText("unknown")).toBeInTheDocument();
    // The sentence as a whole, since <strong> splits the text node.
    expect(card.textContent).toContain("not confirmed healthy");
  });

  it("marks a stale report using the server's verdict", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic({
        fresh: false,
        diagnostic_freshness: "STALE",
        report_age_seconds: 5 * 3600,
        fresh_after_seconds: 10_800,
        report_interval_seconds: 3600,
        received_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
      }), }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    // The cadence shown comes from the server payload, not a local constant.
    expect(within(card).getByLabelText("Diagnostic freshness: STALE")).toBeInTheDocument();
    expect(card.textContent).toContain("expected every 60m");
    // A stale report still shows its last known verdict.
    expect(overallVerdict()).toHaveTextContent("WARN");
  });

  it("warns when the device clock is not synchronised", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic({ clock_synced: false, collected_at: "1999-01-01T00:00:00Z" }), }),
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
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic({ clock_synced: true }) }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    expect(screen.queryByText(/clock is not synchronised/)).not.toBeInTheDocument();
  });

  it("keeps the Lab self-test card intact alongside the diagnostic", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({ diagnostic: diagnostic() }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    // Both systems render. The new card is additive, not a replacement.
    expect(screen.getByText("Lab self-test")).toBeInTheDocument();
    expect(screen.getByText("audio_hat")).toBeInTheDocument();
    expect(screen.getByText("Lab actions")).toBeInTheDocument();
  });

  it("a failing diagnostic fetch does not take down the rest of the page", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockRejectedValue(new Error("diagnostic service unavailable"));
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    expect(within(diagCard()).getByText(/diagnostic service unavailable/)).toBeInTheDocument();
    // The Lab actions and self-test are unaffected.
    expect(screen.getByText("Lab actions")).toBeInTheDocument();
    expect(screen.getByText("audio_hat")).toBeInTheDocument();
  });
});

// ── The four dimensions stay independent ───────────────────────
//
// A single health light cannot express these, which is why the card does not
// have one. Each test below is a combination that occurs in production and
// would be rendered wrongly by a collapsed model.

const HEALTHY_COLOUR = "emerald";

describe("DeviceDetailView — connectivity vs diagnostic freshness", () => {
  it("renders UNKNOWN rather than OFFLINE when no presence channel exists", async () => {
    /**
     * THE case. A healthy PERSONAL device on a scheduled cadence holds no socket
     * open, so nothing can confirm reachability either way. Calling that OFFLINE
     * would report working hardware as dead — and no freshness window, however
     * generous, substitutes for a presence signal.
     */
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({
        connectivity: { state: "UNKNOWN", source: "NONE", reason: "no_presence_channel" },
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    expect(connState()).toHaveTextContent("UNKNOWN");
    expect(within(diagCard()).queryByText("OFFLINE")).not.toBeInTheDocument();
    // And it explains itself, because "unknown" with no cause is indistinguishable
    // from a bug.
    expect(within(diagCard()).getByText(/No live connection channel/i)).toBeInTheDocument();
  });

  it("never colours UNKNOWN connectivity as healthy", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({
        connectivity: { state: "UNKNOWN", source: "NONE", reason: "no_presence_channel" },
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    expect(connState().className).not.toContain(HEALTHY_COLOUR);
  });

  it("shows online and stale together without implying the device is broken", async () => {
    /** A broken reporting pipeline on a working device. */
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({
        connectivity: {
          state: "ONLINE",
          source: "LAB_WS",
          reason: null,
          heartbeat_age_seconds: 4,
          grace_seconds: 90,
        },
        diagnostic: diagnostic({
          overall: "PASS",
          tally: { PASS: 41 },
          findings: [],
          findings_total: 0,
          diagnostic_freshness: "STALE",
          fresh: false,
        }),
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    expect(connState()).toHaveTextContent("ONLINE");
    expect(overallVerdict()).toHaveTextContent("PASS");
    expect(
      within(diagCard()).getByLabelText("Diagnostic freshness: STALE"),
    ).toBeInTheDocument();
  });

  it("shows offline with a fresh report, which a report-derived model would call online", async () => {
    /** The dangerous direction: unplugged 20s ago, still holding a 1-minute-old report. */
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({
        connectivity: { state: "OFFLINE", source: "LAB_WS", reason: null },
        diagnostic: diagnostic({ overall: "PASS", diagnostic_freshness: "FRESH" }),
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    expect(connState()).toHaveTextContent("OFFLINE");
    expect(overallVerdict()).toHaveTextContent("PASS");
    expect(
      within(diagCard()).queryByLabelText("Diagnostic freshness: STALE"),
    ).not.toBeInTheDocument();
  });

  it("surfaces the multi-unit ambiguity rather than guessing", async () => {
    /**
     * The MQTT status topic is student-keyed and carries no device id, so with
     * two units per child one box's Last Will marks both offline. The flag is
     * wrong there, not merely imprecise.
     */
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({
        connectivity: {
          state: "UNKNOWN",
          source: "MQTT_STATUS",
          reason: "ambiguous_multi_unit",
          units_sharing_topic: 2,
        },
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    expect(connState()).toHaveTextContent("UNKNOWN");
    expect(within(diagCard()).getByText(/cannot name a single device/i)).toBeInTheDocument();
  });

  it("reports last-contact provenance alongside the timestamp", async () => {
    /**
     * "Last contact 2 minutes ago" is uninterpretable alone: a 3-second lab poll
     * and an hourly POST mean very different things by the same number.
     */
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({ last_seen_source: "LAB_WS" }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    expect(within(diagCard()).getByText(/LAB_WS/)).toBeInTheDocument();
  });

  it("distinguishes a pre-registered device from one that has gone silent", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({
        provenance: "PRE_PROVISIONED",
        diagnostic: null,
        last_seen_at: null,
        last_seen_source: null,
        last_seen_age_seconds: null,
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(within(card).getByText(/Pre-registered/i)).toBeInTheDocument();
    expect(within(card).getByText(/never heard from/i)).toBeInTheDocument();
    // "Never reported" must not read as "reported healthy". Asserted on the
    // card's text because <strong> splits the sentence across nodes.
    expect(card.textContent).toContain("not confirmed healthy");
  });

  it("renders the server's cadence rather than a hardcoded threshold", async () => {
    /**
     * The Lab surface's bug was a hardcoded 10-minute frontend constant against a
     * 15-minute backend. This card must read the server's number.
     */
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({
        diagnostic: diagnostic({
          diagnostic_freshness: "STALE",
          fresh: false,
          report_interval_seconds: 1800, // 30m, deliberately not the default
        }),
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    expect(within(diagCard()).getByText(/every 30m/)).toBeInTheDocument();
  });

  it("shows the canonical serial, not just an alias", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(canonical());
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    expect(within(diagCard()).getByText("10000000aabbccdd")).toBeInTheDocument();
  });

  it("renders an informative empty state when the device is not in the registry", async () => {
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(null);
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
    const card = diagCard();

    expect(within(card).getByText(/not in the canonical registry/i)).toBeInTheDocument();
    expect(within(card).getByText(/not confirmed healthy/i)).toBeInTheDocument();
    // Still must not take the Lab page down.
    expect(screen.getByText("Lab actions")).toBeInTheDocument();
  });
});

// ── Current state vs historical Lab state ──────────────────────
//
// The genedpi case, as a component test. One physical Pi served a term as
// "Desk 2" in Modern-Lab and came back as a PERSONAL unit; because the Lab
// alias is derived from the serial, the old enrollment still matches. The page
// used to render that enrollment as the device's identity, so it showed
// SCHOOL_LAB and a07b03c beside a canonical PERSONAL on 7dad1fd, and offered
// every Lab mutation on hardware that had left the Lab.

/** The Modern-Lab enrollment, as production holds it. */
function historicalLabDetail(overrides: Partial<AdminDeviceDetail> = {}) {
  return detail({
    device_label: "Desk 2",
    lab_name: "Modern-Lab",
    partner_organization: "Modern-Academy",
    hardware_id: "DEV-1E6B-2CE2",
    health_status: "OFFLINE",
    firmware_version: "a07b03c",
    last_ip: "10.10.33.215",
    last_heartbeat_at: "2026-08-24T09:12:00Z",
    last_connected_at: "2026-08-24T09:12:00Z",
    last_health_at: "2026-08-24T09:12:00Z",
    lab_tenancy_state: "HISTORICAL",
    lab_tenancy_reason: "enrollment_abandoned",
    ...overrides,
  });
}

/** The same hardware now: PERSONAL, 7dad1fd, no presence channel. */
function genedpiCanonical(overrides: Partial<CanonicalDevice> = {}) {
  return canonical({
    serial: "100000001e6b2ce2",
    derived_device_key: "DEV-1E6B-2CE2",
    lab_hardware_id: "DEV-1E6B-2CE2",
    provenance: "ENROLLED",
    last_reported_mode: "PERSONAL",
    connectivity: { state: "UNKNOWN", source: "NONE", reason: "no_presence_channel" },
    last_seen_source: "HEALTH_POST",
    diagnostic: diagnostic({
      serial: "100000001e6b2ce2",
      hostname: "gened-pi",
      mode: "PERSONAL",
      firmware_version: "7dad1fd",
      overall: "WARN",
    }),
    lab_tenancy: {
      state: "HISTORICAL",
      reason: "enrollment_abandoned",
      enrollment: {
        lab_device_id: "d1",
        device_label: "Desk 2",
        hardware_id: "DEV-1E6B-2CE2",
        lab_id: "l1",
        partner_id: "p1",
        firmware_version: "a07b03c",
        health_status: "OFFLINE",
        last_heartbeat_at: "2026-08-24T09:12:00Z",
        evidence_at: "2026-08-24T09:12:00Z",
      },
    },
    ...overrides,
  });
}

async function renderGenedpi(
  detailOverrides: Partial<AdminDeviceDetail> = {},
  canonicalOverrides: Partial<CanonicalDevice> = {},
) {
  getFleetDevice.mockResolvedValue(historicalLabDetail(detailOverrides));
  getCanonicalDevice.mockResolvedValue(genedpiCanonical(canonicalOverrides));
  render(<DeviceDetailView deviceId="d1" />);
  await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());
}

describe("DeviceDetailView — historical Lab tenancy", () => {
  it("names the physical device, not the desk it used to be", async () => {
    await renderGenedpi();

    // Case 11: identity comes from the canonical side.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("gened-pi");
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent("Desk 2");
  });

  it("shows the current mode and firmware, labelled as current", async () => {
    await renderGenedpi();
    const card = diagCard();

    // Case 11. Both values appear, and the ones that say "current" are the
    // canonical ones -- not the Lab's a07b03c / SCHOOL_LAB.
    expect(within(card).getByText("Current mode")).toBeInTheDocument();
    expect(within(card).getByText("PERSONAL")).toBeInTheDocument();
    expect(within(card).getByText("Current firmware")).toBeInTheDocument();
    expect(within(card).getByText("7dad1fd")).toBeInTheDocument();
    expect(within(card).queryByText("a07b03c")).not.toBeInTheDocument();
  });

  it("keeps the Lab's firmware and mode but scopes every label", async () => {
    await renderGenedpi();
    const lab = screen.getByText("Previous Lab enrollment").closest("section") as HTMLElement;

    // Case 12: history preserved, never presented as current.
    expect(within(lab).getByText("a07b03c")).toBeInTheDocument();
    expect(within(lab).getByText("Firmware at last Lab contact")).toBeInTheDocument();
    expect(within(lab).getByText("IP at last Lab contact")).toBeInTheDocument();
    expect(within(lab).getByText("Mode at self-test")).toBeInTheDocument();
    expect(within(lab).getByText("10.10.33.215")).toBeInTheDocument();

    // The unqualified labels are what made two values look like one answer.
    expect(within(lab).queryByText("Firmware")).not.toBeInTheDocument();
    expect(within(lab).queryByText("Mode")).not.toBeInTheDocument();
    expect(within(lab).queryByText("Last IP")).not.toBeInTheDocument();
  });

  it("explains the previous enrollment in a banner", async () => {
    await renderGenedpi();

    // Case 14: the old desk is named, dated, and marked as not current.
    const banner = screen.getByText(/Previously enrolled in a Lab/i).closest("div")!;
    expect(banner).toHaveTextContent("Desk 2");
    expect(banner).toHaveTextContent("Modern-Lab");
    expect(banner).toHaveTextContent(/not this device's current state/i);
  });

  it("renders old Lab timestamps absolutely, never as a relative age", async () => {
    await renderGenedpi();
    const lab = screen.getByText("Previous Lab enrollment").closest("section") as HTMLElement;

    // Case 14. relativeTime() on an August heartbeat is what made it read as
    // though it were live, so the heartbeat field must carry a real date and
    // none of the "x ago" phrasing.
    expect(within(lab).getByText("Last Lab heartbeat")).toBeInTheDocument();
    // Locale-agnostic: assert the year is rendered and that no field in this
    // card carries a bare relative age. absoluteTime() goes through
    // toLocaleString(), so matching a month name would only pass under en-US.
    expect(within(lab).getAllByText(/2026/).length).toBeGreaterThan(0);
    expect(within(lab).queryByText(/\bago\b/)).not.toBeInTheDocument();
  });

  it("does not show the Lab connectivity verdict as the device's status", async () => {
    await renderGenedpi();

    // Case 13. The header verdict is the canonical one; the Lab's OFFLINE is
    // confined to the Lab card, where it is labelled "(then)".
    const heading = screen.getByRole("heading", { level: 1 }).closest("div")!;
    expect(within(heading).getByLabelText("Connectivity: UNKNOWN")).toBeInTheDocument();

    const lab = screen.getByText("Previous Lab enrollment").closest("section") as HTMLElement;
    expect(within(lab).getByText("(then)")).toBeInTheDocument();
  });

  it("reports no presence channel rather than offline", async () => {
    await renderGenedpi();

    // Case 13: a recent HEALTH_POST is shown as contact, not as presence.
    expect(connState()).toHaveTextContent("UNKNOWN");
    expect(within(diagCard()).getByText(/HEALTH_POST/)).toBeInTheDocument();
    expect(within(diagCard()).getByText(/No live connection channel/i)).toBeInTheDocument();
  });

  it("marks the historical self-test so it cannot pass for a fresh one", async () => {
    await renderGenedpi();

    expect(screen.getByText("Lab self-test (historical)")).toBeInTheDocument();
    expect(
      screen.getByText(/From the previous Lab enrollment/i),
    ).toBeInTheDocument();
  });

  it("disables every Lab mutation except revoke", async () => {
    await renderGenedpi();

    // Cases 7 and 8, at the UI layer. lab-service rejects these with LAB_1116
    // regardless -- this is the courtesy half of the pair.
    expect(screen.getByRole("button", { name: /Force online/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Move lab/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Rename/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /spare/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Rotate token/i })).toBeDisabled();

    // The way out of this state must stay available.
    expect(screen.getByRole("button", { name: /Revoke/i })).toBeEnabled();
  });

  it("says why the Lab actions are unavailable", async () => {
    await renderGenedpi();

    expect(screen.getByText(/this Lab enrollment is historical/i)).toBeInTheDocument();
    expect(screen.getByText(/Revoke is still available/i)).toBeInTheDocument();
  });

  it("falls back to the Lab payload's tenancy when the registry fetch fails", async () => {
    // A page that cannot reach the registry must still refuse to present Lab
    // data as current -- otherwise the one time the fix matters most (the
    // registry is down) is the one time it is absent.
    getFleetDevice.mockResolvedValue(historicalLabDetail());
    getCanonicalDevice.mockRejectedValue(new Error("registry unavailable"));
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() =>
      expect(screen.getByText("Previous Lab enrollment")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Force online/i })).toBeDisabled();
  });
});

describe("DeviceDetailView — active Lab tenancy is unchanged", () => {
  it("keeps the desk label, the present-tense card and every action", async () => {
    // Case 10. The fix must not cost a genuine Lab device anything.
    getFleetDevice.mockResolvedValue(detail());
    getCanonicalDevice.mockResolvedValue(
      canonical({
        last_reported_mode: "SCHOOL_LAB",
        connectivity: { state: "ONLINE", source: "LAB_WS", reason: null },
        lab_tenancy: {
          state: "ACTIVE",
          reason: null,
          enrollment: {
            lab_device_id: "d1",
            device_label: "Desk 1",
            hardware_id: "DEV-0001",
            lab_id: "l1",
            partner_id: "p1",
            firmware_version: "1.4.2",
            health_status: "ONLINE",
            last_heartbeat_at: new Date(Date.now() - 3000).toISOString(),
            evidence_at: new Date(Date.now() - 3000).toISOString(),
          },
        },
      }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("System diagnostic")).toBeInTheDocument());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Desk 1");
    expect(screen.getByText("Lab enrollment")).toBeInTheDocument();
    expect(screen.getByText("Spring Dale › Computer Lab 1")).toBeInTheDocument();
    expect(screen.queryByText(/Previously enrolled in a Lab/i)).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Force online/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Move lab/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Rename/i })).toBeEnabled();
  });

  it("still blocks Lab actions on a revoked enrollment", async () => {
    // The old gate was not wrong, only incomplete. It must still hold.
    getFleetDevice.mockResolvedValue(
      detail({ revoked_at: "2026-09-01T00:00:00Z", lab_tenancy_state: "ACTIVE" }),
    );
    render(<DeviceDetailView deviceId="d1" />);

    await waitFor(() => expect(screen.getByText("Lab actions")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /Force online/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Move lab/i })).toBeDisabled();
  });
});
