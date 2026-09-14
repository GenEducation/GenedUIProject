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
import { getDeviceLogs, getFleetDevice, listFleetLabs } from "../adminService";
import type { AdminDeviceDetail, AdminLabListItem, HealthComponentReport } from "../devices/types";
import { ConnBadge, ServiceChip, absoluteTime, relativeTime } from "./deviceHealth";
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

  const load = useCallback(async () => {
    try {
      const d = await getFleetDevice(deviceId);
      setDevice(d);
      setLabelDraft(d.device_label);
      setError("");
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
          <button aria-label="Copy"
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
