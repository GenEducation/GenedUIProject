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
  getFleetDevice,
  listFleetLabs,
} from "../adminService";
import type {
  AdminDeviceDetail,
  AdminLabListItem,
  CanonicalDevice,
  ConnectivityState,
  DeviceProvenance as DeviceProvenanceT,
  DiagnosticFinding,
  DiagnosticFreshness,
  DiagnosticStatus,
  HealthComponentReport,
} from "../devices/types";
import { ConnBadge, ServiceChip, absoluteTime, relativeTime } from "./deviceHealth";
// Shared with the fleet table rather than redefined here. A second copy of these
// colour tables is how UNKNOWN ends up amber on one screen and green on another.
import {
  CONNECTIVITY_REASONS,
  CONNECTIVITY_STYLES,
  DIAG_STYLES,
  DiagnosticBadge,
  FRESHNESS_STYLES,
  PROVENANCE_LABELS,
  TALLY_ORDER,
} from "../devices/canonicalBadges";
import { Select } from "@/components/ui/Select";

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">{label}</dt>
      <dd className={`mt-1 text-sm text-white/80 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-white/40">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/**
 * One scalar metric/extra — short values (numbers, booleans, short strings)
 * that read fine as a label/value pair.
 */
function MetricRow({ k, v }: { k: string; v: unknown }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <dt className="shrink-0 text-white/35">{k}</dt>
      <dd className="min-w-0 truncate font-mono text-white/70" title={String(v)}>
        {String(v)}
      </dd>
    </div>
  );
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

/**
 * Renders an object's fields as actual label/value rows, recursing into any
 * nested object (e.g. a `mixer` block inside a metrics payload) as an indented
 * sub-group instead of dumping it as a raw JSON blob.
 */
function NestedFields({ obj, depth = 0 }: { obj: Record<string, unknown>; depth?: number }) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return <p className="text-white/30">—</p>;

  return (
    <dl className={`grid grid-cols-2 gap-x-4 gap-y-1.5 ${depth > 0 ? "border-l border-white/10 pl-3" : ""}`}>
      {entries.map(([k, v]) => {
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          return (
            <div key={k} className="col-span-2">
              <dt className="mb-1 text-white/35">{k}</dt>
              <dd>
                <NestedFields obj={v as Record<string, unknown>} depth={depth + 1} />
              </dd>
            </div>
          );
        }
        const text = Array.isArray(v)
          ? v.length === 0
            ? "—"
            : v.map(formatScalar).join(", ")
          : formatScalar(v);
        return (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-white/35">{k}</dt>
            <dd className="min-w-0 truncate font-mono text-white/70" title={text}>
              {text}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * One object-valued metric/extra (nested mixer state, raw payloads, …), shown
 * as real UI rows via `NestedFields` rather than pretty-printed JSON.
 */
function NestedMetric({ k, v }: { k: string; v: Record<string, unknown> }) {
  return (
    <div className="text-[11px]">
      <dt className="mb-1.5 text-white/35">{k}</dt>
      <dd>
        <NestedFields obj={v} />
      </dd>
    </div>
  );
}

/** Renders one self-test component. The payload schema is undocumented, so known
 *  keys are pulled out and anything else is shown rather than dropped. */
function ComponentRow({ name, report }: { name: string; report: HealthComponentReport }) {
  const status = typeof report?.status === "string" ? report.status : "unknown";
  const failed = status !== "ok" && status !== "pass" && status !== "passed";
  const metrics = report?.metrics && typeof report.metrics === "object" ? report.metrics : null;
  const extras = Object.entries(report ?? {}).filter(
    ([k]) => !["status", "detail", "metrics"].includes(k),
  );
  const allEntries = [...(metrics ? Object.entries(metrics) : []), ...extras];
  const scalarEntries = allEntries.filter(([, v]) => typeof v !== "object" || v === null);
  const objectEntries = allEntries.filter(([, v]) => typeof v === "object" && v !== null);

  return (
    <div
      className={`rounded-lg border p-3 ${
        failed ? "border-rose-500/30 bg-rose-500/[0.07]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{name}</span>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] ${
            failed ? "bg-rose-500/15 text-rose-300" : "bg-[#059F6D]/15 text-[#059F6D]"
          }`}
        >
          {status}
        </span>
      </div>
      {report?.detail ? <p className="mt-1.5 text-xs text-white/50">{report.detail}</p> : null}
      {scalarEntries.length > 0 ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          {scalarEntries.map(([k, v]) => (
            <MetricRow key={k} k={k} v={v} />
          ))}
        </dl>
      ) : null}
      {objectEntries.length > 0 ? (
        <dl className="mt-2 space-y-2.5">
          {objectEntries.map(([k, v]) => (
            <NestedMetric key={k} k={k} v={v as Record<string, unknown>} />
          ))}
        </dl>
      ) : null}
    </div>
  );
}

// ── gened-health system diagnostic ─────────────────────────────

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

/**
 * The reachability row. Separate from the diagnostic verdict on purpose.
 *
 * A health report says when a device last SPOKE, which is not whether it is
 * reachable now — so this reads the server's transport-derived answer and never
 * infers one from report age. The server supplies the grace window too, which
 * is why no threshold is hardcoded here.
 */
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
              /* The source is not decoration. A 3-second lab poll and an hourly
                 POST mean very different things by the same "40 minutes ago". */
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

/**
 * The gened-health card. Additive — it sits alongside the Lab self-test card
 * and neither replaces nor reinterprets it.
 *
 * Renders FOUR independent dimensions: reachability, data freshness, the
 * device's verdict, and how we know the device exists. They are deliberately not
 * collapsed into one light — "online but stale" is a broken reporting pipeline
 * on a working device, and "never reported" is not "reported healthy".
 *
 * Every threshold here comes from the server. Nothing recomputes freshness or
 * reachability from timestamps locally: that is the specific mistake the Lab
 * surface made with its own hardcoded constant.
 */
function SystemDiagnosticCard({
  device,
  error,
}: {
  device: CanonicalDevice | null;
  error: string;
}) {
  if (error) {
    return (
      <Card title="System diagnostic" subtitle="powered by gened-health">
        <p className="text-sm text-rose-300">{error}</p>
      </Card>
    );
  }

  if (!device) {
    return (
      <Card title="System diagnostic" subtitle="powered by gened-health">
        <p className="text-sm text-white/40">
          This device is not in the canonical registry yet, so no mode-independent
          diagnostic is available. Its state is{" "}
          <strong className="text-amber-300">unknown</strong> — not confirmed healthy.
        </p>
      </Card>
    );
  }

  const diagnostic = device.diagnostic;

  if (!diagnostic) {
    return (
      <Card
        title="System diagnostic"
        subtitle="powered by gened-health"
        right={
          <span
            aria-label={`Diagnostic freshness: ${device.diagnostic_freshness}`}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              FRESHNESS_STYLES[device.diagnostic_freshness]
            }`}
          >
            NEVER REPORTED
          </span>
        }
      >
        <ConnectivityRow device={device} />
        <p className="mt-3 text-sm text-white/40">
          No gened-health report received yet. This device&apos;s diagnostic state is{" "}
          <strong className="text-amber-300">unknown</strong> — not confirmed healthy.
        </p>
        <p className="mt-2 text-[11px] text-white/30">
          {PROVENANCE_LABELS[device.provenance]}
        </p>
      </Card>
    );
  }

  const tally = TALLY_ORDER.filter((s) => (diagnostic.tally?.[s] ?? 0) > 0);

  return (
    <Card
      title="System diagnostic"
      subtitle="powered by gened-health"
      right={
        <DiagnosticBadge
          status={diagnostic.overall}
          label={`Overall diagnostic verdict: ${diagnostic.overall}`}
        />
      }
    >
      <ConnectivityRow device={device} />

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
        <span>
          Reported{" "}
          <span className="text-white/70">{relativeTime(diagnostic.received_at)}</span>
        </span>
        {device.diagnostic_freshness === "STALE" ? (
          <span
            aria-label="Diagnostic freshness: STALE"
            className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300"
          >
            Stale data — expected every{" "}
            {Math.round(diagnostic.report_interval_seconds / 60)}m
          </span>
        ) : null}
        {diagnostic.firmware_version ? (
          <span className="font-mono text-white/50">fw {diagnostic.firmware_version}</span>
        ) : null}
        {diagnostic.mode ? <span className="text-white/50">{diagnostic.mode}</span> : null}
      </div>

      {/* The device's own clock, shown only as context for `received_at` above. */}
      <p className="mt-1 text-[11px] text-white/30">
        Device clock: {absoluteTime(diagnostic.collected_at)}
      </p>

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

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/35">
          Findings
        </p>
        {diagnostic.findings.length === 0 ? (
          <p className="text-sm text-white/40">
            Nothing actionable in the latest report.
            {diagnostic.overall === "PASS" ? " All checks passed." : null}
          </p>
        ) : (
          <div className="space-y-2">
            {diagnostic.findings.map((f, i) => (
              <FindingRow key={f.id ?? i} finding={f} />
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 border-t border-white/5 pt-2 text-[11px] text-white/25">
        {PROVENANCE_LABELS[device.provenance]} · serial{" "}
        <span className="font-mono">{device.serial}</span>
      </p>
    </Card>
  );
}

export function DeviceDetailView({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [device, setDevice] = useState<AdminDeviceDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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

  const [canonical, setCanonical] = useState<CanonicalDevice | null>(null);
  const [diagnosticError, setDiagnosticError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await getFleetDevice(deviceId);
      setDevice(d);
      setLabelDraft(d.device_label);
      setError("");

      /**
       * Fetched separately and keyed on `hardware_id`, not the LabDevice UUID:
       * the canonical device is mode-independent and lives outside the Lab
       * tables. The server resolves that alias back to a serial for us.
       *
       * Deliberately after the device load and in its own try — a device absent
       * from the registry, or a registry endpoint that is unhappy, must not take
       * down the page that renders every Lab action. getCanonicalDevice already
       * resolves null for "not registered", so reaching the catch means
       * something actually went wrong.
       */
      try {
        setCanonical(await getCanonicalDevice(d.hardware_id));
        setDiagnosticError("");
      } catch (e) {
        setCanonical(null);
        setDiagnosticError(
          e instanceof Error ? e.message : "Failed to load system diagnostic",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load device");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Every mutation refetches. Per spec §10 a LAB_1105 always means our view was
   * stale, so reloading is the correct response to a failure too, not just to
   * success.
   */
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
    setLogsOpen(true);
    if (logs !== null) return;
    try {
      setLogs(await getDeviceLogs(deviceId));
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

  // Report-level metadata (not a component) — surfaced in the Identity card.
  const reportMeta = device?.last_health_report;

  if (loading) return <p className="text-sm text-white/40">Loading device…</p>;

  if (error || !device) {
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
    device.provisioning_source === "PAIRING" && !device.first_connected_at && !device.revoked_at;

  return (
    <div>
      <button
        onClick={() => router.push("/admin/devices")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft size={16} /> All devices
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{device.device_label}</h1>
            <ConnBadge device={device} />
            <ServiceChip device={device} />
            {device.is_spare ? (
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/50">Spare</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-white/40">
            {device.partner_organization ?? "Unassigned"} › {device.lab_name ?? "—"}
          </p>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(device.hardware_id);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-white/40 hover:text-white"
          >
            {device.hardware_id}
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {device.revoked_at ? (
        <div className="mb-4 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/50">
          This device was revoked {relativeTime(device.revoked_at)}. It can no longer connect.
        </div>
      ) : null}

      {neverConnected ? (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          Approved during pairing but has never connected. It will not be allocated to students
          until it comes online.
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {actionError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Identity" subtitle="Provisioning and connection history">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="Model" value={device.device_model ?? "—"} />
            <Field label="Firmware" value={device.firmware_version ?? "—"} />
            <Field label="Provisioned via" value={device.provisioning_source ?? "—"} />
            <Field label="Last IP" value={device.last_ip ?? "—"} mono />
            <Field label="Provisioned" value={absoluteTime(device.provisioned_at)} />
            <Field label="First connected" value={absoluteTime(device.first_connected_at)} />
            <Field label="Last connected" value={absoluteTime(device.last_connected_at)} />
            <Field
              label="Last heartbeat"
              value={
                device.last_heartbeat_at
                  ? `${relativeTime(device.last_heartbeat_at)} · ${absoluteTime(device.last_heartbeat_at)}`
                  : "Never"
              }
            />
            <Field label="Token rotated" value={absoluteTime(device.device_token_rotated_at)} />
            <Field label="Revoked" value={absoluteTime(device.revoked_at)} />
          </dl>

          {reportMeta ? (
            <>
              <div className="my-4 border-t border-white/10" />
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-white/35">
                Self-test report
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Field label="Reported IP" value={reportMeta.ip ?? "—"} mono />
                <Field label="Mode" value={reportMeta.mode ?? "—"} />
                <Field label="Type" value={reportMeta.type ?? "—"} />
                <Field label="Checked" value={absoluteTime(reportMeta.checked_at)} />
                <Field label="Self-test firmware" value={reportMeta.firmware_version ?? "—"} mono />
                <Field label="Schema version" value={String(reportMeta.schema_version ?? "—")} />
              </dl>
            </>
          ) : null}
        </Card>

        <Card
          title="Self-test"
          subtitle={
            device.last_health_at
              ? `Reported ${relativeTime(device.last_health_at)}`
              : "Never reported"
          }
        >
          {components.length === 0 ? (
            <p className="text-sm text-white/40">
              This device has never reported a self-test. Its hardware state is{" "}
              <strong className="text-amber-300">unknown</strong> — not confirmed healthy.
            </p>
          ) : (
            <div className="space-y-2">
              {components.map(([name, report]) => (
                <ComponentRow key={name} name={name} report={report} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <SystemDiagnosticCard device={canonical} error={diagnosticError} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Card
          title="Actions"
          subtitle="These write to the device record and are audited"
          right={
            <button
              onClick={openLogs}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              <ScrollText size={14} /> Logs
            </button>
          }
        >
          {renaming ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#059F6D] focus:outline-none"
                placeholder="Desk label"
              />
              <button
                onClick={async () => {
                  await act("rename", () =>
                    labService.updateDevice(device.id, { device_label: labelDraft.trim() }),
                  );
                  setRenaming(false);
                }}
                disabled={!labelDraft.trim() || busy === "rename"}
                className="rounded-lg bg-[#059F6D] px-3 py-2 text-sm font-medium text-white hover:bg-[#048158] disabled:opacity-50"
              >
                {busy === "rename" ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setRenaming(false);
                  setLabelDraft(device.device_label);
                }}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/60 hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          ) : null}

          {moving ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Select
                theme="dark"
                aria-label="Move to lab"
                placeholder="Move to lab…"
                className="min-w-[240px]"
                value=""
                onChange={async (target) => {
                  if (!target) return;
                  await act("move", () =>
                    labService.moveDevice(device.id, { target_lab_id: target }),
                  );
                  setMoving(false);
                }}
                options={labs
                  .filter((l) => l.id !== device.lab_id)
                  .map((l) => ({
                    value: l.id,
                    label: `${l.partner_organization ?? "—"} › ${l.name}`,
                  }))}
              />
              <button
                onClick={() => setMoving(false)}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/60 hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRenaming(true)}
              disabled={!!device.revoked_at}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
            >
              <Pencil size={14} /> Rename
            </button>
            <button
              onClick={() =>
                act("spare", () => labService.updateDevice(device.id, { is_spare: !device.is_spare }))
              }
              disabled={!!device.revoked_at || busy === "spare"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
            >
              {device.is_spare ? "Unmark spare" : "Mark as spare"}
            </button>
            <button
              onClick={openMove}
              disabled={!!device.revoked_at}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
            >
              <ArrowRightLeft size={14} /> Move lab
            </button>
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
              disabled={!!device.revoked_at || busy === "force"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/10 disabled:opacity-40"
            >
              <Wifi size={14} /> Force online
            </button>
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
              disabled={!!device.revoked_at || busy === "rotate"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
            >
              <KeyRound size={14} /> Rotate token
            </button>
            <button
              onClick={() => {
                if (
                  !confirm(
                    `Revoke ${device.device_label}?\n\nIts connection is closed immediately and it can never reconnect. Use this for lost or stolen units — it is not reversible from here.`,
                  )
                )
                  return;
                void act("revoke", () => labService.revokeDevice(device.id));
              }}
              disabled={!!device.revoked_at || busy === "revoke"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
            >
              <Ban size={14} /> Revoke
            </button>
          </div>
        </Card>

        {logsOpen ? (
          <Card title="Device logs" subtitle={`GET /lab/devices/${device.id}/logs`}>
            {logsError ? (
              <p className="text-sm text-rose-300">{logsError}</p>
            ) : logs === null ? (
              <p className="text-sm text-white/40">Loading logs…</p>
            ) : (
              <pre className="max-h-96 overflow-auto rounded-lg bg-black/30 p-4 text-xs leading-relaxed text-white/70">
                {typeof logs === "string" ? logs : JSON.stringify(logs, null, 2)}
              </pre>
            )}
          </Card>
        ) : null}
      </div>

      {mintedToken ? (
        <DeviceTokenModal
          isOpen
          deviceLabel={device.device_label}
          token={mintedToken}
          onClose={() => setMintedToken(null)}
        />
      ) : null}
    </div>
  );
}
