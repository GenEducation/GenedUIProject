"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { picturesFor, useLessonStore } from "../useLessonStore";

/**
 * Every figure the tutor has shown this session, floating over the foot of the
 * whiteboard: round thumbnails with no backdrop of their own (the pictures
 * blend into the board's paper), centred, the focused one larger with a deep
 * ocean ring. The strip itself lets clicks through to the board; only its
 * thumbnails and arrows take them.
 */
export function Filmstrip() {
  const ids = useLessonStore((s) => s.presentedFigureIds);
  const focused = useLessonStore((s) => s.focusedFigureId);
  const manifest = useLessonStore((s) => s.manifest);
  const focusFigure = useLessonStore((s) => s.focusFigure);
  const stripRef = useRef<HTMLOListElement>(null);
  const index = focused ? ids.indexOf(focused) : -1;

  // Keep the focused thumbnail in view when there are more than fit.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    el?.scrollIntoView?.({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [focused]);

  if (ids.length === 0) return null;

  const step = (delta: number) => {
    const next = ids[Math.min(Math.max(index + delta, 0), ids.length - 1)];
    if (next) focusFigure(next);
  };

  const arrow =
    "pointer-events-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--ls-border)] bg-white/85 text-[var(--ls-ink-mid)] shadow-[var(--ls-shadow)] backdrop-blur transition-[color,opacity] hover:text-[var(--ls-primary)] disabled:opacity-0";

  return (
    <nav
      aria-label="Figures shown in this lesson"
      className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-3 pb-3 pt-6"
    >
      <div className="flex w-full items-center justify-center gap-3">
        {/* eslint-disable-next-line no-restricted-syntax -- a round floating arrow over the board. */}
        <button type="button" onClick={() => step(-1)} disabled={index <= 0} aria-label="Previous figure" className={arrow}>
          <ChevronLeft size={18} />
        </button>

        {/* Centred while they fit; scrolls (still centred on the focused one) once they don't. */}
        <ol ref={stripRef} className="flex min-w-0 max-w-full items-center gap-3 overflow-x-auto px-2 py-2 [scrollbar-width:none]">
          {ids.map((id, i) => {
            const picture = picturesFor(manifest, id)[0];
            const current = id === focused;
            return (
              <li key={id} className="shrink-0">
                {/* eslint-disable-next-line no-restricted-syntax -- a round filmstrip thumbnail. */}
                <button
                  type="button"
                  onClick={() => focusFigure(id)}
                  aria-current={current}
                  aria-label={`Figure ${i + 1}`}
                  className={`pointer-events-auto grid place-items-center overflow-hidden rounded-full bg-[var(--ls-card-warm)] transition-[width,height,opacity,box-shadow] duration-300 ${
                    current
                      ? "h-[76px] w-[76px] opacity-100 ring-[3px] ring-[var(--ls-primary)] ring-offset-2 ring-offset-[var(--ls-card-warm)] shadow-[0_10px_22px_-12px_rgb(7_94_99/0.7)]"
                      : "h-14 w-14 opacity-70 ring-2 ring-[var(--ls-border-strong)] hover:opacity-100 hover:ring-[var(--ls-primary)]"
                  }`}
                >
                  {picture ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed, expiring API URL.
                    <img src={picture.src} alt="" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
                  ) : (
                    <ImageOff size={18} className="text-[var(--ls-ink-faint)]" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        {/* eslint-disable-next-line no-restricted-syntax -- a round floating arrow over the board. */}
        <button
          type="button"
          onClick={() => step(1)}
          disabled={index === -1 || index >= ids.length - 1}
          aria-label="Next figure"
          className={arrow}
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
