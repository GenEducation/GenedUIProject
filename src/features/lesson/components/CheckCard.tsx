"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AnswerResponse, CheckItem } from "../types/lesson";

interface CheckCardProps {
  check: CheckItem;
  ordinal: number;
  total: number;
  disabled?: boolean;
  onSubmit: (response: AnswerResponse, latencyMs: number) => void;
  onHint: () => void;
}

/**
 * One check, rendered by `response_type`. The wire `AnswerResponse.kind`
 * doesn't map 1:1 to `response_type` — `symbolic` and `string_set` both
 * submit as `TextResponse` (domains/assessment/src/gened_assessment/rules.py
 * in the backend: both are graded from free text, one by exact algebraic
 * equivalence, one by a normalized string set).
 */
export function CheckCard({ check, ordinal, total, disabled, onSubmit, onHint }: CheckCardProps) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>(check.options.map((o) => o.id));
  const [shownAt] = useState(() => Date.now());

  const latency = () => Date.now() - shownAt;

  const submitDisabled =
    disabled ||
    (check.response_type === "mcq" && selected.length === 0) ||
    ((check.response_type === "numeric" || check.response_type === "symbolic" || check.response_type === "string_set") &&
      text.trim().length === 0);

  const handleSubmit = () => {
    let response: AnswerResponse;
    switch (check.response_type) {
      case "numeric":
        response = { kind: "numeric", value: text.trim() };
        break;
      case "mcq":
        response = { kind: "choice", option_ids: selected };
        break;
      case "sequence":
        response = { kind: "ordered", items: order };
        break;
      case "matching":
        // No pairing UI yet (left/right lists render, but drag-to-match is a
        // later pass) — submit the identity pairing so the flow stays testable.
        response = { kind: "pairs", pairs: check.options.map((o) => ({ left: o.id, right: o.id })) };
        break;
      case "symbolic":
      case "string_set":
      default:
        response = { kind: "text", text: text.trim() };
        break;
    }
    onSubmit(response, latency());
  };

  const toggleOption = (id: string) => {
    if (check.response_type !== "mcq") return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const isCheckpoint = check.role === "checkpoint";
  const accent = isCheckpoint ? "var(--primary)" : "var(--tutor)";

  return (
    <div
      className="rounded-2xl border-l-[3px] bg-white p-4 shadow-[0_1px_3px_rgba(4,46,92,0.04)]"
      style={{ borderColor: accent, borderTop: "1px solid rgba(4,46,92,0.06)", borderRight: "1px solid rgba(4,46,92,0.06)", borderBottom: "1px solid rgba(4,46,92,0.06)" }}
    >
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#94A3B8]">
        <span>
          Check {ordinal} of {total}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: `${accent}14`, color: accent }}
        >
          {isCheckpoint ? "Checkpoint" : "Quick check"}
        </span>
      </div>
      <p className="mb-3 text-sm font-semibold text-[var(--primary-ink)]">{check.prompt}</p>

      {check.response_type === "mcq" && (
        <div className="flex flex-col gap-2">
          {check.options.map((option) => (
            // A toggle chip, not a design-system action button.
            // eslint-disable-next-line no-restricted-syntax
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => toggleOption(option.id)}
              className="rounded-xl border px-3 py-2.5 text-left text-sm transition-colors"
              style={
                selected.includes(option.id)
                  ? { borderColor: "var(--tutor)", background: "rgba(91,77,199,0.08)", color: "var(--tutor)" }
                  : { borderColor: "#E2E8F0", color: "#1A202C" }
              }
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {(check.response_type === "numeric" || check.response_type === "symbolic" || check.response_type === "string_set") && (
        <input
          type="text"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          placeholder={check.response_type === "numeric" ? "e.g. 1/2" : "Type your answer"}
          className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
          style={{ borderColor: "#E2E8F0" }}
        />
      )}

      {check.response_type === "sequence" && (
        <ol className="flex flex-col gap-1">
          {order.map((id, index) => {
            const option = check.options.find((o) => o.id === id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E2E8F0" }}>
                {/* A reorder control, not a design-system action button. */}
                {/* eslint-disable-next-line no-restricted-syntax */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => moveUp(index)}
                  className="text-[#94A3B8] hover:text-[var(--primary-ink)]"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <span>{option?.text}</span>
              </li>
            );
          })}
        </ol>
      )}

      {check.response_type === "matching" && (
        <p className="text-xs text-[#94A3B8]">
          Matching pairs isn&apos;t built yet — Submit sends an unpaired identity match so the rest of the flow
          (scoring, teacher reaction) can still be exercised.
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" disabled={submitDisabled} onClick={handleSubmit}>
          Submit
        </Button>
        <Button size="sm" variant="tertiary" disabled={disabled} onClick={onHint}>
          Hint
        </Button>
      </div>
    </div>
  );
}
