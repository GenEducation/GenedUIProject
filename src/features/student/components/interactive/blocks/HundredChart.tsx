"use client";

import React, { useState } from "react";
import { InteractiveProps, COLORS } from "../types";
import { useInteractiveAnswer } from "../useInteractiveAnswer";
import { InteractiveShell, InteractiveFooter } from "../shared";

interface HSet { label?: string; color: string; values: number[] }

export default function HundredChart({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const interaction = meta?.interaction || {};
  const start: number = render.start ?? 1;
  const end: number = render.end ?? 100;
  const columns: number = render.columns || 10;
  const fill: string = render.fill_color || "#378ADD";
  const max: number | undefined = interaction.max_selections;
  const allowRetry = !!interaction.allow_retry && !readOnly;
  const it = meta?.interaction_type || "select_cells";

  const highlightSets: HSet[] = Array.isArray(render.highlight_sets) ? render.highlight_sets : [];
  const hasHighlights = highlightSets.length > 0;
  // selected uses the brand colour when sets are highlighted; otherwise keep the
  // original fill colour for full backward compatibility.
  const selFill = hasHighlights ? COLORS.brand : fill;

  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError, studentAnswer } =
    useInteractiveAnswer(directiveId, it, allowRetry);

  const initial: number[] = Array.isArray(studentAnswer?.selected) ? studentAnswer.selected : [];
  const [selected, setSelected] = useState<number[]>(initial);
  const lock = disabled || submitted;

  const nums: number[] = [];
  for (let n = start; n <= end; n++) nums.push(n);

  const setsFor = (n: number) => (hasHighlights ? highlightSets.filter((s) => (s.values || []).includes(n)) : []);

  const toggle = (n: number) => {
    if (lock) return;
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (max && prev.length >= max) return prev;
      return [...prev, n];
    });
  };

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question} targetLabel={render.target_label}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 3, maxWidth: 380 }}>
        {nums.map((n) => {
          const on = selected.includes(n);
          const sets = setsFor(n);
          const member = sets.length > 0;
          // With highlight sets, only members are interactive; without, every cell is.
          const tappable = hasHighlights ? member : true;
          const cellLock = lock || !tappable;

          let background = "#FFFFFF";
          let color = COLORS.ink;
          let borderColor = COLORS.border;
          if (on) {
            background = selFill; color = "#FFFFFF"; borderColor = selFill;
          } else if (sets.length >= 2) {
            background = `linear-gradient(135deg, ${sets[0].color} 50%, ${sets[1].color} 50%)`;
            color = "#FFFFFF"; borderColor = sets[0].color;
          } else if (sets.length === 1) {
            background = `${sets[0].color}33`; borderColor = sets[0].color; color = COLORS.ink;
          } else if (hasHighlights) {
            // non-member: display-only
            background = "#FFFFFF"; color = "#C7CBD3"; borderColor = COLORS.border;
          }

          return (
            <button
              key={n}
              onClick={() => toggle(n)}
              aria-pressed={on}
              disabled={cellLock}
              style={{
                aspectRatio: "1", fontSize: 11, borderRadius: 6, padding: 0,
                border: `1px solid ${borderColor}`,
                background, color,
                fontWeight: sets.length >= 2 || on ? 700 : 400,
                cursor: cellLock ? "default" : "pointer", transition: "all 0.12s",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {hasHighlights && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            {highlightSets.map((s, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.muted }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: `${s.color}33`, border: `1px solid ${s.color}` }} />
                {s.label || `Set ${i + 1}`}
              </span>
            ))}
            {highlightSets.length >= 2 && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.muted }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: `linear-gradient(135deg, ${highlightSets[0].color} 50%, ${highlightSets[1].color} 50%)` }} />
                In both
              </span>
            )}
          </div>
          {highlightSets.length >= 2 && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: COLORS.muted }}>Tip: tap the numbers that are in both colours.</p>
          )}
        </div>
      )}

      <p style={{ marginTop: 8, fontSize: 12, color: COLORS.muted }}>{selected.length} selected</p>
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
