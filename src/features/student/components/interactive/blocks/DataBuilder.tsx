"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function DataBuilder({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const categories: string[] = render.categories || ["A", "B", "C"];
  const maxValue: number = render.max_value || 10;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "build";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initValues: Record<string, number> = studentAnswer?.values || Object.fromEntries(categories.map((c) => [c, 0]));
  const [values, setValues] = useState<Record<string, number>>(initValues);
  const lock = disabled || submitted;

  const setVal = (c: string, v: number) => { if (!lock) setValues((p) => ({ ...p, [c]: v })); };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 130, marginBottom: 12 }}>
        {categories.map((c) => (
          <div key={c} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            <span style={{ fontSize: 11, color: COLORS.muted }}>{values[c] || 0}</span>
            <div style={{ width: "100%", maxWidth: 48, height: `${((values[c] || 0) / maxValue) * 100}px`, background: COLORS.brand, borderRadius: "5px 5px 0 0", transition: "height 0.12s" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{c}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categories.map((c) => (
          <label key={c} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: COLORS.muted }}>
            <span style={{ width: 16, fontWeight: 700, color: COLORS.ink }}>{c}</span>
            <input type="range" min={0} max={maxValue} value={values[c] || 0} disabled={lock} onChange={(e) => setVal(c, +e.target.value)} style={{ flex: 1 }} />
          </label>
        ))}
      </div>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={!disabled}
        submitting={submitting}
        onSubmit={() => submit({ values })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setValues(Object.fromEntries(categories.map((c) => [c, 0]))); retry(); }}
      />
    </InteractiveShell>
  );
}
