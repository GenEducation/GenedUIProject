"use client";

import { useState } from "react";
import { Headphones, Mic, Pause, RotateCcw, Square } from "lucide-react";
import { alignWords, feedbackFor, practiceExcerpt } from "../reading/alignWords";
import { canCaptureAudio, type ReadAloudDeps } from "../reading/readAloud";
import { useReadAloud } from "../reading/useReadAloud";
import { useSegmentAudio, type AudioDeps } from "../reading/useSegmentAudio";

const BUTTON =
  "lesson-display inline-flex items-center gap-1.5 rounded-full bg-[var(--ls-sage)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ls-primary)] disabled:opacity-50";

/**
 * Listening and optional read-aloud practice for one part of a text. Both are the learner's own choice, neither is an answer, an
 * engagement or progress, and neither is scored: listening plays the part in the tutor's voice; practice shows what the listener
 * picked up and nothing else. `audio` and `capture` are the browser's unless a test supplies its own.
 */
export function ReadingControls({
  instanceId,
  passageId,
  segment,
  text,
  audio,
  capture,
  canCapture = canCaptureAudio,
}: {
  instanceId: string | null;
  passageId: string;
  segment: number;
  /** The part's running text: practice shows its first sentences. */
  text: string;
  audio?: AudioDeps;
  capture?: ReadAloudDeps;
  canCapture?: () => boolean;
}) {
  const listen = useSegmentAudio(instanceId, passageId, segment, audio);
  const practice = useReadAloud(instanceId, passageId, segment, capture);
  const [practising, setPractising] = useState(false);
  const excerpt = practiceExcerpt(text);
  const phase = practice.state.phase;
  const busy = phase === "starting" || phase === "listening" || phase === "finishing";

  const leave = () => {
    practice.cancel();
    setPractising(false);
  };

  return (
    <div className="mt-2 space-y-2" data-no-pan>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Listen to part ${segment}`}>
        {listen.phase === "playing" ? (
          // eslint-disable-next-line no-restricted-syntax -- a playback control.
          <button type="button" className={BUTTON} onClick={listen.pause} aria-label="Pause listening">
            <Pause size={14} aria-hidden /> Pause
          </button>
        ) : (
          // eslint-disable-next-line no-restricted-syntax -- a playback control.
          <button type="button" className={BUTTON} onClick={listen.play} disabled={listen.phase === "loading" || !instanceId}>
            <Headphones size={14} aria-hidden /> {listen.phase === "paused" ? "Keep listening" : listen.phase === "loading" ? "Getting it ready…" : "Listen"}
          </button>
        )}
        {/* eslint-disable-next-line no-restricted-syntax -- a playback control. */}
        <button type="button" className={BUTTON} onClick={listen.stop} disabled={listen.phase === "idle"} aria-label="Stop listening">
          <Square size={12} aria-hidden /> Stop
        </button>
        {/* eslint-disable-next-line no-restricted-syntax -- a playback control. */}
        <button type="button" className={BUTTON} onClick={listen.replay} disabled={listen.phase === "loading" || !instanceId} aria-label="Listen again from the start">
          <RotateCcw size={13} aria-hidden /> Again
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-[13px] text-[var(--ls-ink-mid)]">
        {listen.problem}
      </p>

      {canCapture() && excerpt && (
        <div>
          {!practising ? (
            // eslint-disable-next-line no-restricted-syntax -- opens the optional practice.
            <button type="button" className={BUTTON} onClick={() => setPractising(true)}>
              <Mic size={14} aria-hidden /> Give reading a try
            </button>
          ) : (
            <section aria-label="Reading practice" className="rounded-xl border border-[var(--ls-border)] bg-white px-3 py-3">
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ls-ink-mid)]">Read this out loud</p>
              <p lang="und" className="mb-3 text-[16px] leading-[1.6] text-[var(--ls-ink)]">
                {phase === "done" && !practice.state.problem ? <Marked excerpt={excerpt} heard={practice.state.heard} /> : excerpt}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(phase === "idle" || phase === "failed" || phase === "done") && (
                  // eslint-disable-next-line no-restricted-syntax -- starts the practice.
                  <button type="button" className={BUTTON} onClick={practice.start}>
                    <Mic size={14} aria-hidden /> {phase === "idle" ? "Start reading" : "Try again"}
                  </button>
                )}
                {phase === "listening" && (
                  // eslint-disable-next-line no-restricted-syntax -- ends the practice.
                  <button type="button" className={BUTTON} onClick={practice.finish}>
                    <Square size={12} aria-hidden /> I&apos;m done
                  </button>
                )}
                {/* eslint-disable-next-line no-restricted-syntax -- leaves the practice. */}
                <button type="button" className={BUTTON} onClick={leave}>
                  {busy ? "Cancel" : "Close"}
                </button>
              </div>
              <p role="status" aria-live="polite" className="mt-2 text-[13px] text-[var(--ls-ink-mid)]">
                {phase === "starting" && "Getting ready…"}
                {phase === "listening" && "Listening. Read the lines above, then tap “I’m done”."}
                {phase === "finishing" && "One moment…"}
                {practice.state.problem}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** The excerpt with each word marked as picked up or not (words, never colour alone), and the plain-language result. */
function Marked({ excerpt, heard }: { excerpt: string; heard: string }) {
  const result = alignWords(excerpt, heard);
  const feedback = feedbackFor(result);
  return (
    <>
      {result.words.map((mark, index) => (
        <span key={index} data-heard={mark.heard} className={mark.heard ? "" : "underline decoration-dotted underline-offset-4"}>
          {mark.word}
          {!mark.heard && <span className="sr-only"> (not picked up)</span>}{" "}
        </span>
      ))}
      <span className="mt-2 block text-[14px] text-[var(--ls-ink)]">
        {feedback.headline}
        {feedback.missed.length > 0 && <strong className="block">{feedback.missed.join(", ")}</strong>}
        <span className="mt-1 block text-[12px] text-[var(--ls-ink-mid)]">{feedback.note}</span>
      </span>
    </>
  );
}
