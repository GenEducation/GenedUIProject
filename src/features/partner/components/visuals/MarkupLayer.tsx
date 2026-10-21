"use client";

import { useRef, useState } from "react";
import { boxFrom, MIN_DRAG, orderedMarks, pinBox, type Box, type Mark } from "./markup";

/** The picture's frame is 4:3 (see VisualImage); the picture sits inside it with `object-contain`. */
const FRAME_RATIO = 4 / 3;

/** Where the picture itself sits inside its 4:3 frame, in percent, so marks line up with what's drawn. */
export function contentRect(width: number, height: number) {
  const ratio = width > 0 && height > 0 ? width / height : FRAME_RATIO;
  if (ratio >= FRAME_RATIO) {
    const h = (FRAME_RATIO / ratio) * 100;
    return { left: 0, top: (100 - h) / 2, width: 100, height: h };
  }
  const w = (ratio / FRAME_RATIO) * 100;
  return { left: (100 - w) / 2, top: 0, width: w, height: 100 };
}

const pct = (box: Box) => ({ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` });

interface MarkupLayerProps {
  /** The picture's own size (the visual's `width` and `height`). */
  width: number;
  height: number;
  marks: Mark[];
  /** The tool in hand; null shows the marks without drawing. */
  tool: Mark["kind"] | null;
  activeId: string | null;
  onAdd: (kind: Mark["kind"], box: Box) => void;
  onSelect: (id: string) => void;
}

/**
 * Marks drawn over the picture: a drag makes a box, a tap drops a pin. Change marks are numbered as they'll be in
 * the note; a crop dims everything outside the area to keep.
 */
export function MarkupLayer({ width, height, marks, tool, activeId, onAdd, onSelect }: MarkupLayerProps) {
  const surface = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Box | null>(null);
  const rect = contentRect(width, height);
  const ordered = orderedMarks(marks);

  const point = (e: React.PointerEvent) => {
    const r = surface.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!tool || e.button !== 0) return;
    e.preventDefault();
    surface.current?.setPointerCapture?.(e.pointerId);
    const p = point(e);
    setStart(p);
    setDraft(boxFrom(p, p));
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start) return;
    setDraft(boxFrom(start, point(e)));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start || !tool) return;
    const box = boxFrom(start, point(e));
    setStart(null);
    setDraft(null);
    const tap = box.w < MIN_DRAG && box.h < MIN_DRAG;
    // A crop needs an area; a tap with the crop tool does nothing.
    if (tap && tool === "crop") return;
    onAdd(tool, tap ? pinBox(start) : box);
  };

  return (
    <div
      className="absolute"
      style={{ left: `${rect.left}%`, top: `${rect.top}%`, width: `${rect.width}%`, height: `${rect.height}%` }}
    >
      <div
        ref={surface}
        data-testid="markup-surface"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => { setStart(null); setDraft(null); }}
        className={`absolute inset-0 touch-none select-none ${tool ? "cursor-crosshair" : "pointer-events-none"}`}
      >
        {ordered.map((m, i) =>
          m.kind === "crop" ? (
            <div
              key={m.id}
              aria-hidden
              className="absolute rounded-[3px] border-2 border-dashed border-white shadow-[0_0_0_9999px_rgb(18_45_48/0.45)]"
              style={pct(m.box)}
            />
          ) : (
            // eslint-disable-next-line no-restricted-syntax -- a mark on the picture, selected to edit its row below.
            <button
              key={m.id}
              type="button"
              aria-label={`Change ${i + 1}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelect(m.id)}
              className={`pointer-events-auto absolute rounded-md border-2 transition-colors ${
                m.id === activeId ? "border-[#075E63] bg-[#075E63]/15" : "border-[#075E63]/80 bg-[#075E63]/5 hover:bg-[#075E63]/10"
              }`}
              style={pct(m.box)}
            >
              <span className="absolute -left-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#075E63] text-[10px] font-black text-white ring-2 ring-white">
                {i + 1}
              </span>
            </button>
          ),
        )}
        {draft && (
          <div
            aria-hidden
            className={`absolute rounded-md border-2 ${tool === "crop" ? "border-dashed border-white shadow-[0_0_0_9999px_rgb(18_45_48/0.45)]" : "border-[#075E63] bg-[#075E63]/10"}`}
            style={pct(draft)}
          />
        )}
      </div>
    </div>
  );
}
