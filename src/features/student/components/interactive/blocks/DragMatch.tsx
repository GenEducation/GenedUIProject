"use client";

import React, { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter, Katex } from "../shared";

interface Item { id: string; label: string }
const Lbl = ({ s }: { s: string }) => (/\\/.test(s) ? <Katex tex={s} /> : <span>{s}</span>);

function Chip({ id, label }: Item) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", borderRadius: 12,
        background: "#FFFFFF", border: `1px solid ${isDragging ? COLORS.brand : COLORS.border}`,
        cursor: "grab", fontSize: 14, fontWeight: 600, color: COLORS.ink, fontFamily: "'DM Sans', sans-serif",
        boxShadow: isDragging ? "0 6px 16px rgba(91,77,199,0.2)" : "none", touchAction: "none",
      }}
    >
      <GripVertical size={13} color={COLORS.muted} />
      <Lbl s={label} />
    </div>
  );
}

function Zone({ id, label, placed, color, onRemove }: { id: string; label: string; placed?: Item; color: string; onRemove: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink, minWidth: 70 }}><Lbl s={label} /></div>
      <div
        ref={setNodeRef}
        onClick={placed ? onRemove : undefined}
        style={{
          flex: 1, minHeight: 40, borderRadius: 12, display: "flex", alignItems: "center", padding: "0 10px",
          border: `1.5px dashed ${isOver ? COLORS.brand : COLORS.border}`,
          background: placed ? color : isOver ? COLORS.brandSoft : "#FFFFFF",
          color: placed ? "#FFFFFF" : COLORS.muted, fontSize: 13, fontWeight: 600, cursor: placed ? "pointer" : "default",
        }}
      >
        {placed ? <Lbl s={placed.label} /> : "drop here"}
      </div>
    </div>
  );
}

export default function DragMatch({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const left: Item[] = render.left || [];
  const right: Item[] = render.right || [];
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "match";
  const colors = ["#534AB7", "#1D9E75", "#D85A30", "#993556", "#185FA5"];

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: Record<string, string> = {};
  if (Array.isArray(studentAnswer?.pairs)) studentAnswer.pairs.forEach((p: string[]) => { initial[p[1]] = p[0]; });
  const [byRight, setByRight] = useState<Record<string, string>>(initial); // rightId -> leftId
  const lock = disabled || submitted;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor));

  const placedLefts = new Set(Object.values(byRight));

  const onDragEnd = (e: DragEndEvent) => {
    if (lock || !e.over) return;
    const leftId = String(e.active.id);
    const rightId = String(e.over.id);
    setByRight((prev) => {
      const next: Record<string, string> = {};
      for (const [r, l] of Object.entries(prev)) if (l !== leftId && r !== rightId) next[r] = l;
      next[rightId] = leftId;
      return next;
    });
  };

  const pairs = Object.entries(byRight).map(([r, l]) => [l, r]);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {left.filter((l) => !placedLefts.has(l.id)).map((l) => <Chip key={l.id} id={l.id} label={l.label} />)}
            {left.every((l) => placedLefts.has(l.id)) && <span style={{ fontSize: 12, color: COLORS.muted }}>All placed</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {right.map((r, i) => {
              const leftId = byRight[r.id];
              const placed = left.find((l) => l.id === leftId);
              return (
                <Zone key={r.id} id={r.id} label={r.label} placed={placed} color={colors[i % colors.length]}
                  onRemove={() => { if (lock) return; setByRight((prev) => { const n = { ...prev }; delete n[r.id]; return n; }); }} />
              );
            })}
          </div>
        </div>
      </DndContext>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={pairs.length > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ pairs })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setByRight({}); retry(); }}
      />
    </InteractiveShell>
  );
}
