"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function ShapePartition({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const shape: string = render.shape || "circle";
  const allowed: number[] = render.allowed_parts || [2, 3, 4, 6, 8];
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "build";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const [parts, setParts] = useState<number>(studentAnswer?.parts ?? 1);
  const lock = disabled || submitted;

  const circle = () => {
    const cx = 60, cy = 60, r = 52;
    return Array.from({ length: parts }).map((_, i) => {
      const a1 = (i / parts) * 2 * Math.PI - Math.PI / 2;
      const a2 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const large = a2 - a1 > Math.PI ? 1 : 0;
      return <path key={i} d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={i % 2 ? "#CECBF6" : "#EEEDFE"} stroke={COLORS.brand} strokeWidth={1.5} />;
    });
  };

  const rect = () => Array.from({ length: parts }).map((_, i) => (
    <rect key={i} x={8 + (i * 104) / parts} y={30} width={104 / parts} height={60} fill={i % 2 ? "#CECBF6" : "#EEEDFE"} stroke={COLORS.brand} strokeWidth={1.5} />
  ));

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <svg viewBox="0 0 120 120" style={{ width: 120, height: 120 }} role="img" aria-label={`${parts} parts`}>
          {shape === "rectangle" ? rect() : circle()}
        </svg>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {allowed.map((n) => (
            <button key={n} onClick={() => !lock && setParts(n)} disabled={lock}
              style={{
                fontSize: 14, fontWeight: 700, padding: "8px 14px", borderRadius: 12,
                border: `1px solid ${parts === n ? COLORS.brand : COLORS.border}`,
                background: parts === n ? COLORS.brandSoft : "#FFFFFF", color: COLORS.ink,
                cursor: lock ? "default" : "pointer",
              }}>{n}</button>
          ))}
        </div>
      </div>
      <p style={{ marginTop: 8, fontSize: 13, color: COLORS.muted }}>Parts: {parts}</p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={parts > 1 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ parts })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setParts(1); retry(); }}
      />
    </InteractiveShell>
  );
}
