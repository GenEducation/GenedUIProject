"use client";

import React, { useRef, useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function CoordinatePlane({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const xr: number[] = render.x_range || [0, 10];
  const yr: number[] = render.y_range || [0, 10];
  const gridStep: number = render.grid_step || 1;
  const maxPoints: number = interaction.max_points || 1;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "place_point";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: number[][] = Array.isArray(studentAnswer?.points) ? studentAnswer.points : [];
  const [points, setPoints] = useState<number[][]>(initial);
  const svgRef = useRef<SVGSVGElement>(null);
  const lock = disabled || submitted;

  const SZ = 220, pad = 14;
  const span = SZ - pad * 2;
  const xCount = (xr[1] - xr[0]) / gridStep;
  const yCount = (yr[1] - yr[0]) / gridStep;
  const px = (gx: number) => pad + ((gx - xr[0]) / (xr[1] - xr[0])) * span;
  const py = (gy: number) => SZ - pad - ((gy - yr[0]) / (yr[1] - yr[0])) * span;

  const onClick = (e: React.MouseEvent) => {
    if (lock || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * SZ;
    const ry = ((e.clientY - rect.top) / rect.height) * SZ;
    const gx = Math.round(((rx - pad) / span) * (xr[1] - xr[0]) + xr[0]);
    const gy = Math.round(((SZ - pad - ry) / span) * (yr[1] - yr[0]) + yr[0]);
    const cx = Math.max(xr[0], Math.min(xr[1], gx));
    const cy = Math.max(yr[0], Math.min(yr[1], gy));
    setPoints((prev) => {
      const next = prev.filter((p) => !(p[0] === cx && p[1] === cy));
      if (next.length === prev.length) {
        if (prev.length >= maxPoints) return maxPoints === 1 ? [[cx, cy]] : prev;
        return [...prev, [cx, cy]];
      }
      return next;
    });
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <svg ref={svgRef} viewBox={`0 0 ${SZ} ${SZ}`} style={{ width: 220, height: 220, cursor: lock ? "default" : "crosshair" }} onClick={onClick} role="group" aria-label="coordinate grid">
        {Array.from({ length: xCount + 1 }).map((_, i) => {
          const gx = xr[0] + i * gridStep;
          return <line key={`v${i}`} x1={px(gx)} y1={py(yr[0])} x2={px(gx)} y2={py(yr[1])} stroke={COLORS.border} strokeWidth={0.5} />;
        })}
        {Array.from({ length: yCount + 1 }).map((_, i) => {
          const gy = yr[0] + i * gridStep;
          return <line key={`h${i}`} x1={px(xr[0])} y1={py(gy)} x2={px(xr[1])} y2={py(gy)} stroke={COLORS.border} strokeWidth={0.5} />;
        })}
        <line x1={px(xr[0])} y1={py(Math.max(0, yr[0]))} x2={px(xr[1])} y2={py(Math.max(0, yr[0]))} stroke="#888780" strokeWidth={1.5} />
        <line x1={px(Math.max(0, xr[0]))} y1={py(yr[0])} x2={px(Math.max(0, xr[0]))} y2={py(yr[1])} stroke="#888780" strokeWidth={1.5} />
        {points.map((p, i) => <circle key={i} cx={px(p[0])} cy={py(p[1])} r={6} fill={COLORS.brand} />)}
      </svg>
      <p style={{ marginTop: 6, fontSize: 13, color: COLORS.muted }}>
        {points.length ? `Points: ${points.map((p) => `(${p[0]}, ${p[1]})`).join(", ")}` : "Tap the grid to plot."}
      </p>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={points.length > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ points })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setPoints([]); retry(); }}
      />
    </InteractiveShell>
  );
}
