"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function FractionBar({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const ref = render.reference_bar || { segments: 2, shaded: [0] };
  const ans = render.answer_bar || { segments: 6, shaded: [] };
  const fill: string = render.fill_color || COLORS.success;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: number[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : (ans.shaded || []);
  const [selected, setSelected] = useState<number[]>(initial);
  const lock = disabled || submitted;

  const Bar = ({ segments, shaded, clickable }: { segments: number; shaded: number[]; clickable?: boolean }) => (
    <div style={{ display: "flex", gap: 3, maxWidth: 360 }}>
      {Array.from({ length: segments }).map((_, i) => {
        const on = shaded.includes(i);
        return (
          <div
            key={i}
            onClick={() => {
              if (!clickable || lock) return;
              setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
            }}
            style={{
              flex: 1, height: 34, borderRadius: 6,
              background: on ? fill : "#FFFFFF",
              border: `1px solid ${on ? fill : COLORS.border}`,
              cursor: clickable && !lock ? "pointer" : "default", transition: "all 0.15s",
            }}
          />
        );
      })}
    </div>
  );

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.muted }}>Reference</p>
      <Bar segments={ref.segments} shaded={ref.shaded || []} />
      <p style={{ margin: "12px 0 4px", fontSize: 12, color: COLORS.muted }}>Your bar</p>
      <Bar segments={ans.segments} shaded={selected} clickable />
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
