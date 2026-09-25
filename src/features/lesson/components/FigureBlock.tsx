"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, ZoomIn } from "lucide-react";
import type { FigureCrop, FigureGroup, PresentationManifest } from "../types/lesson";
import { manifestFigure } from "../store/figures";

/** A crop whose signed URL 403'd (its TTL window passed) or whose bytes failed to load. */
function useLoadFailure() {
  const [failed, setFailed] = useState(false);
  return { failed, onError: () => setFailed(true) };
}

/**
 * One crop: reserves its aspect ratio before the image arrives (no layout shift), never upscales past its
 * stored pixel size, and falls back to the figure's own description when the bytes can't be shown at all.
 */
function Crop({
  crop,
  manifest,
  onOpen,
  onExpired,
}: {
  crop: FigureCrop;
  manifest: PresentationManifest | null;
  onOpen: () => void;
  onExpired: () => void;
}) {
  const { failed, onError } = useLoadFailure();
  const entry = manifestFigure(manifest, crop.id);
  const aspectRatio = `${crop.width_px} / ${crop.height_px}`;

  if (!entry || failed) {
    return (
      <div
        className="flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#FAFBFD] px-4 py-5 text-center text-[12.5px] text-[#64748B]"
        style={{ aspectRatio }}
        role="img"
        aria-label={crop.learner_alt_text}
      >
        <ImageIcon size={18} className="text-[#94A3B8]" aria-hidden />
        <span>{crop.printed_text || crop.learner_alt_text}</span>
      </div>
    );
  }

  return (
    // A figure the learner can enlarge, not a design-system action button.
    // eslint-disable-next-line no-restricted-syntax
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tutor)]"
      // maxWidth caps the thumbnail at the crop's own stored pixels: `w-full` lets it shrink on a narrow
      // screen, but never grows past its native resolution (a small scanned crop stretched to fill a wide
      // chat column would just look blurry).
      style={{ aspectRatio, minHeight: 44, maxWidth: crop.width_px }}
      aria-label={`Enlarge: ${crop.learner_alt_text}`}
    >
      {/* Plain img, not next/image: the source is a short-lived signed URL from
          our own asset route, not a static/optimizable asset. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.url}
        alt={crop.learner_alt_text}
        onError={() => {
          onError();
          onExpired();
        }}
        className="h-full w-full object-contain"
        loading="lazy"
      />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#475569] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <ZoomIn size={13} aria-hidden />
      </span>
    </button>
  );
}

/** The enlarged view of one crop: a native `<dialog>`, so focus trapping, Escape-to-close and return-focus are free. */
function EnlargeDialog({ crop, url, onClose }: { crop: FigureCrop; url: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  // 2x the crop's stored pixels, or the viewport — whichever is smaller, so "enlarge" never stretches past
  // what the source can actually show clearly.
  const maxWidth = Math.min(crop.width_px * 2, typeof window !== "undefined" ? window.innerWidth - 32 : crop.width_px * 2);

  useEffect(() => {
    // `showModal()`, not the `open` attribute: only the modal form gives a native
    // backdrop, a focus trap, Escape-as-cancel, and focus return on close (P6).
    const el = ref.current;
    if (el && !el.open) {
      try {
        el.showModal();
      } catch {
        // Ignore if already open
      }
    }
    return () => {
      if (el?.open) {
        try {
          el.close();
        } catch {
          // Ignore if already closed
        }
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const clickedOutside =
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom;
          if (clickedOutside) onClose();
        }
      }}
      aria-label={crop.learner_alt_text}
      className="m-auto max-h-[90vh] max-w-[92vw] rounded-2xl border-none bg-white p-0 shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-2.5">
        <p className="min-w-0 truncate text-[13px] font-semibold text-[var(--primary-ink)]">
          {crop.printed_text || "Figure"}
        </p>
        {/* eslint-disable-next-line no-restricted-syntax */}
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#64748B] hover:bg-[#F1F5F9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tutor)]"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="max-h-[calc(90vh-48px)] overflow-auto p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={crop.learner_alt_text} style={{ maxWidth, width: "100%", height: "auto" }} />
        {crop.tutor_description && <p className="mt-3 text-[13px] leading-relaxed text-[#475569]">{crop.tutor_description}</p>}
      </div>
    </dialog>
  );
}

interface FigureBlockProps {
  group: FigureGroup;
  manifest: PresentationManifest | null;
  onExpired: () => void;
  /** "Discussed above" framing for a reference group already presented earlier in the thread (P5). */
  discussedElsewhere?: boolean;
}

/**
 * One figure group: a single crop full-width, or a grid for several — always in the group's own reading
 * order, so a screen reader or a sighted skim reads the crops in the order the tutor set them (P6).
 */
export function FigureBlock({ group, manifest, onExpired, discussedElsewhere }: FigureBlockProps) {
  const [open, setOpen] = useState<FigureCrop | null>(null);
  const grid = group.figures.length > 1;

  return (
    <div className="my-3 max-w-sm">
      {discussedElsewhere && (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Discussed above</p>
      )}
      <div className={grid ? "grid grid-cols-2 gap-2" : ""}>
        {group.figures.map((crop) => (
          <Crop key={crop.id} crop={crop} manifest={manifest} onOpen={() => setOpen(crop)} onExpired={onExpired} />
        ))}
      </div>
      {open &&
        (() => {
          const entry = manifestFigure(manifest, open.id);
          return entry ? <EnlargeDialog crop={open} url={entry.url} onClose={() => setOpen(null)} /> : null;
        })()}
    </div>
  );
}
