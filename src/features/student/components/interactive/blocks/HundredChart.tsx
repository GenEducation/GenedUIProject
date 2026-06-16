"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function HundredChart({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const start: number = render.start ?? 1;
  const end: number = render.end ?? 100;
  const columns: number = render.columns || 10;
  const fill: string = render.fill_color || "#378ADD";
  const max: number | undefined = interaction.max_selections;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: number[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : [];
  const [selected, setSelected] = useState<number[]>(initial);
  const lock = disabled || submitted;

  const nums: number[] = [];
  for (let n = start; n <= end; n++) nums.push(n);

  const toggle = (n: number) => {
    if (lock) return;
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (max && prev.length >= max) return prev;
      return [...prev, n];
    });
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 3, maxWidth: 380 }}>
        {nums.map((n) => {
          const on = selected.includes(n);
          return (
            <button
              key={n}
              onClick={() => toggle(n)}
              aria-pressed={on}
              disabled={lock}
              style={{
                aspectRatio: "1", fontSize: 11, borderRadius: 6, padding: 0,
                border: `1px solid ${on ? fill : COLORS.border}`,
                background: on ? fill : "#FFFFFF", color: on ? "#FFFFFF" : COLORS.ink,
                cursor: lock ? "default" : "pointer", transition: "all 0.12s",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p style={{ marginTop: 8, fontSize: 12, color: COLORS.muted }}>{selected.length} selected</p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={selected.length > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ selected: [...selected].sort((a, b) => a - b) })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setSelected([]); retry(); }}
      />
    </InteractiveShell>
  );
}
