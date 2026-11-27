"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { SubjectArt } from "@/features/subjects/subjectPresentation";
import { STUDENT_COLORS as C } from "../theme/colors";

/** How far the diorama rises above the card's top edge (layout C: the art breaks out of the card). */
export const SUBJECT_ART_OVERHANG = 84;

/**
 * A subject on the dashboard: its paper diorama standing up out of the top of a white card, the subject's name with
 * its colour dot, and where the student left off. The card opens the subject's chapters; the "Last: <chapter>" line
 * is its own button that reopens that chapter (the dashboard has no separate recent list).
 *
 * On hover (or keyboard focus) a subject with a rendered move plays it once: the frames of `art.sprite`, stepped at
 * its frame rate. Most moves end where they began; a `hold` move (Science) stays on its last frame while the
 * pointer stays, and returns to rest when it leaves. The frames load in the background once the page is idle, so the
 * first hover is instant; until then, and under reduced motion, the card shows its still.
 */
export function SubjectCard({
  label,
  color,
  line,
  art,
  onOpen,
  resume,
}: {
  label: string;
  color: string;
  /** "Last: <chapter>" or a nudge to start. */
  line: string;
  art: SubjectArt;
  onOpen: () => void;
  /** The chapter the student last had open in this subject: the line becomes a button that reopens it. */
  resume?: { chapter: string; onResume: () => void; busy?: boolean };
}) {
  const [hover, setHover] = useState(false);
  const sprite = art.sprite;
  const frameRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  const raf = useRef<number | null>(null);

  // Fetch the move's frames once the page is idle, so the first hover doesn't wait on the network.
  useEffect(() => {
    if (!sprite) return;
    let live = true;
    const load = () => {
      const img = new Image();
      img.src = sprite.src;
      const done = () => live && setReady(true);
      if (typeof img.decode === "function") img.decode().then(done, () => {});
      else img.onload = done;
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(load) : window.setTimeout(load, 1200);
    return () => {
      live = false;
      if (!idle) window.clearTimeout(id);
    };
  }, [sprite]);

  const showFrame = useCallback(
    (f: number) => {
      const el = frameRef.current;
      if (!el || !sprite) return;
      const rows = Math.ceil(sprite.frames / sprite.cols);
      const col = f % sprite.cols;
      const row = Math.floor(f / sprite.cols);
      el.style.backgroundPosition = `${sprite.cols > 1 ? (col / (sprite.cols - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`;
    },
    [sprite],
  );

  /** Swap between the still and the frames: straight on the elements, no re-render mid-move. The still must hide
   * while frames play, or anything that moves (the beam, the telescope) shows twice. */
  const setShown = useCallback((on: boolean) => {
    if (frameRef.current) frameRef.current.style.opacity = on ? "1" : "0";
    if (stillRef.current) stillRef.current.style.opacity = on ? "0" : "1";
  }, []);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  // Play once on hover; a hold move rests on its last frame until the pointer leaves.
  useEffect(() => {
    if (!sprite || !ready || !hover) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stop();
    setShown(true);
    const start = performance.now();
    const tick = (now: number) => {
      const f = Math.min(sprite.frames - 1, Math.floor(((now - start) / 1000) * sprite.fps));
      showFrame(f);
      if (f < sprite.frames - 1) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = null;
        if (!sprite.hold) setShown(false);
      }
    };
    showFrame(0);
    raf.current = requestAnimationFrame(tick);
    // Not cancelled when the pointer leaves (the move finishes on its own); `leave` stops a holding one.
  }, [hover, ready, sprite, showFrame, stop, setShown]);

  const enter = () => setHover(true);
  // Leaving: a move that holds its last frame (Science) goes back to rest; the others finish on their own.
  const leave = () => {
    setHover(false);
    if (sprite?.hold) {
      stop();
      setShown(false);
    }
  };

  return (
    <div
      onMouseEnter={enter}
      onMouseLeave={leave}
      className="relative flex-shrink-0 rounded-[24px]"
      style={{
        flex: "0 0 calc((100% - 2 * clamp(10px, 1.5vw, 16px)) / 3)",
        minWidth: 240,
        height: 268,
        background: C.card,
        border: `1px solid ${hover ? color + "66" : C.border}`,
        boxShadow: hover ? `0 22px 40px -22px ${color}66` : "0 1px 5px rgba(0,0,0,0.04)",
        transform: hover ? "translateY(-3px)" : "none",
        transition: "transform .25s ease, box-shadow .25s ease, border-color .25s ease",
        scrollSnapAlign: "start",
      }}
    >
      {/* The card's own hit target, under the text: opens the subject. A card-sized target, not a CTA. */}
      {/* eslint-disable-next-line no-restricted-syntax */}
      <button
        type="button"
        onClick={onOpen}
        onFocus={enter}
        onBlur={leave}
        aria-label={`${label}: see chapters`}
        className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-2 rounded-[24px] border-0 bg-transparent p-0"
      />
      {/* The diorama, standing up out of the card; a soft ground shadow under its plinth. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 pointer-events-none select-none"
        style={{ top: -SUBJECT_ART_OVERHANG, width: "min(84%, 272px)", aspectRatio: "1 / 1", transform: "translateX(-50%)" }}
      >
        <div
          className="absolute rounded-[50%]"
          style={{ left: "22%", right: "22%", top: `${art.ground - 4.5}%`, height: "7%", background: "rgba(29,99,21,0.14)", filter: "blur(6px)" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size WebPs, served as they are */}
        <img ref={stillRef} src={art.still} alt="" width={480} height={480} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
        {art.accent && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art.accent} alt="" width={480} height={480} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
        )}
        {sprite && (
          <div
            ref={frameRef}
            className="absolute inset-0"
            style={{
              backgroundImage: ready ? `url(${sprite.src})` : undefined,
              backgroundSize: `${sprite.cols * 100}% ${Math.ceil(sprite.frames / sprite.cols) * 100}%`,
              backgroundRepeat: "no-repeat",
              opacity: 0, // shown only while a move plays (set directly, frame by frame, without re-rendering)
            }}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 min-w-0" style={{ padding: "0 clamp(16px, 1.6vw, 20px) clamp(16px, 1.6vw, 20px)" }}>
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate font-bold" title={label} style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: "clamp(17px, 1.6vw, 20px)" }}>
            {label}
          </span>
        </div>
        {resume ? (
          // Its own button over the card's: reopens the chapter the student last had open here.
          // eslint-disable-next-line no-restricted-syntax -- an inline text link, not a CTA
          <button
            type="button"
            onClick={resume.onResume}
            disabled={resume.busy}
            aria-label={`Resume ${resume.chapter}`}
            className="group/resume pointer-events-auto relative z-[1] mt-1 flex max-w-full items-center gap-1.5 rounded-md border-0 bg-transparent p-0 text-left font-medium cursor-pointer outline-none focus-visible:ring-2 disabled:cursor-wait"
            style={{ color: C.textMuted, fontSize: "clamp(12px, 1vw, 13px)" }}
          >
            <span className="truncate underline-offset-2 group-hover/resume:underline" style={{ textDecorationColor: color }}>
              {line}
            </span>
            <ArrowRight aria-hidden size={13} strokeWidth={2.4} className="shrink-0 transition-transform group-hover/resume:translate-x-0.5" style={{ color }} />
          </button>
        ) : (
          <div className="mt-1 truncate font-medium" style={{ color: C.textMuted, fontSize: "clamp(12px, 1vw, 13px)" }}>
            {line}
          </div>
        )}
      </div>
    </div>
  );
}
