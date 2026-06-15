"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

interface Datum { id: string; label: string; value: number }

export default function Chart({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const data: Datum[] = render.data || [];
  const fill: string = render.fill_color || "#85B7EB";
  const max: number = interaction.max_selections || 1;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: string[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : [];
  const [selected, setSelected] = useState<string[]>(initial);
  const lock = disabled || submitted;
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  const toggle = (id: string) => {
    if (lock) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= max) return max === 1 ? [id] : prev;
      return [...prev, id];
    });
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 140, padding: "0 6px" }}>
        {data.map((d) => {
          const on = selected.includes(d.id);
          return (
            <div
              key={d.id}
              onClick={() => toggle(d.id)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, cursor: lock ? "default" : "pointer" }}
            >
              <span style={{ fontSize: 11, color: COLORS.muted }}>{d.value}</span>
              <div style={{ width: "100%", maxWidth: 60, height: `${(d.value / maxVal) * 100}px`, background: on ? COLORS.brand : fill, borderRadius: "6px 6px 0 0", transition: "all 0.15s" }} />
              <span style={{ fontSize: 12, color: COLORS.ink, fontWeight: 600 }}>{d.label}</span>
            </div>
          );
        })}
      </div>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={selected.length > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ selected })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setSelected([]); retry(); }}
      />
    </InteractiveShell>
  );
}
