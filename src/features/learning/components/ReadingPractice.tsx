"use client";

import { ArrowLeft, Mic, RotateCcw, Square } from "lucide-react";
import { alignWords, feedbackFor } from "../reading/alignWords";
import type { ReadAloudDeps } from "../reading/readAloud";
import { useReadAloud } from "../reading/useReadAloud";

const WORD = /([\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*)/u;
const PRIMARY =
  "lesson-display inline-flex items-center gap-2 rounded-full bg-[var(--ls-primary)] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[var(--ls-primary-hover)] disabled:opacity-50";
const QUIET =
  "lesson-display inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-[var(--ls-primary)] hover:bg-[var(--ls-sage)]";

/**
 * Read-aloud practice for one part, as its own view: the piece to read, large and once; the words lighting up as the listener
 * picks them up, with the next one to read marked; and, at the end, the words it missed marked where they are. Practice only:
 * nothing is scored or sent to the tutor, and a word "not picked up" may be the listener's miss, never called a mistake.
 */
export function ReadingPractice({
  instanceId,
  passageId,
  segment,
  excerpt,
  fromLesson = false,
  capture,
  onClose,
}: {
  instanceId: string | null;
  passageId: string;
  segment: number;
  /** The piece to read: the lines being taught when there are some, else the part's first sentences. */
  excerpt: string;
  /** The piece is the part being taught now. */
  fromLesson?: boolean;
  capture?: ReadAloudDeps;
  onClose: () => void;
}) {
  const practice = useReadAloud(instanceId, passageId, segment, capture);
  const { phase, heard, problem } = practice.state;
  const busy = phase === "starting" || phase === "listening" || phase === "finishing";
  const marking = phase === "listening" || phase === "finishing" || (phase === "done" && !problem);
  const result = alignWords(excerpt, marking ? heard : "");
  const total = result.words.length;
  const picked = result.words.filter((w) => w.heard).length;
  // The next word to read: the first one not picked up after the last one that was.
  const last = result.words.reduce((at, w, i) => (w.heard ? i : at), -1);
  const next = phase === "listening" ? result.words.findIndex((w, i) => i > last && !w.heard) : -1;
  const feedback = phase === "done" && !problem ? feedbackFor(result) : null;

  const leave = () => {
    practice.cancel();
    onClose();
  };

  // Split on words (one capture group): the gaps are at even places, word k at 2k + 1.
  const tokens = excerpt.normalize("NFC").split(WORD).map((piece, i) => {
    if (i % 2 === 0) return <span key={i}>{piece}</span>;
    const index = (i - 1) / 2;
    const mark = result.words[index];
    const isHeard = marking && mark?.heard;
    const missed = phase === "done" && !problem && mark && !mark.heard;
    return (
      <span
        key={i}
        data-heard={marking ? String(!!mark?.heard) : undefined}
        aria-current={index === next ? "true" : undefined}
        className={`rounded-[4px] transition-colors duration-300 ${
          isHeard ? "bg-[rgb(217_242_121/0.55)]" : ""
        } ${index === next ? "underline decoration-[var(--ls-primary)] decoration-2 underline-offset-[6px]" : ""} ${
          missed ? "font-semibold text-[var(--ls-warn)] underline decoration-dotted decoration-2 underline-offset-4" : ""
        }`}
      >
        {piece}
        {missed && <span className="sr-only"> (not picked up)</span>}
      </span>
    );
  });

  return (
    <section aria-label="Reading practice" className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
        {/* eslint-disable-next-line no-restricted-syntax -- leaves practice for the book. */}
        <button type="button" onClick={leave} className={`${QUIET} -ml-3 mb-2`}>
          <ArrowLeft size={14} aria-hidden /> Back to the book
        </button>
        <p className="lesson-display text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ls-ink-mid)]">
          Read this out loud{fromLesson ? " · the part being taught" : ""}
        </p>
        <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--ls-ink-mid)]">
          {["Tap Start reading", "Read at your own pace", "Tap I'm done"].map((step, i) => (
            <li key={step} className="flex items-center gap-1.5">
              <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-[var(--ls-sage)] text-[10px] font-bold text-[var(--ls-primary)]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <p lang="und" className="mt-4 font-[family-name:var(--font-source-serif)] text-[20px] leading-[1.85] text-[var(--ls-ink)]">
          {tokens}
        </p>

        {marking && total > 0 && (
          <div className="mt-4" aria-hidden>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ls-sage)]">
              <div className="h-full rounded-full bg-[var(--ls-accent-deep)] transition-[width] duration-300" style={{ width: `${(picked / total) * 100}%` }} />
            </div>
            <p className="mt-1 text-[12px] text-[var(--ls-ink-mid)]">
              {picked} of {total} words picked up
            </p>
          </div>
        )}

        {feedback && (
          <div className="mt-4 rounded-xl bg-white px-3 py-3 shadow-[var(--ls-shadow)]">
            <p className="text-[15px] font-semibold text-[var(--ls-ink)]">{feedback.headline}</p>
            {feedback.missed.length > 0 && (
              <ul aria-label="Words not picked up" className="mt-2 flex flex-wrap gap-1.5">
                {feedback.missed.map((word, i) => (
                  <li key={`${word}-${i}`} className="rounded-full bg-[var(--ls-warn-soft)] px-2.5 py-0.5 text-[13px] font-semibold text-[var(--ls-warn)]">
                    {word}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[12px] text-[var(--ls-ink-mid)]">{feedback.note}</p>
          </div>
        )}
      </div>

      {/* The recorder: one main action for the moment, and a way out. */}
      <div className="flex items-center gap-3 border-t border-[var(--ls-border)] bg-[var(--ls-card-warm)] px-5 py-3">
        {(phase === "idle" || phase === "failed" || phase === "done") && (
          // eslint-disable-next-line no-restricted-syntax -- starts the practice.
          <button type="button" className={PRIMARY} onClick={practice.start} disabled={!instanceId}>
            {phase === "idle" ? <Mic size={15} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
            {phase === "idle" ? "Start reading" : "Try again"}
          </button>
        )}
        {phase === "listening" && (
          // eslint-disable-next-line no-restricted-syntax -- ends the practice.
          <button type="button" className={PRIMARY} onClick={practice.finish}>
            <Square size={13} aria-hidden /> I&apos;m done
          </button>
        )}
        <p role="status" aria-live="polite" className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-[var(--ls-ink-mid)]">
          {phase === "listening" && (
            <span aria-hidden className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--ls-danger)] opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--ls-danger)]" />
            </span>
          )}
          <span className="min-w-0">
            {phase === "starting" && "Getting the microphone ready…"}
            {phase === "listening" && "Listening…"}
            {phase === "finishing" && "One moment…"}
            {problem}
          </span>
        </p>
        {/* eslint-disable-next-line no-restricted-syntax -- leaves the practice. */}
        <button type="button" className={QUIET} onClick={leave}>
          {busy ? "Cancel" : "Close"}
        </button>
      </div>
    </section>
  );
}
