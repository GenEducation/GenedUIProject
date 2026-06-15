"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

interface Option { id: string; label: string }

// Representative net glyphs (the choice of solid is what gets graded).
const NETS: Record<string, React.ReactNode> = {
  cube_cross: (
    <g fill="#7F77DD" stroke="#3C3489" strokeWidth={1.5}>
      <rect x={44} y={4} width={32} height={32} /><rect x={44} y={36} width={32} height={32} />
      <rect x={12} y={36} width={32} height={32} /><rect x={76} y={36} width={32} height={32} />
      <rect x={44} y={68} width={32} height={32} /><rect x={44} y={100} width={32} height={16} />
    </g>
  ),
};

export default function NetFolding({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const netId: string = render.net || "net";
  const options: Option[] = render.options || [];
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "match";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: string | null = Array.isArray(studentAnswer?.pairs) && studentAnswer.pairs[0] ? studentAnswer.pairs[0][1] : null;
  const [choice, setChoice] = useState<string | null>(initial);
  const lock = disabled || submitted;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <svg viewBox="0 0 120 120" style={{ width: 110, height: 110 }} role="img" aria-label="net">
          {NETS[netId] || NETS.cube_cross}
        </svg>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {options.map((o) => {
            const on = choice === o.id;
            return (
              <button
                key={o.id}
                onClick={() => !lock && setChoice(o.id)}
                disabled={lock}
                style={{
                  fontSize: 14, fontWeight: 600, padding: "9px 16px", borderRadius: 12,
                  border: `1px solid ${on ? COLORS.brand : COLORS.border}`,
                  background: on ? COLORS.brandSoft : "#FFFFFF", color: COLORS.ink,
                  cursor: lock ? "default" : "pointer",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={!!choice && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ pairs: [[netId, choice]] })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setChoice(null); retry(); }}
      />
    </InteractiveShell>
  );
}
