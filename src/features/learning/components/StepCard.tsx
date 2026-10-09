"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { useLessonStore } from "../useLessonStore";
import type { AnswerResponse, AnswerResult, CheckItem } from "../types";
import { BoardFigure } from "./BoardFigure";

/** The structured answer each check type is scored from (backend `gened_assessment/scorer.py`). */
export function responseFor(check: CheckItem, value: string): AnswerResponse {
  if (check.response_type === "numeric") return { kind: "numeric", value: value.trim() };
  return { kind: "text", text: value.trim() };
}

/** Ordering and matching need drag-and-drop answers the board doesn't draw yet; the chat accepts them as text. */
const TYPED_TYPES = new Set<CheckItem["response_type"]>(["numeric", "numeric_set", "symbolic", "string_set"]);

const RESULT_COPY: Record<AnswerResult["outcome"], { tone: "good" | "try" | "info"; text: string } | null> = {
  correct: { tone: "good", text: "That's right!" },
  incorrect: { tone: "try", text: "Not quite. Your tutor will help." },
  unscorable: { tone: "info", text: "Your tutor couldn't read that answer. Try writing it another way." },
  quarantined: { tone: "info", text: "Your tutor will look at this one." },
  needs_confirmation: null,
};

function ResultNote({ result }: { result: AnswerResult }) {
  const copy = RESULT_COPY[result.outcome];
  if (!copy) return null;
  const tone =
    copy.tone === "good"
      ? "bg-[var(--ls-accent)] text-[var(--ls-ink)]"
      : copy.tone === "try"
        ? "bg-[#FBEFE6] text-[#7A3B12]"
        : "bg-[var(--ls-soft)] text-[var(--ls-ink)]";
  return (
    <p role="status" className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] font-semibold ${tone}`}>
      {copy.tone === "good" ? <Check size={16} aria-hidden /> : copy.tone === "try" ? <X size={16} aria-hidden /> : null}
      {copy.text}
    </p>
  );
}

const cardClass = "lesson-rise rounded-[20px] border border-[var(--ls-border-strong)] bg-white p-5 shadow-[var(--ls-shadow)]";

function CheckCard({ check, onResult }: { check: CheckItem; onResult: (r: AnswerResult) => void }) {
  const answer = useLessonStore((s) => s.answer);
  const askHint = useLessonStore((s) => s.askHint);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isChoice = check.response_type === "mcq";
  const isTyped = TYPED_TYPES.has(check.response_type);

  useEffect(() => {
    setSelected(null);
    setTyped("");
    setError(null);
  }, [check.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response: AnswerResponse | null = isChoice
      ? selected ? { kind: "choice", option_ids: [selected] } : null
      : typed.trim() ? responseFor(check, typed) : null;
    if (!response) return;
    setBusy(true);
    setError(null);
    try {
      const result = await answer(check.id, response);
      if (result) onResult(result);
    } catch (e) {
      setError(asError(e).message || "That answer couldn't be sent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={cardClass} aria-labelledby={`check-${check.id}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ls-primary)]">
        {check.role === "checkpoint" ? "Checkpoint" : "Quick check"}
      </p>
      <h2 id={`check-${check.id}`} className="mt-1.5 text-[17px] font-bold leading-snug">
        {check.prompt}
      </h2>
      {check.figure_groups.map((group) => (
        <div key={group.id} className="mt-3">
          <BoardFigure figureGroupId={group.id} />
        </div>
      ))}

      {isChoice && (
        <div role="radiogroup" aria-labelledby={`check-${check.id}`} className="mt-4 grid gap-2 sm:grid-cols-2">
          {check.options.map((option) => (
            // eslint-disable-next-line no-restricted-syntax -- an answer option: a radio, its selected state is its look.
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected === option.id}
              onClick={() => setSelected(option.id)}
              className={`rounded-xl border px-4 py-3 text-left text-[15px] transition-colors ${
                selected === option.id
                  ? "border-[var(--ls-primary)] bg-[var(--ls-primary-soft)] font-semibold"
                  : "border-[var(--ls-border-strong)] hover:bg-[var(--ls-primary-soft)]"
              }`}
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {isTyped && (
        <>
          <label htmlFor={`answer-${check.id}`} className="sr-only">Your answer</label>
          <input
            id={`answer-${check.id}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            inputMode={check.response_type === "numeric" ? "decimal" : "text"}
            maxLength={check.response_type === "numeric" ? 64 : 500}
            autoComplete="off"
            placeholder="Your answer"
            className="mt-4 w-full rounded-xl border border-[var(--ls-border-strong)] px-4 py-3 text-[15px] outline-none focus:border-[var(--ls-primary)] focus:shadow-[0_0_0_3px_var(--ls-primary-wash)]"
          />
        </>
      )}

      {!isChoice && !isTyped && (
        <p className="mt-3 text-[14px] text-[var(--ls-ink-mid)]">Type your answer to this one in the chat.</p>
      )}

      {error && <p role="alert" className="mt-3 text-[13px] text-[#9A2E1E]">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {(isChoice || isTyped) && (
          <Button type="submit" disabled={busy || (isChoice ? !selected : !typed.trim())} loading={busy}>
            Check answer
          </Button>
        )}
        <Button type="button" variant="tertiary" onClick={() => void askHint(check.id)}>
          <Lightbulb size={16} aria-hidden /> Hint
        </Button>
      </div>
    </form>
  );
}

function ConfirmReading({ check, original, suggestion }: { check: CheckItem; original: string; suggestion: string }) {
  const answer = useLessonStore((s) => s.answer);
  const [busy, setBusy] = useState(false);
  const resubmit = async (value: string) => {
    setBusy(true);
    try {
      await answer(check.id, responseFor(check, value), { confirmedReading: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={cardClass}>
      <h2 className="text-[17px] font-bold">
        Did you mean <span className="lesson-hand text-[20px] text-[var(--ls-primary)]">{suggestion}</span>?
      </h2>
      <p className="mt-1 text-[14px] text-[var(--ls-ink-mid)]">You wrote “{original}”.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => void resubmit(suggestion)}>Yes, {suggestion}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => void resubmit(original)}>No, keep “{original}”</Button>
      </div>
    </div>
  );
}

/**
 * What the learner can do on the board right now, read off the lesson state:
 * a check to answer, a reading to confirm, a choice after a failed round, or
 * (on a teach step that is ready) moving on. Nothing here decides correctness
 * or progression; every outcome comes back from the backend.
 */
export function StepCard() {
  const instance = useLessonStore((s) => s.instance);
  const payload = useLessonStore((s) => s.payload);
  const done = useLessonStore((s) => s.done);
  const choose = useLessonStore((s) => s.choose);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const node = instance?.active_node;
  // A result belongs to the step it was given on.
  useEffect(() => setLastResult(null), [node?.instance_node_id]);
  if (!instance || instance.state !== "active" || !node || !payload) return null;

  const checks = new Map(payload.node.check_items.map((c) => [c.id, c]));
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(asError(e).message || "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode = null;
  const reading = node.pending_reading;
  const unanswered = node.check_item_ids.filter((id) => !node.answered_item_ids.includes(id));

  if (instance.next_action === "choose" && node.choice) {
    body = (
      <div className={cardClass}>
        <h2 className="text-[17px] font-bold">That round was tricky. What next?</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {node.choice.options.map((option) => (
            <Button
              key={option}
              variant={option === node.choice!.recommended ? "primary" : "secondary"}
              disabled={busy}
              onClick={() => void run(() => choose(option))}
            >
              {option === "try_now" ? "Try a new question" : "Keep going"}
            </Button>
          ))}
        </div>
      </div>
    );
  } else if (reading && checks.get(reading.item_id)) {
    body = <ConfirmReading check={checks.get(reading.item_id)!} original={reading.original} suggestion={reading.suggestion} />;
  } else if (unanswered.length > 0 && checks.get(unanswered[0])) {
    body = <CheckCard check={checks.get(unanswered[0])!} onResult={setLastResult} />;
  } else if (node.type === "teach" && node.engagement_count >= node.engagement_required) {
    body = (
      <div className={`${cardClass} flex flex-wrap items-center gap-4`}>
        <p className="flex-1 text-[16px] font-semibold">Got it? Move on when you&apos;re ready.</p>
        <Button disabled={busy} loading={busy} onClick={() => void run(done)}>
          Next step <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    );
  } else if (node.type === "teach") {
    body = (
      <p className="lesson-hand text-center text-[18px] text-[var(--ls-ink-mid)]">
        Talk it through with your tutor to unlock the next step.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lastResult && <ResultNote result={lastResult} />}
      {body}
      {error && <p role="alert" className="text-[13px] text-[#9A2E1E]">{error}</p>}
    </div>
  );
}
