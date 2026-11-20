"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CheckItem } from "../types";
import { useUiText } from "../i18n";
import { SILENT_DRAG } from "./drag";

/**
 * Sequencing. Each entry has "move up" and "move down", so the whole answer is built with Tab and Enter or Space (and by tap on a
 * phone), no dragging needed; on a pointer or touch screen an entry can also be dragged by its grip to where it belongs. The grip is
 * for the pointer only (the buttons are the keyboard's and screen reader's way), and only the grip takes the touch, so the page
 * still scrolls under a finger anywhere else. After each move, by button or drag, a polite live note says where the entry now is.
 * The list starts in the order the server served the entries, which is never the key's order.
 */
export function Sequencing({
  check,
  order,
  onChange,
  disabled = false,
}: {
  check: CheckItem;
  order: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const t = useUiText();
  const [note, setNote] = useState("");
  const list = useRef<HTMLOListElement>(null);
  // A small movement first, so a tap on the grip is never a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  // A button that becomes disabled (an entry reaching an end) would drop the keyboard's place: keep the focus with the entry being
  // moved, on the same direction while it can still go that way, else on the other.
  const keepFocus = (entry: string, direction: "up" | "down", atEnd: boolean) =>
    window.setTimeout(() => {
      const wanted = atEnd ? (direction === "up" ? "down" : "up") : direction;
      list.current?.querySelector<HTMLButtonElement>(`button[data-entry="${CSS.escape(entry)}"][data-direction="${wanted}"]`)?.focus();
    }, 0);
  const reorder = (from: number, to: number) => {
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setNote(t("atPosition", { item, n: to + 1, m: next.length }));
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    keepFocus(order[from], to < from ? "up" : "down", to === 0 || to === order.length - 1);
    reorder(from, to);
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (disabled || !over || active.id === over.id) return;
    reorder(order.indexOf(String(active.id)), order.indexOf(String(over.id)));
  };

  return (
    <div className="mt-4">
      <p id={`order-${check.id}`} className="lesson-hand mb-2 text-[16px] text-[var(--ls-ink-mid)]">
        {t("yourOrder")}
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={SILENT_DRAG}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol ref={list} aria-labelledby={`order-${check.id}`} className="grid gap-2">
            {order.map((entry, index) => (
              <SortableRow key={entry} id={entry} disabled={disabled}>
                <span aria-hidden className="lesson-pair-badge">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">{entry}</span>
                {/* eslint-disable-next-line no-restricted-syntax -- a move control inside the sequencing list. */}
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  data-entry={entry}
                  data-direction="up"
                  onClick={() => move(index, index - 1)}
                  aria-label={t("moveUp", { item: entry })}
                  className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--ls-primary-soft)] disabled:opacity-25"
                >
                  <ArrowUp size={20} aria-hidden />
                </button>
                {/* eslint-disable-next-line no-restricted-syntax -- a move control inside the sequencing list. */}
                <button
                  type="button"
                  disabled={disabled || index === order.length - 1}
                  data-entry={entry}
                  data-direction="down"
                  onClick={() => move(index, index + 1)}
                  aria-label={t("moveDown", { item: entry })}
                  className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--ls-primary-soft)] disabled:opacity-25"
                >
                  <ArrowDown size={20} aria-hidden />
                </button>
              </SortableRow>
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <p role="status" aria-live="polite" className="sr-only">
        {note}
      </p>
    </div>
  );
}

/** One entry of the list: it slides out of the way while another is dragged, and lifts while it is the one being dragged. */
function SortableRow({ id, disabled, children }: { id: string; disabled: boolean; children: ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      data-dragging={isDragging ? "" : undefined}
      // Up and down only: the list never moves sideways.
      style={{ transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined, transition }}
      className="lesson-sketch-sm lesson-hand relative flex min-h-11 items-center gap-1 py-1 pr-1 text-[18px] data-[dragging]:z-10 data-[dragging]:bg-[var(--ls-accent)] data-[dragging]:shadow-[3px_6px_0_rgb(18_45_48/0.18)]"
    >
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        aria-hidden
        data-grip=""
        className={`grid min-h-11 w-9 shrink-0 touch-none place-items-center text-[var(--ls-ink-faint)] ${disabled ? "" : "cursor-grab active:cursor-grabbing hover:text-[var(--ls-ink)]"}`}
      >
        <GripVertical size={18} />
      </span>
      {children}
    </li>
  );
}
