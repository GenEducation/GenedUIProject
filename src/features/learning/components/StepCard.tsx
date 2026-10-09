"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type FormEvent } from "react";
import { ArrowRight, Check, Lightbulb, Loader2, X } from "lucide-react";
import { asError } from "@/utils/errors";
import { AnimatePresence, motion } from "framer-motion";
import { useLessonStore } from "../useLessonStore";
import { calculation } from "../check/arithmetic";
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

/** How long a result note stays before it slips away. */
const NOTE_MS = 3200;

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
    <motion.p
      role="status"
      initial={{ opacity: 0, y: 10, scale: 0.96, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ type: "spring", duration: 0.45, bounce: 0.25 }}
      className={`lesson-sketch-sm lesson-hand flex items-center gap-2 px-3 py-2 text-[18px] font-bold ${tone}`}>
      {copy.tone === "good" ? <Check size={16} aria-hidden /> : copy.tone === "try" ? <X size={16} aria-hidden /> : null}
      {copy.text}
    </motion.p>
  );
}

/** Drawn on the board like its visuals: handwriting, ink lines, a wobbly hand-drawn edge. */
const SKETCH_VARIANT = {
  primary:
    "lesson-sketch-sm border-[var(--ls-ink)] bg-[var(--ls-primary)] text-white hover:bg-[var(--ls-accent)] hover:text-[var(--ls-ink)]",
  secondary: "lesson-sketch-sm hover:bg-[var(--ls-accent)]",
  tertiary: "rounded-[12px_4px_13px_5px/5px_13px_4px_12px] hover:bg-[var(--ls-accent)]",
} as const;

/** A hand-drawn button for the board's cards: ink edge, handwriting, citron on hover. */
function SketchButton({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof SKETCH_VARIANT; loading?: boolean }) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- a hand-drawn button, part of the board's sketch style.
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`lesson-hand inline-flex items-center gap-1.5 px-4 py-1.5 text-[18px] font-bold text-[var(--ls-ink)] transition-[background-color,color,transform] duration-200 hover:-rotate-1 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${SKETCH_VARIANT[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const cardClass = "lesson-rise lesson-sketch p-5 text-[var(--ls-ink)]";

function CheckCard({ check, onResult }: { check: CheckItem; onResult: (r: AnswerResult) => void }) {
  const answer = useLessonStore((s) => s.answer);
  const askHint = useLessonStore((s) => s.askHint);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isChoice = check.response_type === "mcq";
  const isTyped = TYPED_TYPES.has(check.response_type);
  // A sum typed as the answer ("540 * 40") is worked out as they type, and its result is what's sent.
  const sum = isTyped ? calculation(typed) : null;

  useEffect(() => {
    setSelected(null);
    setTyped("");
    setError(null);
  }, [check.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response: AnswerResponse | null = isChoice
      ? selected ? { kind: "choice", option_ids: [selected] } : null
      : typed.trim() ? responseFor(check, sum ?? typed) : null;
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
      <p className="lesson-hand lesson-underline inline-block text-[18px] font-bold text-[var(--ls-primary)]">
        {check.role === "checkpoint" ? "Checkpoint" : "Quick check"}
      </p>
      <h2 id={`check-${check.id}`} className="lesson-hand mt-2 text-[21px] font-bold leading-snug">
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
              className={`lesson-sketch-sm lesson-hand px-4 py-2.5 text-left text-[18px] transition-colors ${
                selected === option.id
                  ? "bg-[var(--ls-accent)] font-bold"
                  : "hover:bg-[var(--ls-primary-soft)]"
              }`}
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {isTyped && (
        <div className="relative mt-4">
          <label htmlFor={`answer-${check.id}`} className="sr-only">Your answer</label>
          <input
            id={`answer-${check.id}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            inputMode="text"
            maxLength={check.response_type === "numeric" ? 64 : 500}
            autoComplete="off"
            placeholder="Your answer"
            aria-describedby={sum ? `sum-${check.id}` : undefined}
            className="lesson-hand w-full border-0 border-b-2 border-dashed border-[var(--ls-ink-faint)] bg-transparent px-1 py-2 text-[20px] text-[var(--ls-ink)] outline-none placeholder:text-[var(--ls-ink-faint)] focus:border-solid focus:border-[var(--ls-primary)]"
          />
          {/* The worked-out result, written on just after what they typed, like a calculator's ghost. */}
          <AnimatePresence>
            {sum && (
              <motion.p
                id={`sum-${check.id}`}
                aria-live="polite"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="lesson-hand pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden whitespace-pre px-1 text-[20px]"
              >
                <span className="invisible">{typed}</span>
                <span className="text-[var(--ls-primary)]"> = {sum}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {!isChoice && !isTyped && (
        <p className="lesson-hand mt-3 text-[17px] text-[var(--ls-ink-mid)]">Type your answer to this one in the chat.</p>
      )}

      {error && <p role="alert" className="mt-3 text-[13px] text-[#9A2E1E]">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {(isChoice || isTyped) && (
          <SketchButton type="submit" disabled={busy || (isChoice ? !selected : !typed.trim())} loading={busy}>
            Check answer
          </SketchButton>
        )}
        <SketchButton type="button" variant="tertiary" onClick={() => void askHint(check.id)}>
          <Lightbulb size={16} aria-hidden /> Hint
        </SketchButton>
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
      <h2 className="lesson-hand text-[21px] font-bold">
        Did you mean <span className="lesson-hand text-[20px] text-[var(--ls-primary)]">{suggestion}</span>?
      </h2>
      <p className="lesson-hand mt-1 text-[17px] text-[var(--ls-ink-mid)]">You wrote “{original}”.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <SketchButton disabled={busy} onClick={() => void resubmit(suggestion)}>Yes, {suggestion}</SketchButton>
        <SketchButton variant="secondary" disabled={busy} onClick={() => void resubmit(original)}>No, keep “{original}”</SketchButton>
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
  const [resultKey, setResultKey] = useState(0);
  const showResult = (result: AnswerResult) => {
    setLastResult(result);
    setResultKey((k) => k + 1);
  };
  // A result pops up for a moment, then slips away.
  useEffect(() => {
    if (!lastResult) return;
    const timer = window.setTimeout(() => setLastResult(null), NOTE_MS);
    return () => window.clearTimeout(timer);
  }, [lastResult, resultKey]);
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
        <h2 className="lesson-hand text-[21px] font-bold">That round was tricky. What next?</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {node.choice.options.map((option) => (
            <SketchButton
              key={option}
              variant={option === node.choice!.recommended ? "primary" : "secondary"}
              disabled={busy}
              onClick={() => void run(() => choose(option))}
            >
              {option === "try_now" ? "Try a new question" : "Keep going"}
            </SketchButton>
          ))}
        </div>
      </div>
    );
  } else if (reading && checks.get(reading.item_id)) {
    body = <ConfirmReading check={checks.get(reading.item_id)!} original={reading.original} suggestion={reading.suggestion} />;
  } else if (unanswered.length > 0 && checks.get(unanswered[0])) {
    body = <CheckCard check={checks.get(unanswered[0])!} onResult={showResult} />;
  } else if (node.type === "teach" && node.engagement_count >= node.engagement_required) {
    body = (
      <div className={`${cardClass} flex flex-wrap items-center gap-4`}>
        <p className="lesson-hand flex-1 text-[20px] font-bold">Got it? Move on when you&apos;re ready.</p>
        <SketchButton disabled={busy} loading={busy} onClick={() => void run(done)}>
          Next step <ArrowRight size={16} aria-hidden />
        </SketchButton>
      </div>
    );
  } else if (node.type === "teach") {
    body = (
      <p className="lesson-hand text-center text-[18px] text-[var(--ls-ink-mid)]">
        Talk it through with your tutor to unlock the next step.
      </p>
    );
  }

  // Nothing to do or say on this step: render nothing, so the board's docked card disappears.
  if (!lastResult && !body && !error) return null;

  return (
    // `mt-auto` sits the card at the foot of its dock; when taller than the dock, it scrolls from the top.
    <div className="mt-auto flex flex-col gap-3">
      <AnimatePresence>{lastResult && <ResultNote key={resultKey} result={lastResult} />}</AnimatePresence>
      {body}
      {error && <p role="alert" className="text-[13px] text-[#9A2E1E]">{error}</p>}
    </div>
  );
}
