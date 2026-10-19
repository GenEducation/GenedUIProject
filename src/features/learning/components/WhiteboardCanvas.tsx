"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValueEvent, useTransform } from "framer-motion";
import { Maximize, Minus, Plus } from "lucide-react";
import { picturesFor, useLessonStore } from "../useLessonStore";
import { altTextOf, figureGroupsOf } from "../figures";
import { boardSize, bounds, fitCamera, layoutFigures, NO_INSETS, type Insets, type Rect, type Size } from "../board/geometry";
import { useBoardCamera } from "../board/useBoardCamera";

const GRID = 30;
const HIGHLIGHT_MS = 1600;

interface PlacedFigure {
  id: string;
  rect: Rect;
  src: string;
  alt: string;
}

/**
 * The whiteboard as an endless canvas, the way Miro works: drag (or two-finger
 * scroll) to move around, pinch or ctrl/⌘+wheel to zoom, buttons to zoom and
 * to see everything. Each figure the tutor shows is placed far off the last in a
 * random direction, and the camera glides to frame it whole, whatever the
 * learner had zoomed or panned to. `insets` are the parts of the board covered
 * by overlays (title, question card, filmstrip): framing keeps clear of them.
 */
export function WhiteboardCanvas({
  insets = () => NO_INSETS,
  refitKey,
}: {
  insets?: () => Insets;
  /** Changes when the overlays change the clear area, so the focused figure is framed again. */
  refitKey?: unknown;
}) {
  const ids = useLessonStore((s) => s.presentedFigureIds);
  const focused = useLessonStore((s) => s.focusedFigureId);
  const manifest = useLessonStore((s) => s.manifest);
  const payload = useLessonStore((s) => s.payload);
  const refreshManifest = useLessonStore((s) => s.refreshManifest);

  const figures = useMemo<PlacedFigure[]>(() => {
    const groups = figureGroupsOf(payload);
    const withPictures = ids
      .map((id) => ({ id, picture: picturesFor(manifest, id)[0] }))
      .filter((f) => f.picture);
    const rects = layoutFigures(
      withPictures.map((f) => boardSize(f.picture!.width_px, f.picture!.height_px)),
      withPictures.map((f) => f.id),
    );
    return withPictures.map((f, i) => ({ id: f.id, rect: rects[i], src: f.picture!.src, alt: altTextOf(groups.get(f.id)) }));
  }, [ids, manifest, payload]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const size = useRef<Size>({ w: 0, h: 0 });
  const [measured, setMeasured] = useState(false);
  const camera = useBoardCamera(
    () => size.current,
    () => insets(),
  );

  // Track the viewport's size; the first real measurement frames the board.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const read = () => {
      size.current = { w: el.clientWidth, h: el.clientHeight };
      if (size.current.w > 0 && size.current.h > 0) setMeasured(true);
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Frame the focused figure: a new one as it arrives, or one picked from the filmstrip or chat.
  const framedOnce = useRef(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const highlighted = useRef<string | null>(null);
  const target = figures.find((f) => f.id === focused) ?? figures.at(-1);
  useEffect(() => {
    if (!measured || !target) return;
    camera.flyTo(fitCamera(target.rect, size.current, insets()), { instant: !framedOnce.current });
    const first = !framedOnce.current;
    framedOnce.current = true;
    // Only a newly focused figure is ringed; re-framing the same one (an overlay moved) isn't news.
    const fresh = highlighted.current !== target.id;
    highlighted.current = target.id;
    if (first || !fresh) return;
    const on = window.setTimeout(() => setHighlight(target.id), 0);
    const off = window.setTimeout(() => setHighlight((h) => (h === target.id ? null : h)), HIGHLIGHT_MS);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
    // Re-frame when the target or its place changes, not on every render.
  }, [measured, target?.id, target?.rect.x, target?.rect.y, target?.rect.w, target?.rect.h, refitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Signed URLs expire: a failed picture refreshes the manifest once; failing again, it says so instead.
  const [refreshed, setRefreshed] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const onPictureError = (id: string) => {
    if (refreshed.has(id)) {
      setFailed((prev) => new Set(prev).add(id));
      return;
    }
    setRefreshed((prev) => new Set(prev).add(id));
    void refreshManifest().catch(() => setFailed((prev) => new Set(prev).add(id)));
  };

  // Figures already on the board when it mounts (history) just appear; later ones ink in.
  const [onMount] = useState(() => new Set(ids));

  // The grid paper moves and scales with the board.
  const backgroundPosition = useTransform([camera.x, camera.y], ([x, y]) => `${x}px ${y}px`);
  const backgroundSize = useTransform(camera.scale, (s) => `${GRID * s}px ${GRID * s}px`);
  const [zoomPercent, setZoomPercent] = useState(100);
  useMotionValueEvent(camera.scale, "change", (s) => setZoomPercent(Math.round(s * 100)));

  const fitAll = () => {
    const all = bounds(figures.map((f) => f.rect));
    if (all) camera.flyTo(fitCamera(all, size.current, insets(), 1));
  };

  const control =
    "grid h-9 w-9 place-items-center rounded-full text-[var(--ls-ink-mid)] transition-colors hover:bg-[var(--ls-primary-soft)] hover:text-[var(--ls-primary)]";

  return (
    <motion.div
      ref={(el) => {
        viewportRef.current = el;
        camera.bind(el);
      }}
      role="region"
      aria-label="Whiteboard canvas"
      aria-roledescription="canvas"
      className="lesson-canvas absolute inset-0 touch-none select-none overflow-hidden"
      style={{ backgroundPosition, backgroundSize }}
    >
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: camera.x, y: camera.y, scale: camera.scale, transformOrigin: "0 0", willChange: "transform" }}
      >
        <ol aria-label="Figures on the board">
          {figures.map((f, i) => (
            <li
              key={f.id}
              data-figure-id={f.id}
              aria-current={f.id === focused ? "true" : undefined}
              className={`lesson-paper absolute ${onMount.has(f.id) ? "" : "lesson-writing"}`}
              style={{
                left: f.rect.x,
                top: f.rect.y,
                width: f.rect.w,
                height: f.rect.h,
                // The same world-aligned grid as the board, so the picture's white multiplies away into it.
                backgroundPosition: `${-f.rect.x}px ${-f.rect.y}px`,
                backgroundSize: `${GRID}px ${GRID}px`,
                ["--write-ms" as string]: "900ms",
              }}
            >
              {/* The arrival highlight: a rounded ring around the square paper, so no picture corner is left unblended. */}
              <span
                aria-hidden
                className={`pointer-events-none absolute -inset-3 rounded-[28px] transition-shadow duration-500 ${
                  highlight === f.id ? "shadow-[0_0_0_6px_var(--ls-primary-wash)]" : ""
                }`}
              />
              <span className="lesson-hand absolute -left-2 -top-9 text-[22px] text-[var(--ls-ink-faint)]" aria-hidden>
                {i + 1}
              </span>
              {failed.has(f.id) ? (
                <div className="grid h-full w-full place-items-center rounded-[28px] border-2 border-dashed border-[var(--ls-border-strong)]">
                  <p className="lesson-hand text-[26px] text-[var(--ls-ink-faint)]">This picture couldn&apos;t load.</p>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed, expiring API URL.
                <img
                  src={f.src}
                  alt={f.alt}
                  draggable={false}
                  onError={() => onPictureError(f.id)}
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              )}
            </li>
          ))}
        </ol>
      </motion.div>

      <div
        data-no-pan
        role="toolbar"
        aria-label="Zoom"
        className="absolute right-4 top-4 z-10 flex items-center gap-0.5 rounded-full border border-[var(--ls-border)] bg-white/90 p-1 shadow-[var(--ls-shadow)] backdrop-blur"
      >
        {/* eslint-disable-next-line no-restricted-syntax -- a round zoom tool. */}
        <button type="button" aria-label="Zoom out" className={control} onClick={() => camera.zoomBy(1 / 1.25)}>
          <Minus size={16} />
        </button>
        <span className="w-12 text-center text-[12px] font-semibold tabular-nums text-[var(--ls-ink-mid)]" aria-live="off">
          {zoomPercent}%
        </span>
        {/* eslint-disable-next-line no-restricted-syntax -- a round zoom tool. */}
        <button type="button" aria-label="Zoom in" className={control} onClick={() => camera.zoomBy(1.25)}>
          <Plus size={16} />
        </button>
        {/* eslint-disable-next-line no-restricted-syntax -- a round zoom tool. */}
        <button type="button" aria-label="Show everything" className={control} onClick={fitAll}>
          <Maximize size={15} />
        </button>
      </div>
    </motion.div>
  );
}
