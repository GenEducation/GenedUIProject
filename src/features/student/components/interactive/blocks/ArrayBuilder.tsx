"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function ArrayBuilder({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const maxRows: number = render.max_rows || 6;
  const maxCols: number = render.max_cols || 6;
  const dot: string = render.dot_color || "#D85A30";
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "build";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const [rows, setRows] = useState<number>(studentAnswer?.rows ?? 1);
  const [cols, setCols] = useState<number>(studentAnswer?.cols ?? 1);
  const lock = disabled || submitted;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 150 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: COLORS.muted }}>
            <span style={{ width: 40 }}>rows</span>
            <input type="range" min={1} max={maxRows} value={rows} disabled={lock} onChange={(e) => setRows(+e.target.value)} style={{ flex: 1 }} />
            <span style={{ width: 14, color: COLORS.ink }}>{rows}</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.muted }}>
            <span style={{ width: 40 }}>cols</span>
            <input type="range" min={1} max={maxCols} value={cols} disabled={lock} onChange={(e) => setCols(+e.target.value)} style={{ flex: 1 }} />
            <span style={{ width: 14, color: COLORS.ink }}>{cols}</span>
          </label>
        </div>
        <svg viewBox="0 0 160 160" style={{ width: 130, height: 130 }} role="img" aria-label={`${rows} by ${cols} array`}>
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const gap = 160 / Math.max(maxRows, maxCols);
              return <circle key={`${r}-${c}`} cx={gap * c + gap / 2} cy={gap * r + gap / 2} r={Math.min(9, gap / 2.6)} fill={dot} />;
            })
          )}
        </svg>
      </div>
      <p style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: COLORS.ink }}>{rows} × {cols} = {rows * cols}</p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={!disabled}
        submitting={submitting}
        onSubmit={() => submit({ rows, cols })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setRows(1); setCols(1); retry(); }}
      />
    </InteractiveShell>
  );
}
