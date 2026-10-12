"use client";

import { useRef } from "react";

interface ResizeHandleProps {
  /** What this divider resizes, for screen readers ("steps panel", "chat"). */
  label: string;
  /** Current width of the panel it resizes, in px. */
  value: number;
  min: number;
  max: number;
  /**
   * +1 when dragging right makes the panel wider (a divider to the panel's
   * right), −1 when dragging left does (a divider to its left).
   */
  direction: 1 | -1;
  onResize: (width: number) => void;
  /** Drag or key press finished: persist. */
  onCommit: () => void;
  /** Double-click: back to the default width. */
  onReset: () => void;
}

const KEY_STEP = 16;

/**
 * A vertical divider in the gap between two lesson panels. Drag it (mouse,
 * pen or touch), or focus it and use ←/→ (Home/End for the limits).
 * Double-click restores the default width.
 */
export function ResizeHandle({ label, value, min, max, direction, onResize, onCommit, onReset }: ResizeHandleProps) {
  const start = useRef<{ x: number; w: number } | null>(null);
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label}`}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={`Drag to resize the ${label} · double-click to reset`}
      className="group relative flex h-full cursor-col-resize touch-none select-none items-center justify-center outline-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, w: value };
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        onResize(clamp(start.current.w + direction * (e.clientX - start.current.x)));
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        start.current = null;
        onCommit();
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const delta =
          e.key === "ArrowRight" ? KEY_STEP * direction
          : e.key === "ArrowLeft" ? -KEY_STEP * direction
          : 0;
        if (delta) {
          e.preventDefault();
          onResize(clamp(value + delta));
          onCommit();
        } else if (e.key === "Home" || e.key === "End") {
          e.preventDefault();
          onResize((e.key === "Home") === (direction === 1) ? min : max);
          onCommit();
        }
      }}
    >
      {/* The grip: a faint line that firms up on hover, focus and drag. */}
      <span
        aria-hidden
        className="h-14 w-1 rounded-full bg-[var(--ls-border-strong)] opacity-50 transition-[opacity,height,background-color] duration-150 group-hover:h-20 group-hover:bg-[var(--ls-primary)] group-hover:opacity-70 group-focus-visible:h-20 group-focus-visible:bg-[var(--ls-primary)] group-focus-visible:opacity-100 group-active:bg-[var(--ls-primary)] group-active:opacity-100"
      />
    </div>
  );
}
