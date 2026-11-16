"use client";

import { useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { CheckItem } from "../types";
import { useUiText } from "../i18n";
import { SILENT_DRAG } from "./drag";

/** The drop target for the tray (taking an entry back out of its box). Box targets are named by their group's text. */
const TRAY = "\u0000tray";

/**
 * Grouping into boxes: the entries still to sort wait in a tray, and every group is a box that shows what is in it, so the whole
 * sort is visible at a glance. The current entry (the first in the tray, or one the learner picked, wherever it is) is marked; a box's
 * "Put here" puts it in that box. Picking an entry already in a box and putting it in another moves it. Several entries may share a
 * box. Everything is a button (Tab, Enter or Space, or a tap), and a polite note says where an entry went. On a pointer or touch
 * screen an entry can also be dragged into a box, or back to the tray; that is an extra way in, never the only one.
 */
export function GroupSorter({
  check,
  pairs,
  onChange,
  disabled = false,
}: {
  check: CheckItem;
  pairs: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const t = useUiText();
  const entries = check.left_entries ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  // The click that ends a drag is not a tap on the chip.
  const justDragged = useRef(false);
  // A mouse drags after a small movement, so a click still picks; a finger drags after a short press and hold, so a tap still picks
  // and a swipe across the chips still scrolls the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );
  const unsorted = entries.filter((entry) => !pairs[entry]);
  const current = picked ?? unsorted[0] ?? null;

  // After an entry is placed the keyboard's place goes to the next entry in the tray, else stays on the box it went into.
  const refocus = (nextEntry: string | null, group: string) =>
    window.setTimeout(() => {
      const target = nextEntry
        ? root.current?.querySelector<HTMLButtonElement>(`button[data-entry="${CSS.escape(nextEntry)}"]`)
        : root.current?.querySelector<HTMLButtonElement>(`button[data-group="${CSS.escape(group)}"]`);
      target?.focus();
    }, 0);

  const place = (entry: string, group: string | null) => {
    const next = { ...pairs };
    if (group) next[entry] = group;
    else delete next[entry];
    onChange(next);
    setNote(group ? t("putDone", { item: entry, group }) : t("putBack", { item: entry }));
    setPicked(null);
    return next;
  };

  const put = (group: string) => {
    if (!current) return;
    const next = place(current, group);
    refocus(entries.find((entry) => !next[entry]) ?? null, group);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    justDragged.current = true;
    setDragging(String(active.id));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    window.setTimeout(() => (justDragged.current = false), 0);
    if (disabled || !over) return;
    const entry = String(active.id);
    const target = over.id === TRAY ? null : String(over.id);
    if ((pairs[entry] ?? null) !== target) place(entry, target);
  };
  const onDragCancel = () => {
    setDragging(null);
    window.setTimeout(() => (justDragged.current = false), 0);
  };

  const chip = (entry: string) => (
    <DraggableChip
      key={entry}
      entry={entry}
      disabled={disabled}
      pressed={current === entry}
      label={pairs[entry] ? t("entryIn", { item: entry, group: pairs[entry] }) : entry}
      onPress={() => {
        if (justDragged.current) return;
        setPicked(current === entry ? null : entry);
      }}
    />
  );

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel} accessibility={SILENT_DRAG}>
      <div ref={root} className="mt-4 grid gap-3">
        <div>
          <p id={`tray-${check.id}`} className="lesson-hand mb-1.5 text-[16px] text-[var(--ls-ink-mid)]">
            {unsorted.length > 0 ? t("toSort") : t("allSorted")}
          </p>
          <DropZone id={TRAY} disabled={disabled}>
            <div role="group" aria-labelledby={`tray-${check.id}`} className="flex min-h-11 flex-wrap gap-2">
              {unsorted.map(chip)}
            </div>
          </DropZone>
        </div>
        <div className="grid gap-3 @[17rem]:grid-cols-2">
          {check.options.map((group) => {
            const inside = entries.filter((entry) => pairs[entry] === group.text);
            const headingId = `box-${check.id}-${group.id}`;
            return (
              <DropZone key={group.id} id={group.text} disabled={disabled}>
                <section
                  aria-labelledby={headingId}
                  className="rounded-xl border-2 border-dashed border-[var(--ls-ink-faint)] bg-[var(--ls-sage)] p-3 transition-colors group-data-[over]:border-solid group-data-[over]:border-[var(--ls-primary)] group-data-[over]:bg-[var(--ls-soft)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 id={headingId} className="lesson-hand text-[18px] font-bold">
                      {group.text}
                    </h3>
                    {/* eslint-disable-next-line no-restricted-syntax -- puts the current entry in this box. */}
                    <button
                      type="button"
                      data-group={group.text}
                      disabled={disabled || !current || pairs[current] === group.text}
                      aria-label={current ? t("putIn", { item: current, group: group.text }) : t("putHere")}
                      onClick={() => put(group.text)}
                      className="lesson-hand inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--ls-primary)] px-3 text-[16px] font-bold text-white transition-opacity hover:bg-[var(--ls-primary-hover)] disabled:opacity-35"
                    >
                      <Plus size={16} aria-hidden /> {t("putHere")}
                    </button>
                  </div>
                  <div className="mt-2 flex min-h-11 flex-wrap gap-2">
                    {inside.length === 0 ? (
                      <span className="lesson-hand self-center text-[15px] text-[var(--ls-ink-faint)]">{t(dragging ? "dropHere" : "boxEmpty")}</span>
                    ) : (
                      inside.map(chip)
                    )}
                  </div>
                </section>
              </DropZone>
            );
          })}
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {note}
        </p>
      </div>
      {/* The chip under the finger while it is dragged: drawn above everything, so no scrolling dock clips it. */}
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <span className="lesson-chip lesson-sketch-sm lesson-hand cursor-grabbing bg-[var(--ls-accent)] font-bold shadow-[3px_6px_0_rgb(18_45_48/0.18)]">{dragging}</span>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** An entry chip: a button to pick (tap, keyboard), and a drag source for a pointer. */
function DraggableChip({ entry, disabled, pressed, label, onPress }: { entry: string; disabled: boolean; pressed: boolean; label: string; onPress: () => void }) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: entry, disabled });
  return (
    // eslint-disable-next-line no-restricted-syntax -- an entry to sort: pressing it makes it the one to put in a box.
    <button
      ref={setNodeRef}
      {...listeners}
      type="button"
      data-entry={entry}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      onClick={onPress}
      className={`lesson-chip lesson-sketch-sm lesson-hand touch-manipulation select-none ${disabled ? "" : "cursor-grab"} ${isDragging ? "opacity-30" : ""}`}
    >
      {entry}
    </button>
  );
}

/** Somewhere an entry can be dropped; it says so (`data-over`) while a dragged entry is over it. */
function DropZone({ id, disabled, children }: { id: string; disabled: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return (
    <div ref={setNodeRef} data-over={isOver ? "" : undefined} className="group rounded-xl data-[over]:outline data-[over]:outline-2 data-[over]:outline-offset-2 data-[over]:outline-[var(--ls-ring)]">
      {children}
    </div>
  );
}
