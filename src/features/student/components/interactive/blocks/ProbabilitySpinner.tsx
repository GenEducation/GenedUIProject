"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

interface Sector { id: string; label: string; weight: number; color?: string }
const PALETTE = ["#E24B4A", "#185FA5", "#1D9E75", "#EF9F27", "#7F77DD", "#D4537E"];

export default function ProbabilitySpinner({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const sectors: Sector[] = render.sectors || [];
  const max: number = interaction.max_selections || 1;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: string[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : [];
  const [selected, setSelected] = useState<string[]>(initial);
  const lock = disabled || submitted;

  const total = sectors.reduce((s, x) => s + (x.weight || 1), 0) || 1;
  const cx = 60, cy = 60, r = 54;
  let acc = 0;

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
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <svg viewBox="0 0 120 120" style={{ width: 120, height: 120 }} role="img" aria-label="spinner">
          {sectors.map((s, i) => {
            const frac = (s.weight || 1) / total;
            const a1 = acc * 2 * Math.PI - Math.PI / 2;
            acc += frac;
            const a2 = acc * 2 * Math.PI - Math.PI / 2;
            const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
            const large = a2 - a1 > Math.PI ? 1 : 0;
            return <path key={s.id} d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={s.color || PALETTE[i % PALETTE.length]} stroke="#FFF" strokeWidth={1} />;
          })}
          <circle cx={cx} cy={cy} r={5} fill="#2C2C2A" />
        </svg>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {sectors.map((s, i) => {
            const on = selected.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                disabled={lock}
                style={{
                  fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 12,
                  border: `1px solid ${on ? COLORS.brand : COLORS.border}`,
                  background: on ? COLORS.brandSoft : "#FFFFFF", color: COLORS.ink,
                  cursor: lock ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color || PALETTE[i % PALETTE.length] }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={selected.length > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ selected })}
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
