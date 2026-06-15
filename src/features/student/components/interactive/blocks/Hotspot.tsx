"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

interface Region { id: string; shape: "circle" | "rect" | "poly"; coords: number[] }

export default function Hotspot({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const regions: Region[] = render.regions || [];
  const max: number = interaction.max_selections || 1;
  const vb: string = render.viewbox || `0 0 ${render.image_width || 320} ${render.image_height || 200}`;
  const imgUrl: string | undefined = render.image_url
    ? (render.image_url.startsWith("http") ? render.image_url : `${API_BASE_URL}${render.image_url}`)
    : undefined;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const { submitted, isCorrect, attempts, submitting, submit, retry, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: string[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : [];
  const [selected, setSelected] = useState<string[]>(initial);
  const lock = disabled || submitted;

  const toggle = (id: string) => {
    if (lock) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= max) return max === 1 ? [id] : prev;
      return [...prev, id];
    });
  };

  const shapeEl = (rg: Region) => {
    const on = selected.includes(rg.id);
    const common = {
      fill: on ? `${COLORS.brand}55` : "transparent",
      stroke: on ? COLORS.brand : "#88888880",
      strokeWidth: 2,
      style: { cursor: lock ? "default" : "pointer" },
      onClick: () => toggle(rg.id),
    };
    if (rg.shape === "circle") return <circle cx={rg.coords[0]} cy={rg.coords[1]} r={rg.coords[2]} {...common} />;
    if (rg.shape === "rect") return <rect x={rg.coords[0]} y={rg.coords[1]} width={rg.coords[2]} height={rg.coords[3]} rx={6} {...common} />;
    return <polygon points={rg.coords.join(" ")} {...common} />;
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ position: "relative", maxWidth: 360 }}>
        {imgUrl && <img src={imgUrl} alt={meta?.label || "Figure"} style={{ width: "100%", borderRadius: 12, display: "block" }} />}
        <svg viewBox={vb} style={{ position: imgUrl ? "absolute" : "relative", inset: 0, width: "100%", height: imgUrl ? "100%" : "auto" }} role="group" aria-label="clickable regions">
          {regions.map((rg) => <g key={rg.id}>{shapeEl(rg)}</g>)}
        </svg>
      </div>
      <InteractiveFooter
        submitted={submitted}
        canSubmit={selected.length > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ selected })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        onRetry={() => { setSelected([]); retry(); }}
      />
    </InteractiveShell>
  );
}
