"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MonitorSmartphone, Wifi, WifiOff, TriangleAlert, Link2, ArrowRightLeft, Settings2, Ban, X, ChevronRight, RefreshCw, type LucideIcon } from "lucide-react";
import { useLabStore } from "../store/useLabStore";
import { DeviceTokenModal } from "./DeviceTokenModal";
import { LabDevicePairingWizard } from "./LabDevicePairingWizard";
import { MoveDeviceModal } from "./MoveDeviceModal";
import { DeviceHealthStrip } from "./DeviceHealthStrip";
import { DeviceDiagnosticsModal } from "./DeviceDiagnosticsModal";
import { displayHardwareId, summarizeHealth } from "../utils/deviceHealth";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { useNow } from "@/utils/useNow";
import type { DeviceResponse, LabDeviceHealth } from "../types/lab";
import { ApiRequestError } from "@/utils/authFetch";

const healthStyles: Record<LabDeviceHealth, { icon: LucideIcon; className: string; label: string }> = {
  ONLINE: { icon: Wifi, className: "bg-[#E5F2E9] text-[#1A3D2C]", label: "Online" },
  OFFLINE: { icon: WifiOff, className: "bg-[#F4F3EE] text-[#1A3D2C]/50", label: "Offline" },
  NEEDS_ATTENTION: { icon: TriangleAlert, className: "bg-danger-bg text-danger-ink", label: "Needs attention" },
};

/**
 * Health changes on a heartbeat cadence, not a UI one — deliberately slower
 * than the live board's 5s poll.
 */
const DEVICE_POLL_MS = 20_000;

interface LabSetupProps {
  partnerId: string;
}

/**
 * "updated 12s ago" beside the refresh control. Turns amber once two poll
 * cycles have passed without a successful fetch — the only signal that the
 * silent background poll is failing.
 */
function LastUpdatedLabel({ fetchedAt }: { fetchedAt?: number }) {
  const now = useNow();

  // `0` means the shared clock has not started yet (server render / first paint).
  if (!fetchedAt || now === 0) return null;

  const seconds = Math.max(0, Math.round((now - fetchedAt) / 1000));
  const isLagging = now - fetchedAt > DEVICE_POLL_MS * 2;
  const label = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;

  return (
    <span
      className={`mr-1 text-[11px] font-semibold tabular-nums ${
        isLagging ? "text-warning-ink" : "text-[#1A3D2C]/35"
      }`}
      title={isLagging ? "The device list has not refreshed recently" : undefined}
    >
      updated {label} ago
    </span>
  );
}

export function LabSetup({ partnerId }: LabSetupProps) {
  const {
    labs,
    isLoadingLabs,
    devicesByLab,
    devicesFetchedAt,
    fetchLabs,
    createLab,
    fetchDevices,
    registerDevice,
    revokeDevice,
    lastMintedToken,
    clearMintedToken,
  } = useLabStore();

  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [isCreateLabOpen, setCreateLabOpen] = useState(false);
  const [isRegisterDeviceOpen, setRegisterDeviceOpen] = useState(false);
  const [isPairingOpen, setPairingOpen] = useState(false);
  const [reconnectDevice, setReconnectDevice] = useState<DeviceResponse | null>(null);
  const [movingDevice, setMovingDevice] = useState<DeviceResponse | null>(null);
  const [diagnosticsDevice, setDiagnosticsDevice] = useState<DeviceResponse | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (partnerId) fetchLabs(partnerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  // Poll the device list so health metrics reflect the present, pausing while
  // the tab is hidden and catching up the moment it comes back.
  useEffect(() => {
    if (!selectedLabId) return;
    const labId = selectedLabId;
    let handle: ReturnType<typeof setInterval> | null = null;

    const poll = () => void fetchDevices(labId, { silent: true });
    const start = () => {
      if (handle === null) handle = setInterval(poll, DEVICE_POLL_MS);
    };
    const stop = () => {
      if (handle !== null) {
        clearInterval(handle);
        handle = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        poll();
        start();
      }
    };

    void fetchDevices(labId);
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabId]);

  const handleManualRefresh = useCallback(async () => {
    if (!selectedLabId || isRefreshing) return;
    setRefreshing(true);
    try {
      await fetchDevices(selectedLabId, { silent: true });
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabId, isRefreshing]);

  const selectedLab = labs.find((l) => l.id === selectedLabId);
  const devices = selectedLabId ? devicesByLab[selectedLabId] || [] : [];
  const mintedDevice = lastMintedToken ? devices.find((d) => d.id === lastMintedToken.deviceId) : null;
  // Track the polled copy so an open diagnostics panel keeps updating rather
  // than freezing on the snapshot taken when it was opened.
  const liveDiagnosticsDevice = diagnosticsDevice
    ? (devices.find((d) => d.id === diagnosticsDevice.id) ?? diagnosticsDevice)
    : null;

  return (
    <div className="flex h-full">
      {/* Lab list */}
      <div className="w-80 shrink-0 border-r border-[#1A3D2C]/5 bg-white/40 p-6 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#1A3D2C]/60">Labs</h3>
          <button
            onClick={() => setCreateLabOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3D2C] text-white hover:bg-[#0f2a1d]"
          >
            <Plus size={16} />
          </button>
        </div>

        {isLoadingLabs ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[#1A3D2C]/5" />
            ))}
          </div>
        ) : labs.length === 0 ? (
          <p className="text-sm text-[#1A3D2C]/40">No labs yet. Create one to register devices.</p>
        ) : (
          <div className="space-y-2">
            {labs.map((lab) => (
              <button
                key={lab.id}
                onClick={() => setSelectedLabId(lab.id)}
                className={`flex w-full items-center justify-between rounded-xl p-3.5 text-left transition-colors ${
                  selectedLabId === lab.id ? "bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]" : "hover:bg-white/60"
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-[#1A3D2C]">{lab.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#1A3D2C]/50">
                    {lab.device_count} device{lab.device_count === 1 ? "" : "s"}
                    {lab.location ? ` · ${lab.location}` : ""}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[#1A3D2C]/30" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Devices */}
      <div className="flex-1 overflow-y-auto p-8">
        {!selectedLab ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[#1A3D2C]/40">
            <MonitorSmartphone size={40} className="mb-3" />
            <p className="text-sm font-semibold">Select a lab to manage its devices</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#1A3D2C]">{selectedLab.name}</h2>
                <p className="mt-1 text-sm text-[#1A3D2C]/50">
                  {selectedLab.location || "No location set"} · default session{" "}
                  {Math.round(selectedLab.default_session_seconds / 60)} min
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LastUpdatedLabel fetchedAt={devicesFetchedAt[selectedLab.id]} />
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh device health"
                  title="Refresh device health"
                  className="flex items-center justify-center rounded-xl border border-[#1A3D2C]/10 p-2.5 text-[#1A3D2C]/60 hover:bg-[#1A3D2C]/5 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => setRegisterDeviceOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-[#1A3D2C]/10 px-3 py-2.5 text-xs font-bold text-[#1A3D2C]/60 hover:bg-[#1A3D2C]/5"
                  title="Manual token registration is retained only as a pilot fallback"
                >
                  <Settings2 size={14} />
                  Advanced
                </button>
                <button
                  onClick={() => {
                    setReconnectDevice(null);
                    setPairingOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#1A3D2C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0f2a1d]"
                >
                  <Plus size={16} />
                  Pair devices
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">{error}</div>
            )}

            {devices.length === 0 ? (
              <p className="text-sm text-[#1A3D2C]/40">No devices registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {devices.map((device) => {
                  const health = healthStyles[device.health_status];
                  const HealthIcon = health.icon;
                  const summary = summarizeHealth(device);
                  const faultCount = summary.failedNames.length;
                  const waitingForFirstConnection =
                    device.provisioning_source === "PAIRING" &&
                    !device.first_connected_at &&
                    !device.revoked_at;
                  return (
                    <div
                      key={device.id}
                      className={`rounded-2xl border p-4 ${
                        device.revoked_at ? "border-[#1A3D2C]/5 bg-[#F4F3EE] opacity-60" : "border-[#1A3D2C]/5 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-[#1A3D2C]">{device.device_label}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-[#1A3D2C]/40">
                            {displayHardwareId(device.hardware_id)}
                          </p>
                        </div>
                        {device.is_spare && (
                          <span className="rounded-full bg-[#1A3D2C]/5 px-2 py-0.5 text-[10px] font-bold uppercase text-[#1A3D2C]/50">
                            Spare
                          </span>
                        )}
                      </div>
                      <span
                        className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          waitingForFirstConnection
                            ? "bg-amber-50 text-amber-700"
                            : health.className
                        }`}
                      >
                        <HealthIcon size={12} />
                        {waitingForFirstConnection ? "Approved · waiting for device" : health.label}
                        {!waitingForFirstConnection && faultCount > 0 && (
                          <span className="font-bold">
                            · {faultCount} fault{faultCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                      <div className="mt-2 space-y-0.5 text-[11px] text-[#1A3D2C]/45">
                        {device.device_model && <p>{device.device_model}</p>}
                        {device.firmware_version && <p>Software {device.firmware_version}</p>}
                        {device.last_connected_at && (
                          <p>
                            <RelativeTime value={device.last_connected_at} prefix="Last connected " />
                          </p>
                        )}
                      </div>

                      <DeviceHealthStrip device={device} onOpenDiagnostics={setDiagnosticsDevice} />

                      {!device.revoked_at && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              setReconnectDevice(device);
                              setPairingOpen(true);
                            }}
                            className="flex items-center justify-center gap-1 rounded-lg bg-[#1A3D2C]/5 py-2 text-[10px] font-bold text-[#1A3D2C] hover:bg-[#1A3D2C]/10"
                          >
                            <Link2 size={12} />
                            Reconnect
                          </button>
                          <button
                            onClick={() => setMovingDevice(device)}
                            className="flex items-center justify-center gap-1 rounded-lg bg-[#1A3D2C]/5 py-2 text-[10px] font-bold text-[#1A3D2C] hover:bg-[#1A3D2C]/10"
                          >
                            <ArrowRightLeft size={12} />
                            Move
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await revokeDevice(selectedLab.id, device.id);
                              } catch (err) {
                                setError(err instanceof ApiRequestError ? err.message : "Failed to revoke device.");
                              }
                            }}
                            className="flex items-center justify-center gap-1 rounded-lg bg-danger-bg py-2 text-[10px] font-bold text-danger-ink hover:bg-[#fbdcd3]"
                          >
                            <Ban size={12} />
                            Revoke
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <CreateLabModal
        isOpen={isCreateLabOpen}
        partnerId={partnerId}
        onClose={() => setCreateLabOpen(false)}
        onCreate={async (payload) => {
          const lab = await createLab(payload);
          setSelectedLabId(lab.id);
          setCreateLabOpen(false);
        }}
      />

      {selectedLab && (
        <RegisterDeviceModal
          isOpen={isRegisterDeviceOpen}
          labId={selectedLab.id}
          onClose={() => setRegisterDeviceOpen(false)}
          onRegister={async (payload) => {
            await registerDevice(payload);
            setRegisterDeviceOpen(false);
          }}
        />
      )}

      {selectedLab && (
        <LabDevicePairingWizard
          isOpen={isPairingOpen}
          lab={selectedLab}
          existingDevices={devices}
          reconnectDevice={reconnectDevice}
          onClose={() => {
            setPairingOpen(false);
            setReconnectDevice(null);
          }}
        />
      )}

      {selectedLab && (
        <MoveDeviceModal
          device={movingDevice}
          sourceLab={selectedLab}
          labs={labs}
          onClose={() => setMovingDevice(null)}
          onMoved={(targetLabId) => setSelectedLabId(targetLabId)}
        />
      )}

      <DeviceDiagnosticsModal
        device={liveDiagnosticsDevice}
        onClose={() => setDiagnosticsDevice(null)}
      />

      {lastMintedToken && (
        <DeviceTokenModal
          isOpen={!!lastMintedToken}
          deviceLabel={mintedDevice?.device_label || "device"}
          token={lastMintedToken.token}
          onClose={clearMintedToken}
        />
      )}
    </div>
  );
}

function CreateLabModal({
  isOpen,
  partnerId,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  partnerId: string;
  onClose: () => void;
  onCreate: (payload: { partner_id: string; name: string; location?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ partner_id: partnerId, name: name.trim(), location: location.trim() || undefined });
      setName("");
      setLocation("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to create lab.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-[#04142899] backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] bg-white p-7 shadow-[0_24px_60px_rgba(4,46,92,.22)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[#1A3D2C]">New lab</h3>
              <button onClick={onClose} className="text-[#1A3D2C]/30 hover:text-[#1A3D2C]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lab name (e.g. Computer Lab 1)"
                className="w-full rounded-xl border border-[#1A3D2C]/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#1A3D2C]/40"
              />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (optional)"
                className="w-full rounded-xl border border-[#1A3D2C]/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#1A3D2C]/40"
              />
              {error && <p className="text-xs text-danger-ink">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || isSubmitting}
                className="w-full rounded-xl bg-[#1A3D2C] py-3 text-sm font-bold text-white hover:bg-[#0f2a1d] disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create lab"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function RegisterDeviceModal({
  isOpen,
  labId,
  onClose,
  onRegister,
}: {
  isOpen: boolean;
  labId: string;
  onClose: () => void;
  onRegister: (payload: { lab_id: string; device_label: string; hardware_id: string; is_spare?: boolean }) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [hardwareId, setHardwareId] = useState("");
  const [isSpare, setIsSpare] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!label.trim() || !hardwareId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onRegister({ lab_id: labId, device_label: label.trim(), hardware_id: hardwareId.trim(), is_spare: isSpare });
      setLabel("");
      setHardwareId("");
      setIsSpare(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to register device.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-[#04142899] backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] bg-white p-7 shadow-[0_24px_60px_rgba(4,46,92,.22)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[#1A3D2C]">Register device</h3>
              <button onClick={onClose} className="text-[#1A3D2C]/30 hover:text-[#1A3D2C]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Desk label (e.g. Desk 1)"
                className="w-full rounded-xl border border-[#1A3D2C]/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#1A3D2C]/40"
              />
              <input
                value={hardwareId}
                onChange={(e) => setHardwareId(e.target.value)}
                placeholder="Hardware ID (unique)"
                className="w-full rounded-xl border border-[#1A3D2C]/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#1A3D2C]/40"
              />
              <label className="flex items-center gap-2 text-sm text-[#1A3D2C]/70">
                <input type="checkbox" checked={isSpare} onChange={(e) => setIsSpare(e.target.checked)} />
                Mark as spare (used for reassignment, not auto-allocated)
              </label>
              {error && <p className="text-xs text-danger-ink">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={!label.trim() || !hardwareId.trim() || isSubmitting}
                className="w-full rounded-xl bg-[#1A3D2C] py-3 text-sm font-bold text-white hover:bg-[#0f2a1d] disabled:opacity-50"
              >
                {isSubmitting ? "Registering…" : "Register device"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
