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
    <nav aria-label="Figures shown in this lesson" className="flex items-center gap-2 border-t border-[var(--ls-border)] bg-white/80 px-3 py-3">
      {/* eslint-disable-next-line no-restricted-syntax -- a round icon step in the filmstrip. */}
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={index <= 0}
        aria-label="Previous figure"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--ls-ink-mid)] hover:bg-[var(--ls-primary-soft)] disabled:opacity-30"
      >
        <ChevronLeft size={18} />
      </button>
      <ol ref={stripRef} className="flex flex-1 gap-2.5 overflow-x-auto py-1 [scrollbar-width:none]">
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
                className={`grid h-16 w-24 place-items-center overflow-hidden rounded-xl border bg-white p-1 transition-[border-color,box-shadow] ${
                  current
                    ? "border-[var(--ls-primary)] shadow-[0_0_0_2px_var(--ls-primary-wash)]"
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
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--ls-ink-mid)] hover:bg-[var(--ls-primary-soft)] disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
