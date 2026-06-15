"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function AreaModel({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const rows: number = render.rows || 6;
  const cols: number = render.cols || 6;
  const fill: string = render.fill_color || "#0F6E56";
  const unit: string = render.unit || "square unit";
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: number[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : [];
  const [selected, setSelected] = useState<number[]>(initial);
  const lock = disabled || submitted;

  const toggle = (i: number) => {
    if (lock) return;
    setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 30px)`, gap: 2, width: "max-content" }}>
        {Array.from({ length: rows * cols }).map((_, i) => {
          const on = selected.includes(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              aria-pressed={on}
              disabled={lock}
              style={{
                width: 30, height: 30, borderRadius: 4, padding: 0,
                border: `1px solid ${on ? fill : COLORS.border}`,
                background: on ? fill : "#FFFFFF", cursor: lock ? "default" : "pointer", transition: "all 0.12s",
              }}
            />
          );
        })}
      </div>
      <p style={{ marginTop: 8, fontSize: 12, color: COLORS.muted }}>{selected.length} {unit}{selected.length === 1 ? "" : "s"} shaded</p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={selected.length > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ selected: [...selected].sort((a, b) => a - b) })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setSelected([]); retry(); }}
      />
    </InteractiveShell>
  );
}
