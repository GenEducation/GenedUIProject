"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ApiRequestError } from "@/utils/authFetch";
import { useLabStore } from "../store/useLabStore";
import type { DeviceResponse, LabResponse } from "../types/lab";
import { Button } from "@/components/ui/Button";
import { LEGACY_FOREST_BUTTON } from "@/components/ui/legacyBrandOverride";
import { Select } from "@/components/ui/Select";

interface MoveDeviceModalProps {
  device: DeviceResponse | null;
  sourceLab: LabResponse;
  labs: LabResponse[];
  onClose: () => void;
  onMoved: (targetLabId: string) => void;
}

export function MoveDeviceModal({
  device,
  sourceLab,
  labs,
  onClose,
  onMoved,
}: MoveDeviceModalProps) {
  const moveDevice = useLabStore((state) => state.moveDevice);
  const targets = labs.filter((lab) => lab.id !== sourceLab.id);
  const defaultTargetLabId = labs.find((lab) => lab.id !== sourceLab.id)?.id || "";
  const [targetLabId, setTargetLabId] = useState("");
  const [isMoving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetLabId(defaultTargetLabId);
    setError(null);
  }, [device?.id, defaultTargetLabId]);

  if (!device) return null;

  const submit = async () => {
    if (!targetLabId) return;
    setMoving(true);
    setError(null);
    try {
      await moveDevice(sourceLab.id, device.id, targetLabId);
      onMoved(targetLabId);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not move this device. End any active session and try again.",
      );
    } finally {
      setMoving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#04142899] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-device-title"
    >
      <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-[0_24px_60px_rgba(4,46,92,.22)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="move-device-title" className="text-lg font-black text-[#1A3D2C]">
              Move {device.device_label}
            </h2>
            <p className="mt-1 text-sm text-[#1A3D2C]/55">
              Its Lab credential stays installed. No re-pairing is required.
            </p>
          </div>
          <Button iconOnly size="sm" variant="tertiary" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>

        {targets.length > 0 ? (
          <>
            <label className="mt-5 block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1A3D2C]/50">
                Target Lab
              </span>
              <Select
                aria-label="Target lab"
                value={targetLabId}
                onChange={setTargetLabId}
                options={targets.map((lab) => ({ value: lab.id, label: lab.name }))}
                accentColor="#1A3D2C"
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(26,61,44,0.10)",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              />
            </label>
            {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}
            <Button
              className="mt-5"
              fullWidth
              size="lg"
              loading={isMoving}
              onClick={submit}
              disabled={!targetLabId}
              style={LEGACY_FOREST_BUTTON}
            >
              Move device
            </Button>
          </>
        ) : (
          <p className="mt-5 rounded-xl bg-[#F4F3EE] p-3 text-sm text-[#1A3D2C]/60">
            Create another Lab before moving this device.
          </p>
        )}
      </div>
    </div>
  );
}
