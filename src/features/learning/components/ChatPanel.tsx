"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { animate, type AnimationPlaybackControls } from "framer-motion";
import { useLessonStore } from "../useLessonStore";
import { ChatTurn } from "./ChatTurn";
import { ChatInput } from "./ChatInput";
import { VoiceWaveform } from "./VoiceWaveform";
import { lessonVoiceEnabled } from "./LessonRail";
import { useVoiceSession, type VoiceSession } from "../voice/useVoiceSession";

const VOICE_UNAVAILABLE: VoiceSession = {
  phase: "offline",
  heard: "",
  level: 0,
  error: "Voice lessons aren't available yet. You can keep going in the chat.",
  muted: false,
};

/** Within this many px of the bottom counts as "reading the latest". */
const STICK_PX = 80;

/**
 * The right column: the conversation with the tutor. Follows the newest text
 * while the learner is at the bottom; once they scroll up to reread, it stays
 * put and offers a jump back down.
 */
export function ChatPanel({ onShowFigure }: { onShowFigure: (figureGroupId: string) => void }) {
  const turns = useLessonStore((s) => s.turns);
  const status = useLessonStore((s) => s.status);
  const canTalk = useLessonStore((s) => s.instance?.state === "active" && Boolean(s.instance.active_node));
  const send = useLessonStore((s) => s.send);
  const stop = useLessonStore((s) => s.stop);
  const retry = useLessonStore((s) => s.retry);
  const setVoiceMode = useLessonStore((s) => s.setVoiceMode);
  const voiceMode = useLessonStore((s) => s.voiceMode);
  const voiceAvailable = lessonVoiceEnabled();
  // Voice replies land in the same transcript; only the input area changes.
  const live = useVoiceSession(voiceMode && voiceAvailable && status === "ready" && canTalk);
  // With voice switched off for this build, voice mode still opens and says so, rather than the button doing nothing.
  const voice = voiceAvailable ? live : VOICE_UNAVAILABLE;
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
  const contentKey = `${turns.length}:${lastTurn?.lastSeq ?? 0}:${lastTurn?.status ?? ""}`;
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
    <section aria-label="Chat with your tutor" className="lesson-panel relative flex h-full min-h-0 flex-col overflow-hidden">
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
        {turns.map((turn) => (
          <ChatTurn key={turn.turnId} turn={turn} onShowFigure={onShowFigure} onRetry={(id) => void retry(id)} />
        ))}
      </ol>

      {!atBottom && (
        // eslint-disable-next-line no-restricted-syntax -- a floating pill over the transcript.
        <button
          type="button"
          onClick={() => scrollToEnd(true)}
          className="absolute bottom-[104px] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--ls-ink)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-lg"
        >
          <ArrowDown size={13} aria-hidden /> Latest
        </button>
      )}

      {voiceMode ? (
        <VoiceWaveform session={voice} onEnd={() => setVoiceMode(false)} />
      ) : (
      <ChatInput
        replying={replying}
        disabled={status !== "ready" || !canTalk}
        onSend={onSend}
        onStop={() => void stop()}
      />
      )}
    </section>
  );
}
