"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, TriangleAlert, X } from "lucide-react";
import { RelativeTime } from "@/components/shared/RelativeTime";
import {
  STATUS_LABEL,
  displayHardwareId,
  humanizeKey,
  normalizeStatus,
  resolveAddresses,
  summarizeHealth,
} from "../utils/deviceHealth";
import type { DeviceResponse, HealthComponentStatus, LabDeviceHealth } from "../types/lab";

const PILL_TONE: Record<HealthComponentStatus, string> = {
  ok: "bg-[#E5F2E9] text-[#1A3D2C]",
  warn: "bg-warning-bg text-warning-ink",
  fail: "bg-danger-bg text-danger-ink",
  unknown: "bg-[#1A3D2C]/5 text-[#1A3D2C]/45",
};

const LINK_TONE: Record<LabDeviceHealth, { label: string; className: string }> = {
  ONLINE: { label: "Online", className: "bg-[#E5F2E9] text-[#1A3D2C]" },
  OFFLINE: { label: "Offline", className: "bg-[#F4F3EE] text-[#1A3D2C]/50" },
  NEEDS_ATTENTION: { label: "Needs attention", className: "bg-danger-bg text-danger-ink" },
};

/** Max nesting we will walk into a metrics object before falling back to JSON. */
const MAX_METRIC_DEPTH = 2;
const MAX_ARRAY_ITEMS = 5;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">{children}</p>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[11px] text-[#1A3D2C]/45">{label}</span>
      <span className="min-w-0 break-words text-right text-[12px] font-semibold text-[#1A3D2C]">
        {children}
      </span>
    </div>
  );
}

function BoolChip({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
        on ? "bg-[#E5F2E9] text-[#1A3D2C]" : "bg-[#1A3D2C]/5 text-[#1A3D2C]/40"
      }`}
    >
      {on ? "yes" : "no"}
    </span>
  );
}

/** Renders one scalar metric value. Returns `null` for anything non-scalar. */
function ScalarValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-[#1A3D2C]/25">—</span>;
  if (typeof value === "boolean") return <BoolChip on={value} />;
  if (typeof value === "number") {
    return <span className="tabular-nums">{Number.isInteger(value) ? value : value.toFixed(1)}</span>;
  }
  if (typeof value === "string") return <span>{value || "—"}</span>;
  return null;
}

function isScalar(value: unknown): boolean {
  return value === null || ["boolean", "number", "string", "undefined"].includes(typeof value);
}

/**
 * Generic metrics renderer. No field name is hardcoded anywhere: `peak`,
 * `crtc_id`, and `Left Boost Mixer LINPUT1` all take the same path, so
 * firmware can add metrics without a frontend change.
 */
function MetricGrid({ metrics, depth = 0 }: { metrics: Record<string, unknown>; depth?: number }) {
  const entries = Object.entries(metrics);
  if (entries.length === 0) return null;

  const scalars = entries.filter(([, v]) => isScalar(v) || Array.isArray(v));
  const nested = entries.filter(([, v]) => !isScalar(v) && !Array.isArray(v) && typeof v === "object");

  return (
    <div className={depth > 0 ? "mt-1.5" : ""}>
      {scalars.length > 0 && (
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {scalars.map(([key, value]) => (
            <Row key={key} label={humanizeKey(key)}>
              {Array.isArray(value) ? (
                value.length === 0 ? (
                  <span className="text-[#1A3D2C]/25">none</span>
                ) : (
                  <span>
                    {value.slice(0, MAX_ARRAY_ITEMS).map(String).join(", ")}
                    {value.length > MAX_ARRAY_ITEMS && ` +${value.length - MAX_ARRAY_ITEMS} more`}
                  </span>
                )
              ) : (
                <ScalarValue value={value} />
              )}
            </Row>
          ))}
        </div>
      )}

      {nested.map(([key, value]) =>
        depth + 1 < MAX_METRIC_DEPTH ? (
          <div key={key} className="mt-2 border-l-2 border-[#1A3D2C]/[0.07] pl-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A3D2C]/35">
              {humanizeKey(key)}
            </p>
            <MetricGrid metrics={value as Record<string, unknown>} depth={depth + 1} />
          </div>
        ) : (
          // Depth cap: show the payload verbatim rather than dropping it.
          <div key={key} className="mt-2 border-l-2 border-[#1A3D2C]/[0.07] pl-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A3D2C]/35">
              {humanizeKey(key)}
            </p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-[#F4F3EE] p-2 font-mono text-[10px] text-[#1A3D2C]/70">
              {JSON.stringify(value)}
            </pre>
          </div>
        ),
      )}
    </div>
  );
}

interface DeviceDiagnosticsModalProps {
  device: DeviceResponse | null;
  onClose: () => void;
}

/**
 * Full self-test detail for one device.
 *
 * Deliberately split into "Link" (can we reach it now) and "Self-test" (what
 * it last said about itself), because those routinely disagree — a device can
 * pass every check and then drop off the network minutes later.
 */
export function DeviceDiagnosticsModal({ device, onClose }: DeviceDiagnosticsModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Keyed by device id so switching devices resets the affordance without an
  // effect that writes state.
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const copied = copiedFor !== null && copiedFor === device?.id;

  useEffect(() => {
    if (!device) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus?.();
    };
  }, [device, onClose]);

  const summary = device ? summarizeHealth(device) : null;
  const report = summary?.report ?? null;
  const addresses = device ? resolveAddresses(device) : null;
  const link = device ? (LINK_TONE[device.health_status] ?? LINK_TONE.OFFLINE) : null;
  const reportStatus = normalizeStatus(report?.status);
  const checkedAt = device?.last_health_at ?? (typeof report?.checked_at === "string" ? report.checked_at : null);

  const handleCopy = async () => {
    if (!report || !device) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopiedFor(device.id);
      setTimeout(() => setCopiedFor(null), 2000);
    } catch {
      // Clipboard can be blocked by permissions; the raw JSON below stays selectable.
    }
  };

  return (
    <AnimatePresence>
      {device && summary && link && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-[#04142899] backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Diagnostics for ${device.device_label}`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-[101] flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_60px_rgba(4,46,92,.22)] focus:outline-none"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#1A3D2C]/[0.07] px-7 py-5">
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-semibold text-[#1A3D2C]">
                  {device.device_label}
                </h3>
                <p className="mt-0.5 truncate font-mono text-[11px] text-[#1A3D2C]/40">
                  {displayHardwareId(device.hardware_id)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${link.className}`}
                >
                  {link.label}
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close diagnostics"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1A3D2C]/40 transition-colors hover:bg-[#1A3D2C]/5 hover:text-[#1A3D2C]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-7 py-5">
              {/* Link */}
              <section>
                <SectionLabel>Link</SectionLabel>
                <div className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  <Row label="Status">{link.label}</Row>
                  {device.last_heartbeat_at && (
                    <Row label="Last heartbeat">
                      <RelativeTime value={device.last_heartbeat_at} />
                    </Row>
                  )}
                  {device.last_connected_at && (
                    <Row label="Last connected">
                      <RelativeTime value={device.last_connected_at} />
                    </Row>
                  )}
                  {addresses?.current && (
                    <Row label={addresses.changed ? "Address (current)" : "Address"}>
                      <span className="font-mono">{addresses.current}</span>
                    </Row>
                  )}
                  {addresses?.changed && addresses.atSelfTest && (
                    <Row label="Address (at self-test)">
                      <span className="font-mono text-[#1A3D2C]/50">{addresses.atSelfTest}</span>
                    </Row>
                  )}
                </div>
                {addresses?.changed && (
                  <p className="mt-1.5 text-[11px] text-[#1A3D2C]/45">
                    The device moved to a different address since its last self-test.
                  </p>
                )}
              </section>

              {!summary.hasReport ? (
                <div className="rounded-xl bg-[#F4F3EE] px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-[#1A3D2C]/60">No self-test reported yet</p>
                  <p className="mt-1 text-[12px] text-[#1A3D2C]/40">
                    {device.revoked_at
                      ? "This device was revoked; its diagnostics are no longer collected."
                      : "Diagnostics appear once the device runs its first health check."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Self-test */}
                  <section
                    className={`rounded-xl border p-4 ${
                      summary.isStale
                        ? "border-[#1A3D2C]/[0.07] bg-[#F4F3EE]"
                        : "border-[#1A3D2C]/[0.07] bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <SectionLabel>{summary.isStale ? "Last known self-test" : "Self-test"}</SectionLabel>
                      <span className="text-[11px] font-semibold text-[#1A3D2C]/45">
                        <RelativeTime value={checkedAt} prefix="Checked " />
                      </span>
                    </div>

                    {summary.isStale && summary.isLinkDown && (
                      <p className="mt-2 text-[11px] leading-relaxed text-[#1A3D2C]/50">
                        The device is not reachable right now. Everything below describes its state at
                        the time of the last check, not the present.
                      </p>
                    )}

                    <div className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                      <Row label="Overall">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PILL_TONE[reportStatus]}`}
                        >
                          {STATUS_LABEL[reportStatus]}
                        </span>
                      </Row>
                      {summary.uptimeLabel && <Row label="Uptime">{summary.uptimeLabel}</Row>}
                      {typeof report?.trigger === "string" && (
                        <Row label="Trigger">{humanizeKey(report.trigger)}</Row>
                      )}
                      {typeof report?.mode === "string" && <Row label="Mode">{humanizeKey(report.mode)}</Row>}
                      {typeof report?.serial === "string" && (
                        <Row label="Serial">
                          <span className="font-mono">{report.serial}</span>
                        </Row>
                      )}
                      {device.device_model && <Row label="Model">{device.device_model}</Row>}
                      {device.firmware_version && (
                        <Row label="Software">
                          <span className="font-mono">{device.firmware_version}</span>
                        </Row>
                      )}
                      {typeof report?.schema_version === "number" && (
                        <Row label="Report schema">v{report.schema_version}</Row>
                      )}
                    </div>
                  </section>

                  {summary.firmwareDrift && (
                    <div className="flex items-start gap-2 rounded-xl bg-warning-bg p-3 text-[12px] text-warning-ink">
                      <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                      <span>
                        The device record says software{" "}
                        <span className="font-mono font-bold">{device.firmware_version}</span>, but its
                        last self-test reported{" "}
                        <span className="font-mono font-bold">{String(report?.firmware_version)}</span>.
                        An update may not have completed.
                      </span>
                    </div>
                  )}

                  {summary.failedNames.length > 0 && (
                    <div className="flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-[12px] text-danger-ink">
                      <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                      <span>
                        <strong>
                          {summary.failedNames.length} subsystem
                          {summary.failedNames.length === 1 ? "" : "s"} failing:
                        </strong>{" "}
                        {summary.failedNames.join(", ")}.
                      </span>
                    </div>
                  )}

                  {/* Subsystems */}
                  <section>
                    <SectionLabel>Subsystems</SectionLabel>
                    <div className="mt-2 space-y-2">
                      {summary.components.map((component) => {
                        const Icon = component.icon;
                        return (
                          <div
                            key={component.key}
                            className="rounded-xl border border-[#1A3D2C]/[0.07] p-3.5"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F4F3EE]">
                                <Icon size={14} className="text-[#1A3D2C]/70" />
                              </span>
                              <p className="text-[13px] font-bold text-[#1A3D2C]">{component.label}</p>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PILL_TONE[component.status]}`}
                              >
                                {component.statusLabel}
                              </span>
                            </div>
                            {component.detail && (
                              <p className="mt-2 text-[11.5px] leading-relaxed text-[#1A3D2C]/50">
                                {component.detail}
                              </p>
                            )}
                            <div className="mt-2">
                              <MetricGrid metrics={component.metrics} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <details className="group">
                    <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-widest text-[#1A3D2C]/35 hover:text-[#1A3D2C]/60">
                      Raw report
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-[#F4F3EE] p-3 font-mono text-[10.5px] leading-relaxed text-[#1A3D2C]/70">
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#1A3D2C]/[0.07] px-7 py-4">
              <p className="text-[11px] text-[#1A3D2C]/35">
                {summary.hasReport ? "Reported by the device itself." : "Awaiting first report."}
              </p>
              <div className="flex items-center gap-2">
                {summary.hasReport && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-xl border border-[#1A3D2C]/10 px-3 py-2 text-xs font-bold text-[#1A3D2C]/60 transition-colors hover:bg-[#1A3D2C]/5"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy JSON"}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-xl bg-[#1A3D2C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0f2a1d]"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
