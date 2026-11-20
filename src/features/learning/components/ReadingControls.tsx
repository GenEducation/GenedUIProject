"use client";

import { useEffect, useState } from "react";
import { Headphones, Mic, Pause, RotateCcw, Square } from "lucide-react";
import { ReadingPractice } from "./ReadingPractice";
import { practiceExcerpt } from "../reading/alignWords";
import { canCaptureAudio, type ReadAloudDeps } from "../reading/readAloud";
import { useSegmentAudio, type AudioDeps } from "../reading/useSegmentAudio";
import { listenButtons } from "../reading/bookActions";

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
  audible = true,
  voice = false,
  onPractice,
  audio,
  capture,
  canCapture = canCaptureAudio,
}: {
  instanceId: string | null;
  passageId: string;
  segment: number;
  /** The part's running text: practice shows its first sentences. */
  text: string;
  /** The part's language is known, so it can be heard and practised. */
  audible?: boolean;
  /** A voice session is on: the tutor's voice owns the speaker, so this group steps aside. */
  voice?: boolean;
  /** The panel takes practice over (its own view); without it, practice opens here. */
  onPractice?: () => void;
  audio?: AudioDeps;
  capture?: ReadAloudDeps;
  canCapture?: () => boolean;
}) {
  const listen = useSegmentAudio(instanceId, passageId, segment, audio);
  const [practising, setPractising] = useState(false);
  const excerpt = practiceExcerpt(text);
  const buttons = listenButtons({
    audible, voice, phase: listen.phase, canCapture: canCapture(), hasExcerpt: !!excerpt, practising,
  });
  const { stop } = listen;

  // The tutor's voice starting takes the speaker: the part stops playing.
  useEffect(() => {
    if (voice) stop();
  }, [voice, stop]);

  const openPractice = () => {
    listen.stop();
    if (onPractice) onPractice();
    else setPractising(true);
  };

  if (!buttons.shown) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-no-pan>
      {buttons.main && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Listen to part ${segment}`}>
          {buttons.main.action === "pause" ? (
            // eslint-disable-next-line no-restricted-syntax -- a playback control.
            <button type="button" className={BUTTON} onClick={listen.pause} aria-label="Pause listening">
              <Pause size={14} aria-hidden /> {buttons.main.label}
            </button>
          ) : (
            // eslint-disable-next-line no-restricted-syntax -- a playback control.
            <button type="button" className={BUTTON} onClick={listen.play} disabled={buttons.main.disabled || !instanceId}>
              <Headphones size={14} aria-hidden /> {buttons.main.label}
            </button>
          )}
          {buttons.stop && (
            // eslint-disable-next-line no-restricted-syntax -- a playback control.
            <button type="button" className={BUTTON} onClick={listen.stop} aria-label="Stop listening">
              <Square size={12} aria-hidden /> Stop
            </button>
          )}
          {buttons.again && (
            // eslint-disable-next-line no-restricted-syntax -- a playback control.
            <button type="button" className={BUTTON} onClick={listen.replay} disabled={!instanceId} aria-label="Listen again from the start">
              <RotateCcw size={13} aria-hidden /> Again
            </button>
          )}
        </div>
      )}
      {buttons.practice && (
        // eslint-disable-next-line no-restricted-syntax -- opens the optional practice.
        <button type="button" className={BUTTON} onClick={openPractice}>
          <Mic size={14} aria-hidden /> Give reading a try
        </button>
      )}
      <p role="status" aria-live="polite" className="basis-full text-[13px] text-[var(--ls-ink-mid)] empty:hidden">
        {listen.problem}
      </p>

      {practising && excerpt && (
        <div className="flex basis-full flex-col rounded-xl border border-[var(--ls-border)] bg-white">
          <ReadingPractice instanceId={instanceId} passageId={passageId} segment={segment} excerpt={excerpt} capture={capture} onClose={() => setPractising(false)} />
        </div>
      )}
    </div>
  );
}
