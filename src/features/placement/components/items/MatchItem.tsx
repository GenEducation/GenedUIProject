"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { langAttrs, type ItemWidgetProps } from "./itemProps";
import type { PlacementOption } from "../../types/placement";

/**
 * Match the pairs.
 *
 * Tap-to-pair rather than the test paper's drag-and-drop: this form is taken
 * by children as young as grade 3, often on a phone, and drag-and-drop there
 * is both fiddly and unreachable by keyboard. Tap a left item, tap its right
 * item, done — and the same two taps work as two Tab-and-Enter presses.
 *
 * Grading is order-independent, so pairs are emitted in left-column order for
 * a stable payload. Ids are sent, never display text.
 */
export function MatchItem({ item, value, onChange, disabled }: ItemWidgetProps) {
  const spec = item.block_spec as { left?: PlacementOption[]; right?: PlacementOption[] };
  const left = spec.left ?? [];
  const right = spec.right ?? [];
  const pairs = value && "pairs" in value ? value.pairs : [];
  const { lang } = langAttrs(item);

  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  const rightIdFor = (leftId: string) => pairs.find(([l]) => l === leftId)?.[1] ?? null;
  const leftIdFor = (rightId: string) => pairs.find(([, r]) => r === rightId)?.[0] ?? null;

  const commit = (next: [string, string][]) => {
    // Left-column order keeps the payload stable across re-pairings.
    const ordered = left
      .map((l) => next.find(([id]) => id === l.id))
      .filter((p): p is [string, string] => Boolean(p));
    onChange(ordered.length ? { pairs: ordered } : null);
  };

  const pickLeft = (leftId: string) => {
    if (disabled) return;
    // Tapping an already-paired left item unpairs it — the undo gesture is the
    // same as the do gesture, so there is nothing extra to discover.
    if (rightIdFor(leftId)) {
      commit(pairs.filter(([l]) => l !== leftId));
      setActiveLeft(leftId);
      return;
    }
    setActiveLeft((cur) => (cur === leftId ? null : leftId));
  };

  const pickRight = (rightId: string) => {
    if (disabled || !activeLeft) return;
    // A right item belongs to one left item; claiming it releases the old one.
    const next = pairs.filter(([l, r]) => l !== activeLeft && r !== rightId);
    commit([...next, [activeLeft, rightId]]);
    setActiveLeft(null);
  };

  return (
    <div className="space-y-2">
      <p
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "var(--pl-ink-faint)" }}
      >
        {activeLeft ? "Now tap its match on the right" : "Tap an item, then tap its match"}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          {left.map((l, i) => {
            const pairedTo = rightIdFor(l.id);
            const isActive = activeLeft === l.id;
            return (
              // A pairing target, not an action button: it carries
              // aria-pressed and three selection states Button has no variant
              // for.
              // eslint-disable-next-line no-restricted-syntax
              <button
                key={l.id}
                type="button"
                disabled={disabled}
                aria-pressed={isActive}
                onClick={() => pickLeft(l.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
                style={{
                  background: pairedTo ? "var(--pl-primary-soft)" : "var(--pl-card)",
                  borderColor: isActive
                    ? "var(--pl-primary)"
                    : pairedTo
                      ? "var(--pl-primary-wash)"
                      : "var(--pl-border)",
                  color: "var(--pl-ink)",
                  // @ts-expect-error -- CSS custom property for the focus ring
                  "--tw-ring-color": "var(--pl-ring)",
                }}
              >
                <span
                  className="w-5 h-5 shrink-0 rounded-md flex items-center justify-center text-[11px] font-black"
                  style={{
                    background: isActive ? "var(--pl-primary)" : "var(--pl-surface)",
                    color: isActive ? "var(--pl-accent)" : "var(--pl-primary)",
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-[13px] font-medium flex-1 leading-snug" lang={lang}>
                  {l.text}
                </span>
                {pairedTo && (
                  <span
                    className="text-[11px] font-bold flex items-center gap-1"
                    style={{ color: "var(--pl-primary)" }}
                  >
                    {String.fromCharCode(65 + right.findIndex((r) => r.id === pairedTo))}
                    <X size={10} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          {right.map((r, i) => {
            const claimedBy = leftIdFor(r.id);
            return (
              // The right-hand half of the same pairing control; see above.
              // eslint-disable-next-line no-restricted-syntax
              <button
                key={r.id}
                type="button"
                disabled={disabled || !activeLeft}
                onClick={() => pickRight(r.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2"
                style={{
                  background: claimedBy ? "var(--pl-surface)" : "var(--pl-card)",
                  borderColor: "var(--pl-border)",
                  color: "var(--pl-ink)",
                  // @ts-expect-error -- CSS custom property for the focus ring
                  "--tw-ring-color": "var(--pl-ring)",
                }}
              >
                <span
                  className="w-5 h-5 shrink-0 rounded-md flex items-center justify-center text-[11px] font-black"
                  style={{ background: "var(--pl-surface)", color: "var(--pl-primary)" }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-[13px] font-medium flex-1 leading-snug" lang={lang}>
                  {r.text}
                </span>
                {claimedBy && (
                  <span className="text-[11px] font-black" style={{ color: "var(--pl-primary)" }}>
                    {left.findIndex((l) => l.id === claimedBy) + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
