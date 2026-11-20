"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { visualsService } from "../../services/visualsService";
import type { VisualDetail } from "../../types/visuals";

/** The picture box on the Zoovi device (the size the worker makes device pictures at). */
export const DEVICE_PICTURE = { width: 320, height: 230 };

/**
 * For an accepted textbook crop: show it at the device's picture size, and let the reviewer say it is still readable
 * there. Only a crop marked readable is made into a device picture (ADR 0052 decision 10); the rest stay app-only.
 */
export function DeviceReadableMark({
  detail,
  onMarked,
}: {
  detail: VisualDetail;
  onMarked: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marked, setMarked] = useState(detail.device_readable === true);
  if (detail.origin !== "textbook_crop" || detail.state !== "accepted")
    return null;
  const src = visualsService.imageSrc(detail.image_url);

  const mark = async () => {
    setBusy(true);
    setError(null);
    try {
      await visualsService.markDeviceReadable(detail.id);
      setMarked(true);
      onMarked();
    } catch (e) {
      setError(asError(e).message || "Couldn't mark this picture.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="On the Zoovi device"
      className="flex flex-col gap-2.5 rounded-2xl bg-[#F7F4EA] p-3.5"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#1D6315]/55">
        <Smartphone size={13} aria-hidden /> On the Zoovi device
      </p>
      <p className="text-xs text-[#1D6315]/70">
        This is how big the picture is on the device. Mark it only if every
        label and number can still be read at this size.
      </p>
      <div
        className="flex items-center justify-center rounded-lg border border-[#1D6315]/15 bg-white"
        style={{
          width: DEVICE_PICTURE.width,
          height: DEVICE_PICTURE.height,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="The picture at the device's size"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-[#1D6315]/50">No image</span>
        )}
      </div>
      {marked ? (
        <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <CheckCircle2 size={14} aria-hidden /> Readable on the device: it is
          made into a device picture shortly.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            pill
            disabled={busy}
            leadingIcon={
              busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Smartphone size={13} />
              )
            }
            onClick={() => void mark()}
          >
            Readable on the device
          </Button>
          <span className="text-[11px] text-[#1D6315]/55">
            Not readable? Leave it: it stays in the app only.
          </span>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-bold text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
