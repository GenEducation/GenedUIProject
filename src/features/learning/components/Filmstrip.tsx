"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { picturesFor, useLessonStore } from "../useLessonStore";

/**
 * Every figure the tutor has shown this session, in order. The board shows the
 * focused one; arrows and thumbnails move through them.
 */
export function Filmstrip() {
  const ids = useLessonStore((s) => s.presentedFigureIds);
  const focused = useLessonStore((s) => s.focusedFigureId);
  const manifest = useLessonStore((s) => s.manifest);
  const focusFigure = useLessonStore((s) => s.focusFigure);
  const stripRef = useRef<HTMLOListElement>(null);
  const index = focused ? ids.indexOf(focused) : -1;

  // Keep the focused thumbnail in view.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    el?.scrollIntoView?.({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [focused]);

  if (ids.length === 0) return null;

  const step = (delta: number) => {
    const next = ids[Math.min(Math.max(index + delta, 0), ids.length - 1)];
    if (next) focusFigure(next);
  };

  return (
    <nav aria-label="Figures shown in this lesson" className="flex flex-col gap-2 border-t border-[var(--ls-border)] bg-white px-3 pb-2.5 pt-3">
      <div className="flex items-center gap-3">
      {/* eslint-disable-next-line no-restricted-syntax -- a round icon step in the filmstrip. */}
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={index <= 0}
        aria-label="Previous figure"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--ls-border)] bg-white text-[var(--ls-ink-mid)] shadow-sm transition-colors hover:text-[var(--ls-primary)] disabled:opacity-30"
      >
        <ChevronLeft size={18} />
      </button>
      <ol ref={stripRef} className="flex flex-1 gap-3 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
        {ids.map((id, i) => {
          const picture = picturesFor(manifest, id)[0];
          const current = id === focused;
          return (
            <li key={id} className="shrink-0">
              {/* eslint-disable-next-line no-restricted-syntax -- a filmstrip thumbnail. */}
              <button
                type="button"
                onClick={() => focusFigure(id)}
                aria-current={current}
                aria-label={`Figure ${i + 1}`}
                className={`grid h-[88px] w-[112px] place-items-center overflow-hidden rounded-[16px] border-2 bg-[var(--ls-card-warm)] p-1.5 transition-[border-color,box-shadow] ${
                  current
                    ? "border-[var(--ls-primary)] shadow-[0_6px_14px_-8px_rgb(7_94_99/0.6)]"
                    : "border-[var(--ls-border)] hover:border-[var(--ls-border-strong)]"
                }`}
              >
                {picture ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed, expiring API URL.
                  <img src={picture.src} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageOff size={18} className="text-[var(--ls-ink-faint)]" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {/* eslint-disable-next-line no-restricted-syntax -- a round icon step in the filmstrip. */}
      <button
        type="button"
        onClick={() => step(1)}
        disabled={index === -1 || index >= ids.length - 1}
        aria-label="Next figure"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--ls-border)] bg-white text-[var(--ls-ink-mid)] shadow-sm transition-colors hover:text-[var(--ls-primary)] disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
      </div>
      {ids.length > 1 && (
        <div aria-hidden className="flex justify-center gap-1.5">
          {ids.map((id) => (
            <span
              key={id}
              className={`h-1.5 rounded-full transition-[width,background] ${id === focused ? "w-4 bg-[var(--ls-primary)]" : "w-1.5 bg-[var(--ls-border-strong)]"}`}
            />
          ))}
        </div>
      )}
    </nav>
  );
}
