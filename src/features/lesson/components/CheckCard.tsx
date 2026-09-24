"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AnswerResponse, CheckItem, PresentationManifest } from "../types/lesson";
import { cleanPrompt, isReadableNumber } from "../display";
import { FigureBlock } from "./FigureBlock";

interface CheckCardProps {
  check: CheckItem;
  ordinal: number;
  total: number;
  disabled?: boolean;
  manifest?: PresentationManifest | null;
  onExpiredManifest?: () => void;
  /** `displayText` is how the answer reads in the conversation. */
  onSubmit: (response: AnswerResponse, latencyMs: number, displayText: string) => void;
  onHint: () => void;
}

/**
 * One check, rendered by `response_type`. The wire `AnswerResponse.kind`
 * doesn't map 1:1 to `response_type` — `symbolic` and `string_set` both
 * submit as `TextResponse` (domains/assessment/src/gened_assessment/rules.py
 * in the backend: both are graded from free text, one by exact algebraic
 * equivalence, one by a normalized string set).
 */
export function CheckCard({ check, ordinal, total, disabled, manifest, onExpiredManifest, onSubmit, onHint }: CheckCardProps) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>(check.options.map((o) => o.id));
  const [shownAt] = useState(() => Date.now());
  const [touched, setTouched] = useState(false);

  const latency = () => Date.now() - shownAt;

  const typed = check.response_type === "numeric" || check.response_type === "symbolic" || check.response_type === "string_set";
  // A number question accepts only what the marker can read (see display.isReadableNumber).
  const invalidNumber = check.response_type === "numeric" && text.trim().length > 0 && !isReadableNumber(text);
  // Only flag it once the learner has paused (blur or Enter), not while they're still typing a prefix like "1/".
  const showNumberError = invalidNumber && touched;

  const submitDisabled =
    disabled ||
    (check.response_type === "mcq" && selected.length === 0) ||
    (typed && text.trim().length === 0) ||
    // No pairing control exists yet, and a guessed pairing would be marked as a real answer.
    check.response_type === "matching" ||
    invalidNumber;

  const handleSubmit = () => {
    let response: AnswerResponse;
    const optionText = (id: string) => check.options.find((o) => o.id === id)?.text ?? id;
    let displayText = text.trim();
    switch (check.response_type) {
      case "numeric":
        response = { kind: "numeric", value: text.trim() };
        break;
      case "mcq":
        response = { kind: "choice", option_ids: selected };
        displayText = selected.map(optionText).join(", ");
        break;
      case "sequence":
        response = { kind: "ordered", items: order };
        displayText = order.map(optionText).join(" → ");
        break;
      case "matching":
        // No pairing UI yet (left/right lists render, but drag-to-match is a
        // later pass) — submit the identity pairing so the flow stays testable.
        response = { kind: "pairs", pairs: check.options.map((o) => ({ left: o.id, right: o.id })) };
        displayText = "Matched the pairs";
        break;
      case "symbolic":
      case "string_set":
      default:
        response = { kind: "text", text: text.trim() };
        break;
    }
    onSubmit(response, latency(), displayText);
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
      <div className="mb-2 text-xs font-semibold" style={{ color: accent }}>
        Check {ordinal} of {total}
      </div>
      <p className="mb-3 text-sm font-semibold text-[var(--primary-ink)]">{cleanPrompt(check.prompt)}</p>

      {check.figure_groups.map((group) => (
        <FigureBlock
          key={group.id}
          group={group}
          manifest={manifest ?? null}
          onExpired={onExpiredManifest ?? (() => {})}
        />
      ))}

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

      {typed && (
        <input
          type="text"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (invalidNumber) setTouched(true);
            else if (!submitDisabled) handleSubmit();
          }}
          autoFocus
          placeholder={check.response_type === "numeric" ? "Type a number" : "Type your answer"}
          className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
          style={{ borderColor: showNumberError ? "#E8635A" : "#E2E8F0" }}
          aria-invalid={showNumberError}
        />
      )}
      {showNumberError && (
        <p className="mt-1.5 text-xs text-[#B83F37]">Write your answer with digits, like 2, 1/2 or 1 1/2.</p>
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
          Matching questions can&apos;t be answered here yet. Talk it through with your tutor instead.
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
