"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { langAttrs, type ItemWidgetProps } from "./itemProps";
import type { PlacementOption } from "../../types/placement";

/**
 * Put the items in order.
 *
 * Unlike match and multi_select, this one is graded as an exact sequence.
 *
 * Drag to reorder, with a pair of move buttons on every row. The buttons are
 * not a fallback bolted on for audits — they are the only way this works on a
 * keyboard or a screen reader, and on a small phone they are frequently the
 * easier gesture even for a mouse user.
 *
 * The list starts in the order the bank served it. That order is already
 * shuffled server-side, so it is deliberately NOT re-shuffled here: doing so
 * would change the item's difficulty between attempts.
 */
export function OrderItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const options = useMemo(
    () => (item.block_spec as { items?: PlacementOption[] }).items ?? [],
    [item.block_spec],
  );
  const { lang } = langAttrs(item);

  const [order, setOrder] = useState<string[]>(() =>
    value && "order" in value ? value.order : options.map((o) => o.id),
  );

  /**
   * A new item reuses this component, so reset to that item's served order —
   * and seed the draft with it, which is what enables Next.
   *
   * Seeding matters: the served order is already a complete (if probably
   * wrong) answer, so requiring a drag before Next unlocks would block a
   * student who genuinely believes the list is already right, and would teach
   * everyone else to jiggle one row to get past it.
   */
  useEffect(() => {
    const seeded = value && "order" in value ? value.order : options.map((o) => o.id);
    setOrder(seeded);
    onChange({ order: seeded });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.item_id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = (next: string[]) => {
    setOrder(next);
    onChange({ order: next });
  };

  const move = (from: number, to: number) => {
    if (disabled || to < 0 || to >= order.length) return;
    commit(arrayMove(order, from, to));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    commit(arrayMove(order, from, to));
  };

  const textFor = (id: string) => options.find((o) => o.id === id)?.text ?? "";

  return (
    <div className="space-y-1.5">
      <p
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "var(--pl-ink-faint)" }}
      >
        Drag, or use the arrows, to put these in order
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="space-y-1.5 list-none p-0 m-0">
            {order.map((id, index) => (
              <SortableRow
                key={id}
                id={id}
                index={index}
                total={order.length}
                text={textFor(id)}
                lang={lang}
                disabled={disabled}
                onMove={move}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  id,
  index,
  total,
  text,
  lang,
  disabled,
  onMove,
}: {
  id: string;
  index: number;
  total: number;
  text: string;
  lang?: string;
  disabled?: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: "var(--pl-card)",
        borderColor: isDragging ? "var(--pl-primary)" : "var(--pl-border)",
        color: "var(--pl-ink)",
        zIndex: isDragging ? 1 : undefined,
        boxShadow: isDragging ? "0 12px 28px rgb(7 94 99 / 0.18)" : undefined,
      }}
      className="flex items-center gap-1.5 p-1.5 rounded-lg border"
    >
      <span
        className="w-5 h-5 shrink-0 rounded-md flex items-center justify-center text-[11px] font-black"
        style={{ background: "var(--pl-surface)", color: "var(--pl-primary)" }}
        aria-hidden="true"
      >
        {index + 1}
      </span>

      <span
        {...listeners}
        {...attributes}
        className={`shrink-0 ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
        style={{ color: "var(--pl-ink-faint)" }}
        aria-hidden="true"
      >
        <GripVertical size={13} />
      </span>

      <span className="text-[13px] font-medium flex-1 min-w-0 leading-snug" lang={lang}>
        {text}
      </span>

      <span className="flex flex-col shrink-0">
        <MoveButton
          label={`Move "${text}" up`}
          disabled={disabled || index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ChevronUp size={13} strokeWidth={2.6} />
        </MoveButton>
        <MoveButton
          label={`Move "${text}" down`}
          disabled={disabled || index === total - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ChevronDown size={13} strokeWidth={2.6} />
        </MoveButton>
      </span>
    </li>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    /* eslint-disable-next-line no-restricted-syntax -- a 20px icon nudge
       inside a list row; Button's smallest size is far larger than the row. */
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="p-1 rounded-md transition-opacity disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2"
      style={{
        color: "var(--pl-primary)",
        // @ts-expect-error -- CSS custom property for the focus ring
        "--tw-ring-color": "var(--pl-ring)",
      }}
    >
      {children}
    </button>
  );
}
