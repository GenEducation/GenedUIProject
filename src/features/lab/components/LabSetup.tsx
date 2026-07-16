"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MonitorSmartphone, Wifi, WifiOff, TriangleAlert, RotateCw, Ban, X, ChevronRight, type LucideIcon } from "lucide-react";
import { useLabStore } from "../store/useLabStore";
import { DeviceTokenModal } from "./DeviceTokenModal";
import type { LabDeviceHealth } from "../types/lab";
import { ApiRequestError } from "@/utils/authFetch";

const healthStyles: Record<LabDeviceHealth, { icon: LucideIcon; className: string; label: string }> = {
  ONLINE: { icon: Wifi, className: "bg-[#E5F2E9] text-[#1A3D2C]", label: "Online" },
  OFFLINE: { icon: WifiOff, className: "bg-[#F4F3EE] text-[#1A3D2C]/50", label: "Offline" },
  NEEDS_ATTENTION: { icon: TriangleAlert, className: "bg-danger-bg text-danger-ink", label: "Needs attention" },
};

interface LabSetupProps {
  partnerId: string;
}

export function LabSetup({ partnerId }: LabSetupProps) {
  const {
    labs,
    isLoadingLabs,
    devicesByLab,
    fetchLabs,
    createLab,
    fetchDevices,
    registerDevice,
    rotateToken,
    revokeDevice,
    lastMintedToken,
    clearMintedToken,
  } = useLabStore();

  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [isCreateLabOpen, setCreateLabOpen] = useState(false);
  const [isRegisterDeviceOpen, setRegisterDeviceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (partnerId) fetchLabs(partnerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  useEffect(() => {
    if (selectedLabId) fetchDevices(selectedLabId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabId]);

  const selectedLab = labs.find((l) => l.id === selectedLabId);
  const devices = selectedLabId ? devicesByLab[selectedLabId] || [] : [];
  const mintedDevice = lastMintedToken ? devices.find((d) => d.id === lastMintedToken.deviceId) : null;

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
              <button
                onClick={() => setRegisterDeviceOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#1A3D2C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0f2a1d]"
              >
                <Plus size={16} />
                Register device
              </button>
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
                          <p className="mt-0.5 font-mono text-[11px] text-[#1A3D2C]/40">{device.hardware_id}</p>
                        </div>
                        {device.is_spare && (
                          <span className="rounded-full bg-[#1A3D2C]/5 px-2 py-0.5 text-[10px] font-bold uppercase text-[#1A3D2C]/50">
                            Spare
                          </span>
                        )}
                      </div>
                      <span
                        className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${health.className}`}
                      >
                        <HealthIcon size={12} />
                        {health.label}
                      </span>

                      {!device.revoked_at && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await rotateToken(selectedLab.id, device.id);
                              } catch (err) {
                                setError(err instanceof ApiRequestError ? err.message : "Failed to rotate token.");
                              }
                            }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1A3D2C]/5 py-2 text-[11px] font-bold text-[#1A3D2C] hover:bg-[#1A3D2C]/10"
                          >
                            <RotateCw size={12} />
                            Rotate token
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await revokeDevice(selectedLab.id, device.id);
                              } catch (err) {
                                setError(err instanceof ApiRequestError ? err.message : "Failed to revoke device.");
                              }
                            }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-danger-bg py-2 text-[11px] font-bold text-danger-ink hover:bg-[#fbdcd3]"
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
