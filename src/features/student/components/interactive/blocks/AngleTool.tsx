"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function AngleTool({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const snap: number = render.snap_step || interaction.snap || 5;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "place_point";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const [deg, setDeg] = useState<number>(studentAnswer?.degrees ?? render.base_ray_deg ?? 30);
  const lock = disabled || submitted;

  const ox = 20, oy = 90, r = 80;
  const rad = (deg * Math.PI) / 180;
  const x2 = ox + r * Math.cos(-rad), y2 = oy + r * Math.sin(-rad);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <svg viewBox="0 0 140 110" style={{ width: 150, height: 120 }} role="img" aria-label={`angle ${deg} degrees`}>
          <line x1={ox} y1={oy} x2={ox + r} y2={oy} stroke="#888780" strokeWidth={3} />
          <line x1={ox} y1={oy} x2={x2} y2={y2} stroke={COLORS.brand} strokeWidth={3} />
          <path d={`M${ox + 28} ${oy} A28 28 0 0 0 ${ox + 28 * Math.cos(-rad)} ${oy + 28 * Math.sin(-rad)}`} fill="none" stroke="#D85A30" strokeWidth={2} />
        </svg>
        <div style={{ flex: 1, minWidth: 150 }}>
          <input type="range" min={0} max={180} step={snap} value={deg} disabled={lock} onChange={(e) => setDeg(+e.target.value)} style={{ width: "100%" }} aria-label="angle degrees" />
          <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, marginTop: 6 }}>{deg}°</p>
        </div>
      </div>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={!disabled}
        submitting={submitting}
        onSubmit={() => submit({ degrees: deg })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => retry()}
      />
    </InteractiveShell>
  );
}
