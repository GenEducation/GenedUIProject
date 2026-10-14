"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  Check,
  Copy,
  KeyRound,
  Pencil,
  ScrollText,
  Wifi,
} from "lucide-react";

import { ApiRequestError } from "@/utils/authFetch";
import { labService } from "@/features/lab/services/labService";
import { DeviceTokenModal } from "@/features/lab/components/DeviceTokenModal";
import {
  getCanonicalDevice,
  getDeviceLogs,
  getDeviceReport,
  getFleetDevice,
  listFleetLabs,
} from "../adminService";
import type {
  AdminDeviceDetail,
  AdminLabListItem,
  CanonicalDevice,
  DiagnosticFinding,
  DiagnosticStatus,
  HealthComponentReport,
  LabTenancyState,
} from "../devices/types";
import type { DeviceReport } from "../devices/reportTypes";
import { parseDeviceRoute } from "../devices/deviceRoute";
import { ConnBadge, ServiceChip, absoluteTime, relativeTime } from "./deviceHealth";
import {
  CONNECTIVITY_REASONS,
  CONNECTIVITY_STYLES,
  DIAG_STYLES,
  CanonicalConnBadge,
  DiagnosticBadge,
  FRESHNESS_STYLES,
  PROVENANCE_LABELS,
  TALLY_ORDER,
} from "../devices/canonicalBadges";
import { Select } from "@/components/ui/Select";

import { Field } from "../devices/Field";
import { Card } from "../devices/Card";
import { Disclosure } from "../devices/Disclosure";
import { ComponentRow } from "../devices/ComponentRow";
import { NetworkPanel } from "../devices/panels/NetworkPanel";
import { SystemPanel } from "../devices/panels/SystemPanel";
import { StoragePanel } from "../devices/panels/StoragePanel";
import { PowerPanel } from "../devices/panels/PowerPanel";
import { ServicesPanel } from "../devices/panels/ServicesPanel";
import { ProvenancePanel } from "../devices/panels/ProvenancePanel";
import { InventorySection } from "../devices/InventorySection";
import { RawDocumentSection } from "../devices/RawDocumentSection";

// ── Finding & Connectivity Rows ────────────────────────────────

function FindingRow({ finding }: { finding: DiagnosticFinding }) {
  const status = (finding.status ?? "UNKNOWN") as DiagnosticStatus;
  const severe = status === "FAIL";

  return (
    <div
      className={`rounded-lg border p-3 ${
        severe ? "border-rose-500/30 bg-rose-500/[0.07]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-medium text-white">{finding.title ?? finding.id}</span>
          {finding.subsystem ? (
            <span className="ml-2 text-[11px] uppercase tracking-wider text-white/35">
              {finding.subsystem}
            </span>
          ) : null}
        </div>
        <DiagnosticBadge status={status} />
      </div>
      {finding.detail ? <p className="mt-1.5 text-xs text-white/50">{finding.detail}</p> : null}
      {finding.next_step ? (
        <p className="mt-2 text-xs text-white/40">
          <span className="text-white/30">Next step: </span>
          {finding.next_step}
        </p>
      ) : null}
    </div>
  );
}

function ConnectivityRow({ device }: { device: CanonicalDevice }) {
  const { connectivity: c } = device;
  const reason = c.reason ? CONNECTIVITY_REASONS[c.reason] ?? c.reason : null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          aria-label={`Connectivity: ${c.state}`}
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            CONNECTIVITY_STYLES[c.state]
          }`}
        >
          {c.state}
        </span>
        {c.source !== "NONE" ? (
          <span className="text-[11px] text-white/35">
            via {c.source === "LAB_WS" ? "lab connection" : "device status"}
          </span>
        ) : null}
        {device.last_seen_at ? (
          <span className="text-[11px] text-white/35">
            last contact{" "}
            <span className="text-white/60">{relativeTime(device.last_seen_at)}</span>
            {device.last_seen_source ? (
              <span className="text-white/25"> ({device.last_seen_source})</span>
            ) : null}
          </span>
        ) : (
          <span className="text-[11px] text-white/35">never heard from</span>
        )}
      </div>
      {reason ? <p className="mt-1 text-[11px] text-white/35">{reason}</p> : null}
    </div>
  );
}

function LabRecordBadge({
  device,
  labIsCurrent,
}: {
  device: AdminDeviceDetail;
  labIsCurrent: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ConnBadge device={device} />
      <ServiceChip device={device} showComponents={false} />
      {!labIsCurrent ? (
        <span className="text-[11px] text-white/30">(then)</span>
      ) : null}
    </div>
  );
}

// ── Main DeviceDetailView Component ─────────────────────────────

export function DeviceDetailView({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const parsedRoute = useMemo(() => parseDeviceRoute(deviceId), [deviceId]);

  const [device, setDevice] = useState<AdminDeviceDetail | null>(null);
  const [canonical, setCanonical] = useState<CanonicalDevice | null>(null);
  const [report, setReport] = useState<DeviceReport | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [diagnosticError, setDiagnosticError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);

  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [moving, setMoving] = useState(false);
  const [labs, setLabs] = useState<AdminLabListItem[]>([]);

  const [logs, setLogs] = useState<unknown>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsError, setLogsError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setDiagnosticError("");

    try {
      if (parsedRoute.kind === "canonical") {
        // Parallel fetch for canonical device and device report
        const [canonicalRes, reportRes] = await Promise.allSettled([
          getCanonicalDevice(parsedRoute.key),
          getDeviceReport(parsedRoute.key),
        ]);

        const canon = canonicalRes.status === "fulfilled" ? canonicalRes.value : null;
        const rep = reportRes.status === "fulfilled" ? reportRes.value : null;

        setCanonical(canon);
        setReport(rep);

        if (canonicalRes.status === "rejected") {
          setDiagnosticError(
            canonicalRes.reason instanceof Error
              ? canonicalRes.reason.message
              : "Failed to load canonical device",
          );
        }

        // Secondary tolerant fetch for Lab device
        const labDeviceId = canon?.lab_tenancy?.enrollment?.lab_device_id;
        if (labDeviceId) {
          try {
            const labDev = await getFleetDevice(labDeviceId);
            setDevice(labDev);
            setLabelDraft(labDev.device_label);
          } catch {
            setDevice(null);
          }
        } else {
          setDevice(null);
        }

        if (!canon && !rep) {
          setError("Device not found.");
        }
      } else {
        // Lab-primary route (e.g. bare UUID or lab:<uuid>)
        try {
          const labDev = await getFleetDevice(parsedRoute.key);
          setDevice(labDev);
          setLabelDraft(labDev.device_label);

          const hwId = labDev.hardware_id;
          const [canonicalRes, reportRes] = await Promise.allSettled([
            getCanonicalDevice(hwId),
            getDeviceReport(hwId),
          ]);

          setCanonical(canonicalRes.status === "fulfilled" ? canonicalRes.value : null);
          setReport(reportRes.status === "fulfilled" ? reportRes.value : null);

          if (canonicalRes.status === "rejected") {
            setDiagnosticError(
              canonicalRes.reason instanceof Error
                ? canonicalRes.reason.message
                : "Failed to load system diagnostic",
            );
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load device");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [parsedRoute]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name);
    setActionError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setActionError(
        e instanceof ApiRequestError || e instanceof Error ? e.message : "Action failed",
      );
      if (e instanceof ApiRequestError && e.error_code === "LAB_1105") await load();
    } finally {
      setBusy("");
    }
  };

  const openMove = async () => {
    setMoving(true);
    if (labs.length === 0) {
      try {
        const res = await listFleetLabs({ page_size: 200 });
        setLabs(res.items);
      } catch {
        setActionError("Failed to load labs.");
      }
    }
  };

  const openLogs = async () => {
    if (!device) return;
    setLogsOpen(true);
    if (logs !== null) return;
    try {
      setLogs(await getDeviceLogs(device.id));
      setLogsError("");
    } catch (e) {
      setLogsError(e instanceof Error ? e.message : "Failed to load logs");
    }
  };

  const components = useMemo(() => {
    const map = device?.last_health_report?.components;
    if (!map || typeof map !== "object") return [];
    return Object.entries(map).sort(([, a], [, b]) => {
      const bad = (r: HealthComponentReport) =>
        r?.status && !["ok", "pass", "passed"].includes(String(r.status)) ? 0 : 1;
      return bad(a) - bad(b);
    });
  }, [device]);

  const reportMeta = device?.last_health_report;

  if (loading) return <p className="text-sm text-white/40">Loading device…</p>;

  if (error || (!device && !canonical && !report)) {
    return (
      <div>
        <button
          onClick={() => router.push("/admin/devices")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft size={16} /> All devices
        </button>
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error || "Device not found."}
        </div>
      </div>
    );
  }

  const neverConnected =
    device?.provisioning_source === "PAIRING" && !device.first_connected_at && !device.revoked_at;

  const tenancyState: LabTenancyState =
    device?.lab_tenancy_state ?? canonical?.lab_tenancy?.state ?? (device ? "ACTIVE" : "NONE");
  const labIsCurrent = tenancyState === "ACTIVE";
  const labActionsDisabled = !device || !!device.revoked_at || !labIsCurrent;

  const title = labIsCurrent && device?.device_label
    ? device.device_label
    : canonical?.label ||
      canonical?.diagnostic?.hostname ||
      report?.hostname ||
      canonical?.serial ||
      report?.serial ||
      device?.hardware_id ||
      parsedRoute.key;

  const displayIdentifier =
    canonical?.serial || report?.serial || device?.hardware_id || parsedRoute.key;

  const currentMode =
    report?.meta?.mode ||
    canonical?.diagnostic?.mode ||
    device?.last_health_report?.mode ||
    "UNKNOWN";

  const modeSource =
    report?.panels?.provenance?.mode_source?.value !== null &&
    report?.panels?.provenance?.mode_source?.value !== undefined
      ? String(report.panels.provenance.mode_source.value)
      : undefined;

  // Extract At-a-Glance readings
  const glanceIp =
    report?.panels?.network?.primary_ip?.value ||
    canonical?.diagnostic?.last_ip ||
    device?.last_ip ||
    "—";

  const wifiList = Array.isArray(report?.panels?.network?.wifi?.value)
    ? (report.panels.network.wifi.value as Record<string, unknown>[])
    : [];
  const associatedWifi = wifiList.find((w) => w.ssid) || wifiList[0];
  let glanceSsid = "—";
  if (report?.panels?.network?.wifi?.state === "NOT_REPORTED") {
    glanceSsid = "not reported by firmware";
  } else if (associatedWifi) {
    const sName = associatedWifi.ssid ? String(associatedWifi.ssid) : "Unassociated";
    const sigDbm = associatedWifi.signal_dbm !== undefined && associatedWifi.signal_dbm !== null
      ? `${associatedWifi.signal_dbm} dBm`
      : null;
    const sigPct = associatedWifi.signal_percent !== undefined && associatedWifi.signal_percent !== null
      ? `(${associatedWifi.signal_percent}%)`
      : null;
    const sigStr = [sigDbm, sigPct].filter(Boolean).join(" ");
    glanceSsid = sigStr ? `${sName} (${sigStr})` : sName;
  }

  const glanceUptime =
    report?.panels?.system?.uptime_human?.value ||
    (report?.meta?.uptime_s
      ? `${Math.floor(report.meta.uptime_s / 3600)}h`
      : "—");

  const glanceTemp =
    report?.panels?.system?.soc_temperature_c?.value !== null &&
    report?.panels?.system?.soc_temperature_c?.value !== undefined
      ? `${report.panels.system.soc_temperature_c.value} °C`
      : "—";

  const glanceBattery =
    report?.panels?.power?.battery_percent?.value !== null &&
    report?.panels?.power?.battery_percent?.value !== undefined
      ? `${report.panels.power.battery_percent.value}%`
      : report?.panels?.power?.battery_percent?.state === "NOT_REPORTED"
        ? "not reported by firmware"
        : "—";

  const filesystems = Array.isArray(report?.panels?.storage?.filesystems?.value)
    ? (report.panels.storage.filesystems.value as Record<string, unknown>[])
    : [];
  const rootFs = filesystems.find((fs) => fs.mount === "/") || filesystems[0];
  const glanceFree = String(rootFs?.free_human || rootFs?.free || "—");

  // Diagnostic summary / verdict
  const diagnostic = report?.meta || canonical?.diagnostic;
  const tally = diagnostic?.tally
    ? TALLY_ORDER.filter((s) => (diagnostic.tally[s] ?? 0) > 0)
    : [];
  const totalChecks = diagnostic?.tally
    ? Object.values(diagnostic.tally).reduce((a, b) => a + b, 0)
    : 0;
  const findings = diagnostic?.findings || [];
  const findingsTotal = diagnostic?.findings_total ?? findings.length;

  return (
    <div className="space-y-6">
      {/* Top navigation */}
      <div>
        <button
          onClick={() => router.push("/admin/devices")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft size={16} /> All devices
        </button>

        {/* 1. Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {canonical ? (
                <CanonicalConnBadge connectivity={canonical.connectivity} />
              ) : null}
              <span
                className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70"
                title={modeSource ? `Mode source: ${modeSource}` : `Current mode: ${currentMode}`}
              >
                {currentMode}
              </span>
              {labIsCurrent && device?.is_spare ? (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/50">
                  Spare
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-white/40">
              {labIsCurrent && device ? (
                <>
                  {device.partner_organization ?? "Unassigned"} › {device.lab_name ?? "—"}
                </>
              ) : (
                <>
                  {canonical?.diagnostic?.device_model ??
                    canonical?.device_model ??
                    report?.device_model ??
                    device?.device_model ??
                    "Unknown model"}
                  {" · serial "}
                  <span className="font-mono text-xs">
                    {canonical?.serial ?? report?.serial ?? "not in registry"}
                  </span>
                </>
              )}
            </p>

            <button
              onClick={async () => {
                await navigator.clipboard.writeText(displayIdentifier);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-white/40 hover:text-white"
            >
              {displayIdentifier}
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Banners */}
      {device?.revoked_at ? (
        <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/50">
          This device&apos;s Lab enrollment was revoked on {absoluteTime(device.revoked_at)}. It can
          no longer connect to the Lab.
        </div>
      ) : null}

      {tenancyState === "HISTORICAL" && device ? (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-100">
          <strong className="font-semibold">Previously enrolled in a Lab.</strong> This hardware was{" "}
          <span className="font-medium">{device.device_label}</span>
          {device.lab_name ? <> in {device.lab_name}</> : null}
          {device.partner_organization ? <> ({device.partner_organization})</> : null}, last seen by
          the Lab on {absoluteTime(canonical?.lab_tenancy?.enrollment?.last_heartbeat_at ?? device.last_heartbeat_at)}.
          Everything in the Lab enrollment card below is from that period and is not this
          device&apos;s current state. Lab settings can no longer be changed; revoke the enrollment
          to retire it.
        </div>
      ) : null}

      {labIsCurrent && neverConnected && device ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          Approved during pairing but has never connected. It will not be allocated to students
          until it comes online.
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {actionError}
        </div>
      ) : null}

      {/* 2. At a Glance strip */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
          At a Glance
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          <div>
            <span className="block text-[11px] text-white/40 uppercase">Primary IP</span>
            <span className="font-mono text-white/90 font-medium truncate block">{glanceIp}</span>
          </div>
          <div>
            <span className="block text-[11px] text-white/40 uppercase">SSID (Signal)</span>
            <span className="text-white/90 truncate block">{glanceSsid}</span>
          </div>
          <div>
            <span className="block text-[11px] text-white/40 uppercase">Uptime</span>
            <span className="text-white/90 truncate block">{glanceUptime}</span>
          </div>
          <div>
            <span className="block text-[11px] text-white/40 uppercase">SoC Temp</span>
            <span className="font-mono text-white/90 truncate block">{glanceTemp}</span>
          </div>
          <div>
            <span className="block text-[11px] text-white/40 uppercase">Battery</span>
            <span className="text-white/90 truncate block">{glanceBattery}</span>
          </div>
          <div>
            <span className="block text-[11px] text-white/40 uppercase">Free on /</span>
            <span className="font-mono text-white/90 truncate block">{glanceFree}</span>
          </div>
        </div>
      </section>

      {/* 3. Reachability & Freshness & 4. Verdict */}
      <Card
        title="System diagnostic"
        subtitle="powered by gened-health"
        right={
          diagnostic?.overall ? (
            <DiagnosticBadge
              status={diagnostic.overall}
              label={`Overall diagnostic verdict: ${diagnostic.overall}`}
            />
          ) : null
        }
      >
        {diagnosticError ? (
          <p className="text-sm text-rose-300">{diagnosticError}</p>
        ) : !canonical ? (
          <p className="text-sm text-white/40">
            This device is not in the canonical registry yet, so no mode-independent
            diagnostic is available. Its state is{" "}
            <strong className="text-amber-300">unknown</strong> — not confirmed healthy.
          </p>
        ) : !diagnostic ? (
          <>
            <ConnectivityRow device={canonical} />
            <p className="mt-3 text-sm text-white/40">
              No gened-health report received yet. This device&apos;s diagnostic state is{" "}
              <strong className="text-amber-300">unknown</strong> — not confirmed healthy.
            </p>
            <p className="mt-2 text-[11px] text-white/30">
              {PROVENANCE_LABELS[canonical.provenance]}
            </p>
          </>
        ) : (
          <>
            <ConnectivityRow device={canonical} />

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Field label="Current mode" value={diagnostic.mode ?? "Not reported"} />
              <Field label="Current firmware" value={diagnostic.firmware_version ?? "—"} mono />
              <Field label="Last health report" value={relativeTime(diagnostic.received_at)} />
              <Field
                label="Device model"
                value={
                  ("device_model" in diagnostic && diagnostic.device_model)
                    ? diagnostic.device_model
                    : (report?.device_model ?? canonical?.device_model ?? "—")
                }
              />
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
              <span>Reported {absoluteTime(diagnostic.received_at)}</span>
              {diagnostic.diagnostic_freshness === "STALE" ? (
                <span
                  aria-label="Diagnostic freshness: STALE"
                  className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300"
                >
                  Stale data — expected every{" "}
                  {Math.round((diagnostic.report_interval_seconds ?? 3600) / 60)}m
                </span>
              ) : null}
            </div>

            {diagnostic.collected_at ? (
              <p className="mt-1 text-[11px] text-white/30">
                Device clock: {absoluteTime(diagnostic.collected_at)}
              </p>
            ) : null}

            {diagnostic.clock_synced === false ? (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                This device reported that its clock is not synchronised, so the device clock above
                is unreliable. Report age is measured by the server and is unaffected.
              </div>
            ) : null}

            {tally.length > 0 ? (
              <dl className="mt-4 flex flex-wrap gap-2">
                {tally.map((s) => (
                  <div
                    key={s}
                    className={`flex items-baseline gap-1.5 rounded-md px-2 py-1 ${DIAG_STYLES[s]}`}
                  >
                    <dt className="text-[11px] font-medium">{s}</dt>
                    <dd className="text-xs font-semibold">{diagnostic.tally[s]}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {/* Findings */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">
                  Findings
                </p>
                {findingsTotal > findings.length ? (
                  <span className="text-[11px] text-white/40">
                    Showing {findings.length} of {findingsTotal}
                  </span>
                ) : null}
              </div>
              {findings.length === 0 ? (
                <p className="text-sm text-white/40">
                  Nothing actionable in the latest report.
                  {diagnostic.overall === "PASS" ? ` All ${totalChecks} checks passed.` : null}
                </p>
              ) : (
                <div className="space-y-2">
                  {findings.map((f, i) => (
                    <FindingRow key={f.id ?? i} finding={f} />
                  ))}
                </div>
              )}
            </div>

            {canonical.serial ? (
              <p className="mt-4 border-t border-white/5 pt-2 text-[11px] text-white/25">
                {PROVENANCE_LABELS[canonical.provenance]} · serial{" "}
                <span className="font-mono">{canonical.serial}</span>
              </p>
            ) : null}
          </>
        )}
      </Card>

      {/* 5 - 9. Curated Panels (Open / Closed) */}
      {report ? (
        <div className="space-y-4">
          <Disclosure defaultOpen title="Network">
            <NetworkPanel panel={report.panels.network} />
          </Disclosure>

          <Disclosure defaultOpen title="System">
            <SystemPanel panel={report.panels.system} />
          </Disclosure>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Disclosure defaultOpen title="Storage">
              <StoragePanel panel={report.panels.storage} />
            </Disclosure>

            <Disclosure defaultOpen title="Power & Battery">
              <PowerPanel panel={report.panels.power} />
            </Disclosure>
          </div>

          <Disclosure defaultOpen title="Services & Application">
            <ServicesPanel panel={report.panels.services} />
          </Disclosure>

          <Disclosure defaultOpen={false} title="Provenance & Configuration">
            <ProvenancePanel panel={report.panels.provenance} />
          </Disclosure>

          {/* 10. All checks by subsystem (Inventory) */}
          <Disclosure defaultOpen={false} title="All checks by subsystem">
            <InventorySection inventory={report.inventory} />
          </Disclosure>

          {/* 11. Raw Document Section */}
          <Disclosure defaultOpen={false} title="Raw Document">
            <RawDocumentSection deviceKey={report.serial || parsedRoute.key} />
          </Disclosure>
        </div>
      ) : null}

      {/* 12. Lab Enrollment — ONE bottom disclosure */}
      {device ? (
        <Disclosure
          defaultOpen={labIsCurrent}
          title={labIsCurrent ? "Lab enrollment" : "Previous Lab enrollment"}
          subtitle={
            labIsCurrent
              ? "The Lab's record of this desk"
              : `Historical — the Lab's record from when this hardware was ${device.device_label}`
          }
          badge={<LabRecordBadge device={device} labIsCurrent={labIsCurrent} />}
        >
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              <Field label="Desk label" value={device.device_label} />
              <Field label="Lab" value={device.lab_name ?? "—"} />
              <Field label="School" value={device.partner_organization ?? "Unassigned"} />
              <Field label="Provisioned via" value={device.provisioning_source ?? "—"} />
              <Field label="Firmware at last Lab contact" value={device.firmware_version ?? "—"} mono />
              <Field label="IP at last Lab contact" value={device.last_ip ?? "—"} mono />
              <Field label="Provisioned" value={absoluteTime(device.provisioned_at)} />
              <Field label="First connected to Lab" value={absoluteTime(device.first_connected_at)} />
              <Field label="Last connected to Lab" value={absoluteTime(device.last_connected_at)} />
              <Field
                label="Last Lab heartbeat"
                value={device.last_heartbeat_at ? absoluteTime(device.last_heartbeat_at) : "Never"}
              />
              <Field label="Token rotated" value={absoluteTime(device.device_token_rotated_at)} />
              <Field label="Revoked" value={absoluteTime(device.revoked_at)} />
            </dl>

            {/* Self-test report metadata if present */}
            {reportMeta ? (
              <div className="border-t border-white/5 pt-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-white/35">
                  Lab self-test report · {absoluteTime(reportMeta.checked_at)}
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                  <Field label="IP at self-test" value={reportMeta.ip ?? "—"} mono />
                  <Field label="Mode at self-test" value={reportMeta.mode ?? "—"} />
                  <Field label="Type" value={reportMeta.type ?? "—"} />
                  <Field label="Checked" value={absoluteTime(reportMeta.checked_at)} />
                  <Field label="Firmware at self-test" value={reportMeta.firmware_version ?? "—"} mono />
                  <Field label="Schema version" value={String(reportMeta.schema_version ?? "—")} />
                </dl>
              </div>
            ) : null}

            {/* Self-test components */}
            <div className="border-t border-white/5 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
                {labIsCurrent ? "Lab self-test" : "Lab self-test (historical)"}
              </h3>
              {!labIsCurrent && components.length > 0 ? (
                <p className="mb-3 rounded-md border border-sky-500/25 bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-100">
                  From the previous Lab enrollment. These component verdicts describe the hardware as it
                  was then, not now — the current verdict is in the System diagnostic card above.
                </p>
              ) : null}
              {components.length === 0 ? (
                <p className="text-sm text-white/40">
                  This device has never reported a Lab self-test.
                </p>
              ) : (
                <div className="space-y-2">
                  {components.map(([name, rep]) => (
                    <ComponentRow key={name} name={name} report={rep} />
                  ))}
                </div>
              )}
            </div>

            {/* Lab actions */}
            <div className="border-t border-white/5 pt-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Lab actions
                  </h3>
                  <p className="text-[11px] text-white/35">
                    {labIsCurrent
                      ? "These write to the Lab device record and are audited"
                      : "Unavailable: this Lab enrollment is historical"}
                  </p>
                </div>
                <button
                  onClick={openLogs}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
                >
                  <ScrollText size={14} /> Logs
                </button>
              </div>

              {!labIsCurrent ? (
                <p className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
                  This hardware is no longer in {device.lab_name ?? "this Lab"}, so renaming, moving,
                  forcing online and rotating its token would only edit a record no device will read.
                  Revoke is still available and is how you retire this enrollment.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {/* Rename */}
                {renaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      disabled={labActionsDisabled || busy === "rename"}
                      className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        act("rename", async () => {
                          await labService.updateDevice(device.id, { device_label: labelDraft.trim() });
                          setRenaming(false);
                        })
                      }
                      disabled={busy === "rename"}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setRenaming(false);
                        setLabelDraft(device.device_label);
                      }}
                      className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRenaming(true)}
                    disabled={labActionsDisabled}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil size={14} /> Rename
                  </button>
                )}

                {/* Move Lab */}
                {moving ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={device.lab_id}
                      onChange={(target) =>
                        act("move", async () => {
                          await labService.moveDevice(device.id, { target_lab_id: target });
                          setMoving(false);
                        })
                      }
                      options={labs
                        .filter((l) => l.id !== device.lab_id)
                        .map((l) => ({ value: l.id, label: `${l.name} (${l.partner_organization || "Unassigned"})` }))}
                      placeholder="Select target lab"
                      className="text-xs"
                    />
                    <button
                      onClick={() => setMoving(false)}
                      className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={openMove}
                    disabled={labActionsDisabled}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowRightLeft size={14} /> Move lab
                  </button>
                )}

                {/* Spare */}
                <button
                  onClick={() =>
                    act("spare", () => labService.updateDevice(device.id, { is_spare: !device.is_spare }))
                  }
                  disabled={labActionsDisabled || busy === "spare"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {device.is_spare ? "Unmark spare" : "Mark as spare"}
                </button>

                {/* Force online */}
                <button
                  onClick={() => {
                    if (
                      !confirm(
                        "Force this device to ONLINE?\n\nThis is a manual override for bring-up, not a fix — it makes the device eligible for allocation even if it is not actually reachable. It will be overwritten by the next real heartbeat.",
                      )
                    )
                      return;
                    void act("force", () =>
                      labService.updateDevice(device.id, { health_status: "ONLINE" }),
                    );
                  }}
                  disabled={labActionsDisabled || busy === "force"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Wifi size={14} /> Force online
                </button>

                {/* Rotate Token */}
                <button
                  onClick={() => {
                    if (
                      !confirm(
                        "Rotate this device's token?\n\nThe current token stops working immediately and the device will stay offline until the new one is flashed onto it. The new token is shown only once.",
                      )
                    )
                      return;
                    void act("rotate", async () => {
                      const res = await labService.rotateToken(device.id);
                      setMintedToken(res.device_token);
                    });
                  }}
                  disabled={labActionsDisabled || busy === "rotate"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <KeyRound size={14} /> Rotate token
                </button>

                {/* Revoke Enrollment (always enabled unless already revoked!) */}
                <button
                  onClick={() => {
                    const ok = window.confirm(
                      `Revoke ${device.device_label}?\n\nIts connection is closed immediately and it can never reconnect. Use this for lost or stolen units — it is not reversible from here.`,
                    );
                    if (ok) void act("revoke", () => labService.revokeDevice(device.id));
                  }}
                  disabled={!!device.revoked_at || busy === "revoke"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Ban size={14} /> Revoke enrollment
                </button>
              </div>
            </div>
          </div>
        </Disclosure>
      ) : null}

      {/* Device Logs Modal */}
      {logsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-white/15 bg-[#14151a] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Device Logs</h3>
              <button
                onClick={() => setLogsOpen(false)}
                className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/60 hover:text-white"
              >
                Close
              </button>
            </div>
            {logsError ? (
              <p className="text-xs text-rose-300">{logsError}</p>
            ) : (
              <pre className="max-h-[60vh] overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] text-white/80">
                {JSON.stringify(logs, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ) : null}

      {/* Minted Token Modal */}
      {mintedToken && device ? (
        <DeviceTokenModal
          isOpen={!!mintedToken}
          onClose={() => setMintedToken(null)}
          token={mintedToken}
          deviceLabel={device.device_label}
        />
      ) : null}
    </div>
  );
}
