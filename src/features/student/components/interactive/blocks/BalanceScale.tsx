"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

interface Tile { type: string; count?: number }
const sumUnits = (pan: Tile[]) => pan.filter((t) => t.type === "unit").reduce((s, t) => s + (t.count || 1), 0);

export default function BalanceScale({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const leftPan: Tile[] = render.left_pan || [{ type: "x" }, { type: "unit", count: 2 }];
  const rightPan: Tile[] = render.right_pan || [{ type: "unit", count: 5 }];
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "build";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const [x, setX] = useState<number>(studentAnswer?.solve_x ?? 0);
  const lock = disabled || submitted;

  const leftUnits = sumUnits(leftPan);
  const rightUnits = sumUnits(rightPan);
  const leftTotal = x + leftUnits;
  const diff = rightUnits - leftTotal;
  const tilt = Math.max(-12, Math.min(12, diff * 4));
  const balanced = diff === 0;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <svg viewBox="0 0 320 150" style={{ width: "100%", maxWidth: 340, height: "auto" }} role="img" aria-label="balance scale">
        <line x1={160} y1={20} x2={160} y2={120} stroke={COLORS.border} strokeWidth={3} />
        <line x1={60} y1={70 + tilt} x2={260} y2={70 - tilt} stroke="#888780" strokeWidth={3} />
        <rect x={30} y={70 + tilt} width={80} height={6} rx={3} fill={COLORS.border} />
        <rect x={210} y={70 - tilt} width={80} height={6} rx={3} fill={COLORS.border} />
        <rect x={120} y={118} width={80} height={8} rx={3} fill="#888780" />
        <text x={70} y={62 + tilt} fontSize={12} fill={COLORS.ink} textAnchor="middle" fontWeight={600}>x + {leftUnits}</text>
        <text x={250} y={62 - tilt} fontSize={12} fill={COLORS.ink} textAnchor="middle" fontWeight={600}>{rightUnits}</text>
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <button onClick={() => !lock && setX(Math.max(0, x - 1))} disabled={lock} style={step(lock)}><Minus size={14} /></button>
        <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.brand, minWidth: 60, textAlign: "center" }}>x = {x}</span>
        <button onClick={() => !lock && setX(x + 1)} disabled={lock} style={step(lock)}><Plus size={14} /></button>
        <span style={{ fontSize: 13, color: balanced ? COLORS.success : COLORS.muted, fontWeight: 600 }}>{balanced ? "balanced" : "not balanced"}</span>
      </div>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={!disabled}
        submitting={submitting}
        onSubmit={() => submit({ solve_x: x })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setX(0); retry(); }}
      />
    </InteractiveShell>
  );
}

const step = (lock?: boolean): React.CSSProperties => ({
  width: 36, height: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "#FFFFFF",
  display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.ink, cursor: lock ? "default" : "pointer",
});
