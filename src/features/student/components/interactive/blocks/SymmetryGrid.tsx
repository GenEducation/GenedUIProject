"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function SymmetryGrid({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const rows: number = render.rows || 6;
  const cols: number = render.cols || 6;
  const axis: string = render.axis || "vertical";
  const given: number[] = render.given_cells || [];
  const fill: string = render.fill_color || "#993556";
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: number[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : [];
  const [selected, setSelected] = useState<number[]>(initial);
  const lock = disabled || submitted;

  const toggle = (i: number) => {
    if (lock || given.includes(i)) return;
    setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const axisCol = Math.floor(cols / 2);
  const axisRow = Math.floor(rows / 2);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 30px)`, gap: 2, width: "max-content" }}>
        {Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          const isGiven = given.includes(i);
          const on = isGiven || selected.includes(i);
          const borderAccent =
            axis === "vertical" && c === axisCol ? { borderLeft: `2px solid ${fill}` }
              : axis === "horizontal" && r === axisRow ? { borderTop: `2px solid ${fill}` }
                : {};
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              aria-pressed={on}
              disabled={lock || isGiven}
              style={{
                width: 30, height: 30, borderRadius: 4, padding: 0,
                border: `1px solid ${on ? fill : COLORS.border}`,
                background: on ? fill : "#FFFFFF",
                cursor: lock || isGiven ? "default" : "pointer", transition: "all 0.12s",
                ...borderAccent,
              }}
            />
          );
        })}
      </div>
      <p style={{ marginTop: 8, fontSize: 12, color: COLORS.muted }}>Mirror the shaded cells across the line.</p>
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
