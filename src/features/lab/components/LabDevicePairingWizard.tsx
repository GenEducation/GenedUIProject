"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, Plus, Trash2, Wifi, X } from "lucide-react";
import { SegmentedInput } from "@/components/shared/SegmentedInput";
import { ApiRequestError } from "@/utils/authFetch";
import { useLabStore } from "../store/useLabStore";
import type { DeviceResponse, LabResponse } from "../types/lab";
import { Button } from "@/components/ui/Button";

type RowStatus = "READY" | "SUBMITTING" | "APPROVED_WAITING" | "ONLINE" | "FAILED";

interface PairingRow {
  key: string;
  code: string;
  label: string;
  isSpare: boolean;
  existingDeviceId?: string;
  deviceId?: string;
  status: RowStatus;
  error?: string;
}

interface LabDevicePairingWizardProps {
  isOpen: boolean;
  lab: LabResponse;
  existingDevices: DeviceResponse[];
  reconnectDevice?: DeviceResponse | null;
  onClose: () => void;
}

function nextDeskLabel(devices: DeviceResponse[], offset: number): string {
  const used = new Set(
    devices
      .map((device) => device.device_label.match(/(\d+)\s*$/)?.[1])
      .filter(Boolean)
      .map(Number),
  );
  let number = 1;
  let remaining = offset;
  while (true) {
    if (!used.has(number)) {
      if (remaining === 0) return `Desk ${number}`;
      remaining -= 1;
    }
    number += 1;
  }
}

function newRow(
  devices: DeviceResponse[],
  offset = 0,
  reconnectDevice?: DeviceResponse | null,
): PairingRow {
  return {
    key: crypto.randomUUID(),
    code: "",
    label: reconnectDevice?.device_label || nextDeskLabel(devices, offset),
    isSpare: reconnectDevice?.is_spare || false,
    existingDeviceId: reconnectDevice?.id,
    status: "READY",
  };
}

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error ? error.message : "Pairing failed. Please try again.";
  }
  switch (error.error_code) {
    case "LAB_1110":
      return "That code is invalid. Check the device screen and try again.";
    case "LAB_1111":
      return "That code expired. Wait for the device to show a new code.";
    case "LAB_1112":
      return "That code has already been used or cancelled.";
    case "LAB_1113":
      return "This physical device is already linked. Use Reconnect on its existing card.";
    case "LAB_1114":
      return "This existing device cannot be reconnected right now.";
    default:
      return error.message || "Pairing failed. Please try again.";
  }
}

export function LabDevicePairingWizard({
  isOpen,
  lab,
  existingDevices,
  reconnectDevice,
  onClose,
}: LabDevicePairingWizardProps) {
  const { confirmDevicePairing, fetchDevices, devicesByLab } = useLabStore();
  const [rows, setRows] = useState<PairingRow[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRows([newRow(existingDevices, 0, reconnectDevice)]);
    }
    // Re-initialize only when the wizard target changes. Device polling updates
    // existingDevices while the wizard is open and must not erase entered codes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lab.id, reconnectDevice?.id]);

  const waitingForDevice = rows.some((row) => row.status === "APPROVED_WAITING");
  const allFinished = rows.length > 0 && rows.every((row) => row.status === "ONLINE");
  const canSubmit =
    rows.length > 0 &&
    rows.some((row) => row.status === "READY" || row.status === "FAILED") &&
    rows.every(
      (row) =>
        row.status === "ONLINE" ||
        row.status === "APPROVED_WAITING" ||
        (row.code.length === 6 && row.label.trim().length > 0),
    );

  useEffect(() => {
    if (!isOpen || !waitingForDevice) return;

    const refresh = async () => {
      try {
        await fetchDevices(lab.id);
      } catch {
        // Keep the approved state and retry on the next tick. A transient
        // dashboard/API failure must not turn successful physical approval
        // into a second pairing attempt.
        return;
      }
      const latest = useLabStore.getState().devicesByLab[lab.id] || [];
      setRows((current) =>
        current.map((row) => {
          if (row.status !== "APPROVED_WAITING" || !row.deviceId) return row;
          const device = latest.find((item) => item.id === row.deviceId);
          return device?.health_status === "ONLINE" ? { ...row, status: "ONLINE" } : row;
        }),
      );
    };

    void refresh();
    const handle = window.setInterval(refresh, 2500);
    return () => window.clearInterval(handle);
  }, [fetchDevices, isOpen, lab.id, waitingForDevice]);

  const liveDevices = devicesByLab[lab.id] || existingDevices;
  const onlineCount = useMemo(
    () => rows.filter((row) => row.status === "ONLINE").length,
    [rows],
  );

  if (!isOpen) return null;

  const updateRow = (key: string, patch: Partial<PairingRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const submit = async () => {
    const candidates = rows.filter((row) => row.status === "READY" || row.status === "FAILED");
    setRows((current) =>
      current.map((row) =>
        candidates.some((candidate) => candidate.key === row.key)
          ? { ...row, status: "SUBMITTING", error: undefined }
          : row,
      ),
    );

    await Promise.allSettled(
      candidates.map(async (row) => {
        try {
          const result = await confirmDevicePairing({
            lab_id: lab.id,
            user_code: row.code,
            device_label: row.label.trim(),
            is_spare: row.isSpare,
            existing_device_id: row.existingDeviceId || null,
          });
          updateRow(row.key, {
            deviceId: result.device.id,
            status:
              result.device.health_status === "ONLINE" ? "ONLINE" : "APPROVED_WAITING",
            error: undefined,
          });
        } catch (error) {
          updateRow(row.key, { status: "FAILED", error: errorMessage(error) });
        }
      }),
    );
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#04142899] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pair-devices-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_60px_rgba(4,46,92,.22)]">
        <div className="flex items-start justify-between border-b border-[#1A3D2C]/10 px-6 py-5">
          <div>
            <h2 id="pair-devices-title" className="text-xl font-black text-[#1A3D2C]">
              {reconnectDevice ? `Reconnect ${reconnectDevice.device_label}` : "Pair devices"}
            </h2>
            <p className="mt-1 text-sm text-[#1A3D2C]/60">
              Enter the six-character code shown on each device. Devices will join{" "}
              <strong>{lab.name}</strong> automatically.
            </p>
          </div>
          <Button iconOnly size="sm" variant="tertiary" onClick={onClose} aria-label="Close pairing wizard">
            <X size={20} />
          </Button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="mb-5 rounded-xl bg-[#F4F3EE] px-4 py-3 text-sm text-[#1A3D2C]/70">
            No hardware ID, device token, WebSocket URL, or SSH access is needed. Keep each
            device on the pairing-code screen until it shows Ready.
          </div>

          <div className="space-y-4" aria-live="polite">
            {rows.map((row, index) => (
              <div key={row.key} className="rounded-2xl border border-[#1A3D2C]/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-[#1A3D2C]">
                    {row.existingDeviceId ? "Reconnect device" : `Device ${index + 1}`}
                  </p>
                  {rows.length > 1 && row.status !== "APPROVED_WAITING" && row.status !== "ONLINE" && (
                    <Button iconOnly size="sm" variant="destructive" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key)) } aria-label={`Remove device ${index + 1}`}>
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#1A3D2C]/50">
                      Code shown on device
                    </label>
                    <div role="group" aria-label={`Pairing code for device ${index + 1}`}>
                      <SegmentedInput
                        length={6}
                        value={row.code}
                        onChange={(code) => updateRow(row.key, { code, status: "READY", error: undefined })}
                        disabled={
                          row.status === "SUBMITTING" ||
                          row.status === "APPROVED_WAITING" ||
                          row.status === "ONLINE"
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1A3D2C]/50">
                        Desk label
                      </span>
                      <input
                        value={row.label}
                        onChange={(event) => updateRow(row.key, { label: event.target.value })}
                        disabled={
                          row.status === "SUBMITTING" ||
                          row.status === "APPROVED_WAITING" ||
                          row.status === "ONLINE"
                        }
                        className="w-full rounded-xl border border-[#1A3D2C]/10 px-3 py-2.5 text-sm outline-none focus:border-[#1A3D2C]/40 disabled:bg-[#F4F3EE]"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[#1A3D2C]/70">
                      <input
                        type="checkbox"
                        checked={row.isSpare}
                        onChange={(event) => updateRow(row.key, { isSpare: event.target.checked })}
                        disabled={
                          row.status === "SUBMITTING" ||
                          row.status === "APPROVED_WAITING" ||
                          row.status === "ONLINE"
                        }
                      />
                      Spare device
                    </label>
                  </div>
                </div>

                <div className="mt-3">
                  {row.status === "SUBMITTING" && (
                    <p className="flex items-center gap-2 text-sm text-[#1A3D2C]/60">
                      <Loader2 size={15} className="animate-spin" /> Approving pairing…
                    </p>
                  )}
                  {row.status === "APPROVED_WAITING" && (
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                      <Loader2 size={15} className="animate-spin" /> Approved — waiting for the
                      physical device to connect
                    </p>
                  )}
                  {row.status === "ONLINE" && (
                    <p className="flex items-center gap-2 text-sm font-bold text-green-700">
                      <Wifi size={15} /> Online and ready
                    </p>
                  )}
                  {row.status === "FAILED" && (
                    <p className="flex items-center gap-2 text-sm text-danger-ink">
                      <CircleAlert size={15} /> {row.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!reconnectDevice && (
            <button
              onClick={() =>
                setRows((current) => [
                  ...current,
                  newRow(liveDevices, current.filter((row) => !row.existingDeviceId).length),
                ])
              }
              disabled={waitingForDevice}
              className="mt-4 flex items-center gap-2 rounded-xl border border-[#1A3D2C]/15 px-4 py-2.5 text-sm font-bold text-[#1A3D2C] hover:bg-[#1A3D2C]/5 disabled:opacity-50"
            >
              <Plus size={16} /> Add another device
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#1A3D2C]/10 px-6 py-4">
          <p className="text-sm text-[#1A3D2C]/55">
            {onlineCount > 0 ? `${onlineCount} device${onlineCount === 1 ? "" : "s"} online` : ""}
          </p>
          {allFinished ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl bg-[#1A3D2C] px-5 py-2.5 text-sm font-bold text-white"
            >
              <CheckCircle2 size={16} /> Done
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canSubmit || rows.some((row) => row.status === "SUBMITTING")}
              className="rounded-xl bg-[#1A3D2C] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pair {rows.length > 1 ? "devices" : "device"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
