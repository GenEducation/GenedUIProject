"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function Clock({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "place_point";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const [hour, setHour] = useState<number>(studentAnswer?.hour ?? render.initial_hour ?? 12);
  const [minute, setMinute] = useState<number>(studentAnswer?.minute ?? render.initial_minute ?? 0);
  const lock = disabled || submitted;

  const cx = 80, cy = 80;
  const ma = (minute * 6 * Math.PI) / 180;
  const ha = (((hour % 12) + minute / 60) * 30 * Math.PI) / 180;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <svg viewBox="0 0 160 160" style={{ width: 150, height: 150 }} role="img" aria-label={`clock at ${hour}:${String(minute).padStart(2, "0")}`}>
          <circle cx={cx} cy={cy} r={74} fill="#FFFFFF" stroke={COLORS.border} strokeWidth={2} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return <line key={i} x1={cx + 62 * Math.sin(a)} y1={cy - 62 * Math.cos(a)} x2={cx + 70 * Math.sin(a)} y2={cy - 70 * Math.cos(a)} stroke={COLORS.border} strokeWidth={2} />;
          })}
          <line x1={cx} y1={cy} x2={cx + 38 * Math.sin(ha)} y2={cy - 38 * Math.cos(ha)} stroke="#26215C" strokeWidth={5} strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={cx + 58 * Math.sin(ma)} y2={cy - 58 * Math.cos(ma)} stroke={COLORS.brand} strokeWidth={3} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={4} fill="#26215C" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 160 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.muted }}>
            <span style={{ width: 42 }}>hour</span>
            <input type="range" min={1} max={12} value={hour} disabled={lock} onChange={(e) => setHour(+e.target.value)} style={{ flex: 1 }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.muted }}>
            <span style={{ width: 42 }}>min</span>
            <input type="range" min={0} max={55} step={5} value={minute} disabled={lock} onChange={(e) => setMinute(+e.target.value)} style={{ flex: 1 }} />
          </label>
          <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: 0 }}>{hour}:{String(minute).padStart(2, "0")}</p>
        </div>
      </div>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={!disabled}
        submitting={submitting}
        onSubmit={() => submit({ hour, minute })}
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
