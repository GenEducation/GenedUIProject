"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, RotateCcw } from "lucide-react";
import { animate, type AnimationPlaybackControls } from "framer-motion";
import { useLessonStore } from "../useLessonStore";
import { ChatTurn } from "./ChatTurn";
import { ChatInput } from "./ChatInput";
import { VoiceWaveform } from "./VoiceWaveform";
import { lessonVoiceEnabled } from "./LessonRail";
import { useVoiceLanguages } from "../voice/useVoiceLanguages";
import { useVoiceSession, type VoiceSession } from "../voice/useVoiceSession";

const VOICE_UNAVAILABLE: VoiceSession = {
  phase: "offline",
  heard: "",
  level: 0,
  error: "Voice lessons aren't available yet. You can keep going in the chat.",
  muted: false,
  pushToTalk: false,
  held: false,
  language: null,
};

/** Within this many px of the bottom counts as "reading the latest". */
const STICK_PX = 80;

/**
 * The right column: the conversation with the tutor. Follows the newest text
 * while the learner is at the bottom; once they scroll up to reread, it stays
 * put and offers a jump back down.
 */
export function ChatPanel({
  onShowFigure,
  subject = null,
}: {
  onShowFigure: (figureGroupId: string) => void;
  /** The lesson's subject, so dictation can start in its language. */
  subject?: string | null;
}) {
  const turns = useLessonStore((s) => s.turns);
  const status = useLessonStore((s) => s.status);
  const canTalk = useLessonStore((s) => s.instance?.state === "active" && Boolean(s.instance.active_node));
  const send = useLessonStore((s) => s.send);
  const stop = useLessonStore((s) => s.stop);
  const retry = useLessonStore((s) => s.retry);
  const setVoiceMode = useLessonStore((s) => s.setVoiceMode);
  const voiceMode = useLessonStore((s) => s.voiceMode);
  const stepTitles = useLessonStore((s) => s.stepTitles);
  // Moving to the next step: what is typed now would wait for it, so the box says the lesson is getting ready instead.
  const stepPending = useLessonStore((s) => s.stepPending);
  const stepLoadError = useLessonStore((s) => s.stepLoadError);
  const reloadStep = useLessonStore((s) => s.reloadStep);
  const voiceAvailable = lessonVoiceEnabled();
  // Voice replies land in the same transcript; only the input area changes.
  const wantsVoice = voiceMode && voiceAvailable && status === "ready" && canTalk;
  // The languages come from the backend; the session opens once one is chosen, and a new choice restarts it.
  const { languages, language, setLanguage, error: languageError } = useVoiceLanguages(wantsVoice);
  const live = useVoiceSession(wantsVoice && !languageError, language);
  // With voice switched off for this build, voice mode still opens and says so, rather than the button doing nothing.
  const voice = !voiceAvailable ? VOICE_UNAVAILABLE : languageError ? { ...VOICE_UNAVAILABLE, error: languageError } : live;
  const replying = turns.some((t) => t.status === "streaming");

  const listRef = useRef<HTMLOListElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const glide = useRef<AnimationPlaybackControls | null>(null);
  const scrollToEnd = useCallback((smooth: boolean) => {
    const list = listRef.current;
    if (!list) return;
    glide.current?.stop();
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!smooth || reduced) {
      list.scrollTop = list.scrollHeight;
      return;
    }
    // The same no-bounce spring as the board's camera; it chases the end if text is still streaming in.
    glide.current = animate(list.scrollTop, list.scrollHeight - list.clientHeight, {
      type: "spring",
      duration: 0.8,
      bounce: 0,
      onUpdate: (top) => (list.scrollTop = top),
      onComplete: () => {
        glide.current = null;
        list.scrollTop = list.scrollHeight;
      },
    });
  }, []);
  // The learner's own scrolling takes over from a glide.
  const stopGlide = () => {
    glide.current?.stop();
    glide.current = null;
  };
  useEffect(() => stopGlide, []);

  // Follow new turns and streamed text, unless the learner has scrolled up.
  const lastTurn = turns.at(-1);
  const contentKey = `${turns.length}:${lastTurn?.lastSeq ?? 0}:${lastTurn?.status ?? ""}:${stepLoadError ?? ""}`;
  useEffect(() => {
    if (atBottom && !glide.current) scrollToEnd(false);
  }, [contentKey, atBottom, scrollToEnd]);

  const onScroll = () => {
    const list = listRef.current;
    if (list) setAtBottom(list.scrollHeight - list.scrollTop - list.clientHeight < STICK_PX);
  };

  const onSend = (text: string) => {
    setAtBottom(true);
    void send(text);
  };

  return (
    <section aria-label="Chat with your tutor" className="lesson-panel font-indic relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* The transcript and its "Latest" pill share a box, so the pill sits just above whichever input is
          below it (the text box or the taller voice panel) instead of at a fixed height that only fits one. */}
      <div className="relative flex flex-1 min-h-0 flex-col">
        <ol
          ref={listRef}
          onScroll={onScroll}
          onWheel={stopGlide}
          onTouchStart={stopGlide}
          aria-live="polite"
          aria-busy={replying}
          className="flex flex-1 min-h-0 flex-col gap-5 overflow-y-auto px-4 py-5"
        >
          {status === "loading" && turns.length === 0 && (
            <li aria-hidden className="flex flex-col gap-3">
              <div className="h-14 w-3/4 animate-pulse rounded-2xl bg-[var(--ls-soft)]" />
              <div className="h-10 w-1/2 self-end animate-pulse rounded-2xl bg-[var(--ls-soft)]" />
            </li>
          )}
          {turns.map((turn, i) => {
            const before = turns[i - 1];
            // Where the lesson moved to its next step: a quiet rule naming the new step, so what came before reads as finished.
            const boundary = before?.nodeId && turn.nodeId && before.nodeId !== turn.nodeId;
            return (
              <Fragment key={turn.turnId}>
                {boundary && (
                  <li role="separator" aria-label={`Next step: ${stepTitles[turn.nodeId!] ?? "a new step"}`} className="flex items-center gap-3 py-1">
                    <span aria-hidden className="h-px flex-1 bg-[var(--ls-border)]" />
                    <span className="max-w-[70%] truncate text-[12px] font-semibold text-[var(--ls-ink-faint)]">
                      {stepTitles[turn.nodeId!] ?? "Next step"}
                    </span>
                    <span aria-hidden className="h-px flex-1 bg-[var(--ls-border)]" />
                  </li>
                )}
                <ChatTurn turn={turn} onShowFigure={onShowFigure} onRetry={(id) => void retry(id)} />
              </Fragment>
            );
          })}
          {stepLoadError && (
            <li role="alert" className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--ls-ink-mid)]">
              <span>This step couldn&apos;t load.</span>
              {/* eslint-disable-next-line no-restricted-syntax -- an inline text action in the transcript. */}
              <button
                type="button"
                onClick={() => void reloadStep()}
                className="inline-flex items-center gap-1 font-semibold text-[var(--ls-primary)] hover:underline"
              >
                <RotateCcw size={13} aria-hidden /> Try again
              </button>
            </li>
          )}
        </ol>

        {!atBottom && (
          // eslint-disable-next-line no-restricted-syntax -- a floating pill over the transcript.
          <button
            type="button"
            onClick={() => scrollToEnd(true)}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--ls-ink)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-lg"
          >
            <ArrowDown size={13} aria-hidden /> Latest
          </button>
        )}
      </div>

      {voiceMode ? (
        <VoiceWaveform session={voice} onEnd={() => setVoiceMode(false)} languages={languages} onLanguage={setLanguage} />
      ) : (
      <ChatInput
        replying={replying}
        disabled={status !== "ready" || !canTalk || stepPending}
        onSend={onSend}
        onStop={() => void stop()}
        subject={subject}
      />
      )}
    </section>
  );
}
