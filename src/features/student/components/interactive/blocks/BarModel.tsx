"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function BarModel({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const whole: number = render.whole ?? 100;
  const ticks: number = render.unit_ticks || 8;
  const fill: string = render.fill_color || COLORS.brand;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "place_point";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initUnits = typeof studentAnswer?.value === "number" ? Math.round((studentAnswer.value / whole) * ticks) : 0;
  const [units, setUnits] = useState<number>(initUnits);
  const lock = disabled || submitted;
  const value = +((units / ticks) * whole).toFixed(2);
  const pct = Math.round((units / ticks) * 100);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ position: "relative", height: 44, maxWidth: 360, borderRadius: 8, background: "#FFFFFF", border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(units / ticks) * 100}%`, background: fill, transition: "width 0.12s" }} />
      </div>
      <input
        type="range" min={0} max={ticks} step={1} value={units} disabled={lock}
        onChange={(e) => setUnits(+e.target.value)}
        style={{ width: 360, maxWidth: "100%", marginTop: 10 }}
        aria-label="bar amount"
      />
      <p style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
        {pct}% of {whole} = {Number.isInteger(value) ? value : value.toFixed(2)}
      </p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={units > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ value })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setUnits(0); retry(); }}
      />
    </InteractiveShell>
  );
}
