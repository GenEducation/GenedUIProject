"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Crop, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { visualsService } from "../../services/visualsService";
import { CROP_MAX_BOXES, type CropBox, type CropPage, type VisualCrop, type VisualDetail } from "../../types/visuals";
import {
  DEFAULT_BOX,
  boxBetween,
  boxStyle,
  moveBox,
  previewStyles,
  resizeBox,
  toThousandths,
  type Edges,
  type Point,
} from "./cropGeometry";
import { Skeleton } from "../Skeleton";

interface CropEditorProps {
  detail: VisualDetail;
  onCancel: () => void;
  /** The new textbook crop is stored, pending review. */
  onSaved: (id: string) => void;
}

interface EditBox {
  key: number;
  page: number;
  box: CropBox;
}

type Drag =
  | { kind: "move"; key: number; from: Point; start: CropBox }
  | { kind: "resize"; key: number; from: Point; start: CropBox; edges: Edges }
  | { kind: "draw"; key: number; from: Point };

const HANDLES: { edges: Edges; label: string; className: string }[] = [
  { edges: { top: true, left: true }, label: "top left", className: "-top-1.5 -left-1.5 cursor-nwse-resize" },
  { edges: { top: true, right: true }, label: "top right", className: "-top-1.5 -right-1.5 cursor-nesw-resize" },
  { edges: { bottom: true, left: true }, label: "bottom left", className: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
  { edges: { bottom: true, right: true }, label: "bottom right", className: "-bottom-1.5 -right-1.5 cursor-nwse-resize" },
  { edges: { top: true }, label: "top", className: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { edges: { bottom: true }, label: "bottom", className: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { edges: { left: true }, label: "left", className: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize" },
  { edges: { right: true }, label: "right", className: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize" },
];

const NUDGE = 5;

/**
 * Crop a textbook figure again on its own pages (backend VISUAL_LIBRARY_v1 §8).
 * Boxes start where the figure's crop was cut. Drag a box to move it, a
 * handle to resize it, or the page to draw a new one; up to six boxes, joined
 * top to bottom in list order. The server cuts the textbook's own pixels — no
 * model — and stores the result as a new crop to review.
 */
export function CropEditor({ detail, onCancel, onSaved }: CropEditorProps) {
  const [crop, setCrop] = useState<VisualCrop | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<EditBox[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nextKey = useRef(1);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const refetched = useRef(false);

  const fromCrop = useCallback((c: VisualCrop) => {
    setBoxes(c.boxes.map((b) => ({ key: nextKey.current++, page: b.page, box: b.box })));
    setPageIndex(Math.max(0, c.pages.findIndex((p) => p.page === c.boxes[0]?.page)));
  }, []);

  const load = useCallback(
    async (keepBoxes: boolean) => {
      try {
        const c = await visualsService.getCrop(detail.id);
        setCrop(c);
        if (!keepBoxes) fromCrop(c);
      } catch (e) {
        setLoadError(asError(e).message || "Couldn't open this figure's pages.");
      }
    },
    [detail.id, fromCrop],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const page: CropPage | undefined = crop?.pages[pageIndex];
  const onPage = boxes.filter((b) => b.page === page?.page);
  const full = boxes.length >= CROP_MAX_BOXES;

  const update = (key: number, box: CropBox) => setBoxes((bs) => bs.map((b) => (b.key === key ? { ...b, box } : b)));
  const remove = (key: number) => {
    setBoxes((bs) => bs.filter((b) => b.key !== key));
    setSelected((s) => (s === key ? null : s));
  };

  const point = (e: React.PointerEvent): Point | null => {
    const rect = frame.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? toThousandths(e.clientX, e.clientY, rect) : null;
  };

  const begin = (e: React.PointerEvent, next: Drag) => {
    e.preventDefault();
    e.stopPropagation();
    frame.current?.setPointerCapture?.(e.pointerId);
    drag.current = next;
    setSelected(next.key);
  };

  const onFramePointerDown = (e: React.PointerEvent) => {
    const at = point(e);
    if (!at || !page || full) return;
    begin(e, { kind: "draw", key: nextKey.current++, from: at });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const at = d && point(e);
    if (!d || !at || !page) return;
    if (d.kind === "draw") {
      const box = boxBetween(d.from, at);
      if (!box) return;
      setBoxes((bs) =>
        bs.some((b) => b.key === d.key) ? bs.map((b) => (b.key === d.key ? { ...b, box } : b)) : [...bs, { key: d.key, page: page.page, box }],
      );
    } else if (d.kind === "move") {
      update(d.key, moveBox(d.start, at.x - d.from.x, at.y - d.from.y));
    } else {
      update(d.key, resizeBox(d.start, d.edges, at.x - d.from.x, at.y - d.from.y));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    frame.current?.releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  const onBoxKey = (e: React.KeyboardEvent, b: EditBox) => {
    const step = e.shiftKey ? NUDGE * 5 : NUDGE;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(b.key);
    } else if (moves[e.key]) {
      e.preventDefault();
      e.stopPropagation(); // → also means "next visual" in the pane
      update(b.key, moveBox(b.box, ...moves[e.key]));
    }
  };

  const addBox = () => {
    if (!page || full) return;
    const key = nextKey.current++;
    setBoxes((bs) => [...bs, { key, page: page.page, box: DEFAULT_BOX }]);
    setSelected(key);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const made = await visualsService.recrop(detail.id, {
        content_hash: detail.content_hash,
        boxes: boxes.map((b) => ({ page: b.page, box: b.box })),
      });
      onSaved(made.id);
    } catch (e) {
      setSaveError(asError(e).message || "Couldn't save the crop. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center px-6">
        <p className="text-sm font-bold text-[#1A3D2C]">{loadError}</p>
        <Button variant="outline" onClick={onCancel}>
          Back to the visual
        </Button>
      </div>
    );
  }

  if (!crop || !page) {
    return (
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 p-5 md:p-7">
        <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const pageOf = (n: number) => crop.pages.find((p) => p.page === n);
  const pageSrc = visualsService.imageSrc(page.image_url);

  return (
    <section aria-label="Adjust crop" className="grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-8 p-5 md:p-7">
      {/* Left: the page, with the boxes on it */}
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-[#1A3D2C]/60 flex-1">
            Drag a box to move it, its handles to resize it, or drag on the page to add one.
          </p>
          {crop.pages.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                iconOnly
                size="sm"
                variant="tertiary"
                aria-label="Previous page"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((i) => i - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[11px] font-black text-[#1A3D2C]/60 tabular-nums">
                {pageIndex + 1} / {crop.pages.length}
              </span>
              <Button
                iconOnly
                size="sm"
                variant="tertiary"
                aria-label="Next page"
                disabled={pageIndex === crop.pages.length - 1}
                onClick={() => setPageIndex((i) => i + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-center rounded-2xl border border-[#1A3D2C]/10 bg-[#F4F6F4] p-3">
          <div
            ref={frame}
            data-testid="crop-page"
            onPointerDown={onFramePointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative select-none touch-none bg-white shadow-sm ${full ? "" : "cursor-crosshair"}`}
            style={{ width: `min(100%, calc(70vh * ${page.width / page.height}))`, aspectRatio: `${page.width} / ${page.height}` }}
          >
            {pageSrc && (
              // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived API path, like VisualImage
              <img
                src={pageSrc}
                alt={`Textbook page ${page.page}`}
                draggable={false}
                onError={() => {
                  if (refetched.current) return;
                  refetched.current = true;
                  void load(true);
                }}
                className="absolute inset-0 h-full w-full pointer-events-none"
              />
            )}
            {onPage.map((b) => {
              const n = boxes.indexOf(b) + 1;
              const active = selected === b.key;
              return (
                <div
                  key={b.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`Box ${n}: move with the arrow keys, Delete removes it`}
                  aria-pressed={active}
                  onPointerDown={(e) => begin(e, { kind: "move", key: b.key, from: point(e) ?? { x: 0, y: 0 }, start: b.box })}
                  onKeyDown={(e) => onBoxKey(e, b)}
                  onFocus={() => setSelected(b.key)}
                  style={boxStyle(b.box)}
                  className={`absolute cursor-move border-2 outline-none ${
                    active ? "border-[#1A3D2C] bg-[#1A3D2C]/10" : "border-[#1A3D2C]/70 bg-[#1A3D2C]/5"
                  }`}
                >
                  <span className="absolute -top-5 left-0 rounded-md bg-[#1A3D2C] px-1.5 text-[10px] font-black text-white">
                    {n}
                  </span>
                  {active &&
                    HANDLES.map((h) => (
                      <span
                        key={h.label}
                        aria-hidden
                        onPointerDown={(e) =>
                          begin(e, { kind: "resize", key: b.key, from: point(e) ?? { x: 0, y: 0 }, start: b.box, edges: h.edges })
                        }
                        className={`absolute h-3 w-3 rounded-sm border-2 border-[#1A3D2C] bg-white ${h.className}`}
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: what will be cut, and saving it */}
      <div className="flex flex-col gap-4 min-w-0">
        <header>
          <h4 className="flex items-center gap-2 text-sm font-black text-[#1A3D2C]">
            <Crop size={14} aria-hidden /> Adjust crop
          </h4>
          <p className="mt-1 text-xs text-[#1A3D2C]/60">
            The boxes are cut from the textbook page and joined top to bottom into one picture, which goes back to
            review. Cropping can&apos;t remove a watermark or change the background.
          </p>
        </header>

        <ol className="flex flex-col gap-2" aria-label="Boxes">
          {boxes.map((b, i) => {
            const p = pageOf(b.page);
            const src = visualsService.imageSrc(p?.image_url ?? null);
            const styles = p ? previewStyles(b.box, p) : null;
            return (
              <li
                key={b.key}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  selected === b.key ? "border-[#1A3D2C]/40 bg-[#1A3D2C]/5" : "border-[#1A3D2C]/10"
                }`}
              >
                <span className="text-xs font-black text-[#1A3D2C] w-4">{i + 1}</span>
                {styles && src && (
                  <div className="relative w-20 shrink-0 overflow-hidden rounded-md border border-[#1A3D2C]/10 bg-white" style={styles.frame}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- the same signed page image, cropped by CSS */}
                    <img src={src} alt="" className="absolute max-w-none" style={styles.image} />
                  </div>
                )}
                <span className="flex-1 text-xs font-bold text-[#1A3D2C]/60">Page {b.page}</span>
                <Button iconOnly size="sm" variant="tertiary" aria-label={`Remove box ${i + 1}`} onClick={() => remove(b.key)}>
                  <Trash2 size={13} />
                </Button>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" leadingIcon={<Plus size={13} />} onClick={addBox} disabled={full}>
            Add a box
          </Button>
          <Button variant="tertiary" size="sm" leadingIcon={<RotateCcw size={13} />} onClick={() => fromCrop(crop)}>
            Reset
          </Button>
        </div>
        {full && <p className="text-[11px] font-bold text-[#1A3D2C]/50">Six boxes is the most one crop can join.</p>}

        <div className="flex justify-end gap-2 pt-3 border-t border-[#1A3D2C]/5">
          <Button variant="tertiary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} disabled={boxes.length === 0} onClick={() => void save()}>
            Save crop
          </Button>
        </div>
        {saveError && (
          <p role="alert" className="text-xs font-bold text-red-600">
            {saveError}
          </p>
        )}
      </div>
    </section>
  );
}
