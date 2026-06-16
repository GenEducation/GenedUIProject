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

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initialOrder: string[] = Array.isArray(studentAnswer?.order) ? studentAnswer.order : items.map((i) => i.id);
  const [order, setOrder] = useState<string[]>(initialOrder);
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
        onRetry={() => { setOrder(items.map((i) => i.id)); retry(); }}
      />
    </InteractiveShell>
  );
}
