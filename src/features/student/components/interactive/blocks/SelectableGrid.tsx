"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

export default function SelectableGrid({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const shape: string = render.shape || "grid";
  const rows: number = render.rows || 2;
  const cols: number = render.cols || 4;
  const segments: number = render.segments || rows * cols;
  const fill: string = render.fill_color || COLORS.brand;
  const max: number | undefined = interaction.max_selections;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: number[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : [];
  const [selected, setSelected] = useState<number[]>(initial);
  const lock = disabled || submitted;

  const toggle = (i: number) => {
    if (lock) return;
    setSelected((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (max && prev.length >= max) return prev;
      return [...prev, i];
    });
  };

  const isOn = (i: number) => selected.includes(i);

  const renderGrid = () => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, maxWidth: Math.min(cols * 76, 340) }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <button
          key={i}
          onClick={() => toggle(i)}
          aria-pressed={isOn(i)}
          // Cells render no text, so without this they are unnamed buttons —
          // unusable with a screen reader, and only addressable in tests by
          // DOM position.
          aria-label={`cell ${i + 1}`}
          disabled={lock}
          style={{
            height: 54, borderRadius: 12, cursor: lock ? "default" : "pointer",
            border: `1px solid ${isOn(i) ? fill : COLORS.border}`,
            background: isOn(i) ? fill : "#FFFFFF", transition: "all 0.15s",
          }}
        />
      ))}
    </div>
  );

  const renderCircle = () => {
    const cx = 70, cy = 70, r = 60;
    return (
      <svg viewBox="0 0 140 140" style={{ width: 150, height: 150 }} role="group" aria-label="fraction circle">
        {Array.from({ length: segments }).map((_, i) => {
          const a1 = (i / segments) * 2 * Math.PI - Math.PI / 2;
          const a2 = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
          const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
          const large = a2 - a1 > Math.PI ? 1 : 0;
          return (
            <path
              key={i}
              d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={isOn(i) ? fill : "#FFFFFF"}
              stroke={fill}
              strokeWidth={1.5}
              style={{ cursor: lock ? "default" : "pointer" }}
              onClick={() => toggle(i)}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      {shape === "circle" ? renderCircle() : renderGrid()}
      {max ? (
        <p style={{ marginTop: 8, fontSize: 12, color: COLORS.muted }}>{selected.length} of {max} selected</p>
      ) : null}
      <InteractiveFooter
        submitted={submitted}
        canSubmit={selected.length > 0 && !disabled}
        submitting={submitting}
        onSubmit={() => submit({ selected: [...selected].sort((a, b) => a - b) })}
        isCorrect={isCorrect}
        allowRetry={allowRetry}
        attempts={attempts}
        submitError={submitError}
        onDismissError={dismissError}
        onRetry={() => { setSelected([]); retry(); }}
      />
    </InteractiveShell>
  );
}
