"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { Question } from "../../types/test";

interface MatchTheFollowingQuestionProps {
  question: Question;
  selections: Record<number, string>;
  onSelectionChange: (selections: Record<number, string>) => void;
  disabled?: boolean;
}

function DraggableOption({
  id,
  label,
  text,
  isPlaced,
}: {
  id: string;
  label: string;
  text: string;
  isPlaced: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  if (isPlaced) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 bg-white cursor-grab active:cursor-grabbing transition-all select-none ${
        isDragging
          ? "border-[#042E5C] shadow-lg scale-105 opacity-80"
          : "border-[#042E5C]/15 hover:border-[#042E5C]/30 shadow-sm"
      }`}
    >
      <GripVertical size={14} className="text-[#042E5C]/30 shrink-0" />
      <span className="text-[13px] font-bold text-[#042E5C]/50 shrink-0">{label}.</span>
      <span className="text-[14px] font-medium text-[#042E5C]">{text}</span>
    </div>
  );
}

function DropZone({
  id,
  placedItem,
  onRemove,
  disabled,
}: {
  id: string;
  placedItem: { label: string; text: string } | null;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[48px] rounded-xl border-2 border-dashed transition-all flex items-center px-4 ${
        placedItem
          ? "border-emerald-300 bg-emerald-50/50"
          : isOver
          ? "border-[#042E5C] bg-[#042E5C]/5"
          : "border-[#042E5C]/15 bg-slate-50/50"
      }`}
    >
      {placedItem ? (
        <div className="flex items-center justify-between w-full py-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-emerald-600">{placedItem.label}.</span>
            <span className="text-[14px] font-medium text-[#042E5C]">{placedItem.text}</span>
          </div>
          {!disabled && (
            <button
              onClick={onRemove}
              className="text-[11px] font-bold text-[#042E5C]/40 hover:text-red-500 transition-colors uppercase tracking-wider"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <span className="text-[13px] text-[#042E5C]/30 italic">Drop here</span>
      )}
    </div>
  );
}

export function MatchTheFollowingQuestion({
  question,
  selections,
  onSelectionChange,
  disabled,
}: MatchTheFollowingQuestionProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const { leftItems, rightItems, labelMap } = useMemo(() => {
    if (!question.match_pairs) return { leftItems: [], rightItems: [], labelMap: {} };

    const left = question.match_pairs.map((p, i) => ({ id: i + 1, text: p.left }));
    const shuffled = [...question.match_pairs.map((p) => p.right)].sort(
      () => Math.random() - 0.5
    );
    const right = shuffled.map((text, i) => ({
      label: String.fromCharCode(65 + i),
      text,
    }));
    const lMap = Object.fromEntries(right.map((r) => [r.text, r.label]));

    return { leftItems: left, rightItems: right, labelMap: lMap };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.question_id]);

  const placedLabels = new Set(Object.values(selections));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const draggedLabel = (active.id as string).replace("drag-", "");
    const dropIdx = parseInt((over.id as string).replace("drop-", ""), 10);
    if (isNaN(dropIdx)) return;

    const updated = { ...selections };
    for (const [key, val] of Object.entries(updated)) {
      if (val === draggedLabel) delete updated[Number(key)];
    }
    updated[dropIdx] = draggedLabel;
    onSelectionChange(updated);
  }

  const activeItem = activeId
    ? rightItems.find((r) => `drag-${r.label}` === activeId)
    : null;

  if (!question.match_pairs) return null;

  return (
    <div className="space-y-5">
      <p className="text-[17px] font-medium text-[#042E5C] leading-relaxed">
        {question.prompt}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3">
          {leftItems.map((left) => {
            const placedLabel = selections[left.id];
            const placedRight = placedLabel
              ? rightItems.find((r) => r.label === placedLabel) ?? null
              : null;

            return (
              <div key={left.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#042E5C]/5 flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-black text-[#042E5C]">{left.id}</span>
                </div>
                <div className="flex-1 py-2 px-3 rounded-xl bg-white border border-[#042E5C]/10">
                  <span className="text-[14px] font-medium text-[#042E5C]">{left.text}</span>
                </div>
                <span className="text-[#042E5C]/20 font-bold shrink-0">&rarr;</span>
                <div className="flex-1">
                  <DropZone
                    id={`drop-${left.id}`}
                    placedItem={placedRight}
                    onRemove={() => {
                      const updated = { ...selections };
                      delete updated[left.id];
                      onSelectionChange(updated);
                    }}
                    disabled={!!disabled}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4">
          <span className="text-[11px] font-black text-[#042E5C]/40 uppercase tracking-widest block mb-3">
            Drag options to match
          </span>
          <div className="flex flex-wrap gap-2">
            {rightItems.map((right) => (
              <DraggableOption
                key={right.label}
                id={`drag-${right.label}`}
                label={right.label}
                text={right.text}
                isPlaced={placedLabels.has(right.label)}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-[#042E5C] bg-white shadow-xl cursor-grabbing">
              <GripVertical size={14} className="text-[#042E5C]/30" />
              <span className="text-[13px] font-bold text-[#042E5C]/50">{activeItem.label}.</span>
              <span className="text-[14px] font-medium text-[#042E5C]">{activeItem.text}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
