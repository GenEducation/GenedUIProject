"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function ExpressionBuilder({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const palette: string[] = render.tile_palette || ["x", "unit"];
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "build";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const parseInit = () => {
    const expr: string = studentAnswer?.expression || "";
    const xm = expr.match(/(\d*)x/);
    const cm = expr.match(/(?:^|\+)(\d+)$/);
    return { x: xm ? (xm[1] ? +xm[1] : 1) : 0, o: cm ? +cm[1] : 0 };
  };
  const init = parseInit();
  const [xs, setXs] = useState<number>(init.x);
  const [os, setOs] = useState<number>(init.o);
  const lock = disabled || submitted;

  const expression = (() => {
    const xpart = xs ? (xs === 1 ? "x" : `${xs}x`) : "";
    const opart = os ? `${os}` : "";
    if (xpart && opart) return `${xpart}+${opart}`;
    return xpart || opart || "0";
  })();

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {palette.includes("x") && <button onClick={() => !lock && setXs(xs + 1)} disabled={lock} style={tileBtn(lock, "#534AB7")}>+ x</button>}
        {palette.includes("unit") && <button onClick={() => !lock && setOs(os + 1)} disabled={lock} style={tileBtn(lock, "#1D9E75")}>+ 1</button>}
        <button onClick={() => { if (lock) return; setXs(0); setOs(0); }} disabled={lock} style={tileBtn(lock, COLORS.muted)}><RefreshCw size={13} /></button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 42, alignItems: "center" }}>
        {Array.from({ length: xs }).map((_, i) => <span key={`x${i}`} style={tile("#534AB7")}>x</span>)}
        {Array.from({ length: os }).map((_, i) => <span key={`o${i}`} style={tile("#1D9E75")}>1</span>)}
      </div>
      <p style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: COLORS.ink }}>Expression: {expression}</p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={(xs > 0 || os > 0) && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ expression })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setXs(0); setOs(0); retry(); }}
      />
    </InteractiveShell>
  );
}

const tileBtn = (lock: boolean | undefined, _c: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 700, padding: "8px 14px",
  borderRadius: 12, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink,
  cursor: lock ? "default" : "pointer", fontFamily: "var(--font-body)",
});
const tile = (bg: string): React.CSSProperties => ({
  background: bg, color: "#FFFFFF", padding: "8px 14px", borderRadius: 8, fontSize: 15, fontWeight: 700,
});
