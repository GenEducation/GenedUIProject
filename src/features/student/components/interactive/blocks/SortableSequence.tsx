"use client";

import React, { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter, Katex } from "../shared";

interface Item { id: string; label: string }
const Lbl = ({ s }: { s: string }) => (/\\/.test(s) ? <Katex tex={s} /> : <span>{s}</span>);

// Deterministic seeded shuffle that guarantees the result differs from the input
// order whenever there are ≥2 items (so an ordering task is never pre-solved).
function shuffleAway(ids: string[], seed: string): string[] {
  if (ids.length < 2) return ids;
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rng = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Fixed-point guard: if the shuffle happened to reproduce the original order,
  // rotate by one so the student always has something to do.
  if (out.every((id, i) => id === ids[i])) {
    return [...ids.slice(1), ids[0]];
  }
  return out;
}

function SortableTile({ id, label }: Item) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12,
        background: "#FFFFFF", border: `1px solid ${isDragging ? COLORS.brand : COLORS.border}`,
        fontSize: 15, fontWeight: 600, color: COLORS.ink, cursor: "grab", fontFamily: "'DM Sans', sans-serif",
        boxShadow: isDragging ? "0 6px 16px rgba(91,77,199,0.2)" : "none", touchAction: "none",
      }}
    >
      <GripVertical size={13} color={COLORS.muted} />
      <Lbl s={label} />
    </div>
  );
}

export default function SortableSequence({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const items: Item[] = render.items || [];
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "order";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  // An ordering activity must NOT present items already in answer order, or the
  // student can "solve" it by clicking Check without doing anything. Shuffle the
  // initial presentation (seeded by directiveId so it's stable across renders and
  // guaranteed to differ from the given order when ≥2 items exist). On history
  // reload we restore the student's saved order instead.
  const [order, setOrder] = useState<string[]>(() =>
    Array.isArray(studentAnswer?.order) ? studentAnswer.order : shuffleAway(items.map((i) => i.id), directiveId)
  );
  const lock = disabled || submitted;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor));

  const onDragEnd = (e: DragEndEvent) => {
    if (lock || !e.over || e.active.id === e.over.id) return;
    setOrder((prev) => arrayMove(prev, prev.indexOf(String(e.active.id)), prev.indexOf(String(e.over!.id))));
  };

  const byId = (id: string) => items.find((i) => i.id === id)!;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {order.map((id) => byId(id) && <SortableTile key={id} id={id} label={byId(id).label} />)}
          </div>
        </SortableContext>
      </DndContext>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={!disabled}
        submitting={submitting}
        onSubmit={() => submit({ order })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setOrder(shuffleAway(items.map((i) => i.id), directiveId + "r")); retry(); }}
      />
    </InteractiveShell>
  );
}
