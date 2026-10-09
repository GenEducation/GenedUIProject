"use client";

import { useCallback, useEffect, useRef } from "react";
import { animate, useMotionValue, type AnimationPlaybackControls, type MotionValue } from "framer-motion";
import { clampScale, interpolateCamera, NO_INSETS, zoomAt, type Camera, type Insets, type Size } from "./geometry";

/**
 * Apple-like: a critically damped spring (no bounce) over ~0.8 s. Flights move
 * one progress value along `interpolateCamera`, so pan and zoom stay in step.
 */
const FLIGHT = { type: "spring", duration: 0.8, bounce: 0 } as const;
/** Momentum after a drag: a short glide that eases to rest. */
const GLIDE = { type: "inertia", power: 0.35, timeConstant: 320 } as const;

const reducedMotion = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

export interface BoardCamera {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  get: () => Camera;
  /** Move to `target`: a spring flight, or at once when `instant` (or with reduced motion). */
  flyTo: (target: Camera, options?: { instant?: boolean }) => void;
  /** Zoom by `factor` around a screen point (the viewport's centre when omitted). */
  zoomBy: (factor: number, at?: { x: number; y: number }, options?: { instant?: boolean }) => void;
  /** Bind to the viewport element: drag to pan (with momentum), wheel to pan, pinch / ctrl+wheel to zoom. */
  bind: (element: HTMLElement | null) => void;
}

export function useBoardCamera(viewport: () => Size, insets: () => Insets = () => NO_INSETS): BoardCamera {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const running = useRef<AnimationPlaybackControls[]>([]);
  const element = useRef<HTMLElement | null>(null);

  const get = useCallback((): Camera => ({ x: x.get(), y: y.get(), scale: scale.get() }), [x, y, scale]);
  const set = useCallback(
    (c: Camera) => {
      x.set(c.x);
      y.set(c.y);
      scale.set(c.scale);
    },
    [x, y, scale],
  );
  const stop = useCallback(() => {
    running.current.forEach((a) => a.stop());
    running.current = [];
  }, []);

  const flyTo = useCallback(
    (target: Camera, options: { instant?: boolean } = {}) => {
      stop();
      if (options.instant || reducedMotion()) {
        set(target);
        return;
      }
      const from = get();
      const vp = viewport();
      const ins = insets();
      running.current = [
        animate(0, 1, { ...FLIGHT, onUpdate: (t) => set(interpolateCamera(from, target, t, vp, ins)) }),
      ];
    },
    [get, set, stop, viewport, insets],
  );

  const zoomBy = useCallback(
    (factor: number, at?: { x: number; y: number }, options: { instant?: boolean } = {}) => {
      const vp = viewport();
      const point = at ?? { x: vp.w / 2, y: vp.h / 2 };
      flyTo(zoomAt(get(), factor, point.x, point.y), options);
    },
    [flyTo, get, viewport],
  );

  // Pointer and wheel handling, attached once per viewport element (a re-render never interrupts a drag).
  const attach = useCallback((el: HTMLElement): (() => void) => {
    const pointers = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number; t: number } | null = null;
    let velocity = { x: 0, y: 0 };
    let pinch: { distance: number } | null = null;

    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      // Only the board itself pans; buttons and overlays inside it keep their clicks.
      if ((e.target as HTMLElement).closest("button, a, input, textarea, [data-no-pan]")) return;
      stop();
      el.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, local(e));
      last = { ...local(e), t: performance.now() };
      velocity = { x: 0, y: 0 };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) };
      }
      el.dataset.panning = "true";
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      const prev = pointers.get(e.pointerId)!;
      pointers.set(e.pointerId, p);
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        set(zoomAt(get(), distance / pinch.distance, (a.x + b.x) / 2, (a.y + b.y) / 2));
        pinch.distance = distance;
        return;
      }
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      x.set(x.get() + dx);
      y.set(y.get() + dy);
      const now = performance.now();
      if (last) {
        const dt = Math.max(1, now - last.t);
        // A smoothed velocity in px/s, so a slow last frame doesn't kill the glide.
        velocity = { x: velocity.x * 0.2 + (dx / dt) * 1000 * 0.8, y: velocity.y * 0.2 + (dy / dt) * 1000 * 0.8 };
      }
      last = { ...p, t: now };
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      if (pointers.size < 2) pinch = null;
      if (pointers.size > 0) return;
      delete el.dataset.panning;
      // A release after a pause is a stop, not a fling.
      const stale = !last || performance.now() - last.t > 80;
      if (!stale && !reducedMotion() && Math.hypot(velocity.x, velocity.y) > 60) {
        running.current = [
          animate(x, x.get(), { ...GLIDE, velocity: velocity.x }),
          animate(y, y.get(), { ...GLIDE, velocity: velocity.y }),
        ];
      }
      last = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stop();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch arrives as ctrl+wheel; a mouse wheel with ctrl/⌘ zooms too.
        const p = local(e);
        set(zoomAt(get(), Math.exp(-e.deltaY * unit * 0.0075), p.x, p.y));
      } else {
        x.set(x.get() - e.deltaX * unit);
        y.set(y.get() - e.deltaY * unit);
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [get, set, stop, x, y]);

  useEffect(() => stop, [stop]);

  const detach = useRef<(() => void) | null>(null);
  const bind = useCallback(
    (el: HTMLElement | null) => {
      if (element.current === el) return;
      detach.current?.();
      detach.current = null;
      element.current = el;
      if (el) detach.current = attach(el);
    },
    [attach],
  );

  return { x, y, scale, get, flyTo, zoomBy, bind };
}

export { clampScale };
