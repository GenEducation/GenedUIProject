"use client";

import React, { useRef, useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function NumberLine({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const min: number = render.min ?? 0;
  const max: number = render.max ?? 1;
  const step: number = render.tick_step || render.step || 0.25;
  const labels: string[] | undefined = render.ticks;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "place_point";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const steps = Math.max(1, Math.round((max - min) / step));
  const decimals = (String(step).split(".")[1] || "").length;
  const initIdx = typeof studentAnswer?.value === "number" ? Math.round((studentAnswer.value - min) / step) : -1;
  const [idx, setIdx] = useState<number>(initIdx);
  const svgRef = useRef<SVGSVGElement>(null);
  const lock = disabled || submitted;

  const W = 320, pad = 20, span = W - pad * 2;
  const tickX = (i: number) => pad + (i / steps) * span;
  const valueOf = (i: number) => +(min + i * step).toFixed(decimals);

  const setFromClient = (clientX: number) => {
    if (lock || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rel = ((clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(steps, Math.round((rel - pad) / span * steps)));
    setIdx(i);
  };

  const dragging = useRef(false);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} 70`}
        style={{ width: "100%", maxWidth: 340, height: "auto", cursor: lock ? "default" : "pointer", touchAction: "none" }}
        onMouseDown={(e) => { dragging.current = true; setFromClient(e.clientX); }}
        onMouseMove={(e) => { if (dragging.current) setFromClient(e.clientX); }}
        onMouseUp={() => (dragging.current = false)}
        onMouseLeave={() => (dragging.current = false)}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={idx >= 0 ? valueOf(idx) : undefined}
      >
        <line x1={pad} y1={40} x2={W - pad} y2={40} stroke={COLORS.border} strokeWidth={2} />
        {Array.from({ length: steps + 1 }).map((_, i) => (
          <g key={i}>
            <line x1={tickX(i)} y1={33} x2={tickX(i)} y2={47} stroke={COLORS.border} strokeWidth={2} />
            <text x={tickX(i)} y={62} textAnchor="middle" fontSize={11} fill={COLORS.muted}>
              {labels?.[i] ?? valueOf(i)}
            </text>
          </g>
        ))}
        {idx >= 0 && <circle cx={tickX(idx)} cy={40} r={11} fill={COLORS.brand} />}
      </svg>
      <p style={{ marginTop: 6, fontSize: 13, color: COLORS.muted }}>
        {idx >= 0 ? <>Value: <b style={{ color: COLORS.ink }}>{labels?.[idx] ?? valueOf(idx)}</b></> : "Tap the line to place the dot."}
      </p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={idx >= 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ value: valueOf(idx) })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setIdx(-1); retry(); }}
      />
    </InteractiveShell>
  );
}
