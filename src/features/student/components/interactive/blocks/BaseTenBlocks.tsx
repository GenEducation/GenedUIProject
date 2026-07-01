"use client";

import React, { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function BaseTenBlocks({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const available: string[] = render.available || ["hundred", "ten", "one"];
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "build";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const [h, setH] = useState<number>(studentAnswer?.hundreds ?? 0);
  const [t, setT] = useState<number>(studentAnswer?.tens ?? 0);
  const [o, setO] = useState<number>(studentAnswer?.ones ?? 0);
  const lock = disabled || submitted;
  const total = h * 100 + t * 10 + o;

  const Col = ({ label, count, color, w, hgt, onAdd, show }: { label: string; count: number; color: string; w: number; hgt: number; onAdd: () => void; show: boolean }) => {
    if (!show) return null;
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", maxWidth: 100, justifyContent: "center", minHeight: 62, alignItems: "flex-end" }}>
          {Array.from({ length: count }).map((_, i) => <div key={i} style={{ width: w, height: hgt, background: color, borderRadius: 2 }} />)}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.muted }}>{label}</p>
      </div>
    );
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {available.includes("hundred") && <button onClick={() => !lock && setH(h + 1)} disabled={lock} style={btn(lock)}><Plus size={13} /> hundred</button>}
        {available.includes("ten") && <button onClick={() => !lock && setT(t + 1)} disabled={lock} style={btn(lock)}><Plus size={13} /> ten</button>}
        {available.includes("one") && <button onClick={() => !lock && setO(o + 1)} disabled={lock} style={btn(lock)}><Plus size={13} /> one</button>}
        <button onClick={() => { if (lock) return; setH(0); setT(0); setO(0); }} disabled={lock} style={btn(lock)}><RefreshCw size={13} /></button>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
        <Col label="100s" count={h} color="#534AB7" w={20} hgt={60} onAdd={() => setH(h + 1)} show={available.includes("hundred")} />
        <Col label="10s" count={t} color="#1D9E75" w={8} hgt={60} onAdd={() => setT(t + 1)} show={available.includes("ten")} />
        <Col label="1s" count={o} color="#D85A30" w={11} hgt={11} onAdd={() => setO(o + 1)} show={available.includes("one")} />
      </div>
      <p style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: COLORS.ink }}>Total: {total}</p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={total > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ hundreds: h, tens: t, ones: o })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setH(0); setT(0); setO(0); retry(); }}
      />
    </InteractiveShell>
  );
}

const btn = (lock?: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, padding: "7px 12px",
  borderRadius: 12, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink,
  cursor: lock ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
});
