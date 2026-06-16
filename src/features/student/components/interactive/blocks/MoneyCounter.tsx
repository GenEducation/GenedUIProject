"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

const SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

export default function MoneyCounter({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const sym = SYMBOLS[render.currency] || render.currency_symbol || "₹";
  const denoms: number[] = render.denominations || [1, 2, 5, 10, 20];
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "build";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const [picks, setPicks] = useState<number[]>(Array.isArray(studentAnswer?.coins) ? studentAnswer.coins : []);
  const lock = disabled || submitted;
  const total = picks.reduce((s, v) => s + v, 0);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {denoms.map((d) => (
          <button key={d} onClick={() => !lock && setPicks([...picks, d])} disabled={lock}
            style={{ fontSize: 14, fontWeight: 700, padding: "8px 14px", borderRadius: 12, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink, cursor: lock ? "default" : "pointer" }}>
            {sym}{d}
          </button>
        ))}
        <button onClick={() => !lock && setPicks([])} disabled={lock} style={{ padding: "8px 12px", borderRadius: 12, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink, cursor: lock ? "default" : "pointer" }}><RefreshCw size={13} /></button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 30 }}>
        {picks.map((v, i) => (
          <span key={i} style={{ background: v >= 10 ? "#1D9E75" : COLORS.brand, color: "#FFFFFF", padding: "6px 11px", borderRadius: v >= 5 ? 6 : 20, fontSize: 13, fontWeight: 600 }}>{sym}{v}</span>
        ))}
      </div>
      <p style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: COLORS.ink }}>Total: {sym}{total}</p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={total > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ amount: total, coins: picks })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setPicks([]); retry(); }}
      />
    </InteractiveShell>
  );
}
