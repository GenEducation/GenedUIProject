"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquareText, Mic } from "lucide-react";
import { useLessonStore } from "../useLessonStore";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import type { Insets } from "../board/geometry";
import { Filmstrip } from "./Filmstrip";
import { StepCard } from "./StepCard";
import { LessonSummary } from "./LessonSummary";
import { QuickActions } from "./QuickActions";

const NODE_TYPE_LABEL = { teach: "Learn", practice: "Practice", assess: "Check" } as const;

/** The board before the tutor has drawn anything: a sketched frame waiting for it. */
function EmptyBoard() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <svg viewBox="0 0 160 110" aria-hidden className="h-28 w-auto">
        <rect x="8" y="10" width="144" height="88" rx="14" fill="none" stroke="#CFD9D3" strokeWidth="2.5" strokeDasharray="7 7" />
        <path d="M40 74 L64 44 L84 64 L98 50 L122 74 Z" fill="#DCEBE7" stroke="#075E63" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="112" cy="36" r="7" fill="#D9F279" stroke="#B8D63F" strokeWidth="1.5" />
        <path d="M128 18 C129 22 130 23 134 24 C130 25 129 26 128 30 C127 26 126 25 122 24 C126 23 127 22 128 18 Z" fill="#B8D63F" />
      </svg>
      <p className="lesson-hand text-[22px] text-[var(--ls-ink-mid)]">Your tutor will draw here.</p>
    </div>
  );
}

/**
 * The centre column and the screen's hero: the whiteboard. A mode switch and
 * full screen across the top; below, an endless canvas (pan, zoom) holding
 * every figure shown, with the step's title, the question card and the
 * filmstrip floating over it; the quick chips at the foot. The tutor's words
 * live in the chat, not here.
 */
export function BoardPanel() {
  const node = useLessonStore((s) => s.instance?.active_node ?? null);
  const title = useLessonStore((s) => s.payload?.node.title ?? s.instance?.active_node?.title ?? null);
  const finished = useLessonStore((s) => s.instance?.state === "completed");
  const hasFilmstrip = useLessonStore((s) => s.presentedFigureIds.length > 0);
  const voiceMode = useLessonStore((s) => s.voiceMode);
  const setVoiceMode = useLessonStore((s) => s.setVoiceMode);

  const stepRef = useRef<HTMLDivElement>(null);
  // The canvas frames figures in what the overlays leave clear: the title band, the docked question card, the filmstrip.
  const insets = useCallback((): Insets => {
    const step = stepRef.current;
    const stepWidth = step && step.offsetWidth > 0 && step.childElementCount > 0 ? step.offsetWidth + 24 : 0;
    return { top: 72, right: stepWidth, bottom: 128, left: 0 };
  }, []);

  // When the docked card appears, goes or changes width, re-frame the visual in the space it leaves.
  const [stepWidth, setStepWidth] = useState(0);
  useEffect(() => {
    const el = stepRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setStepWidth(el.childElementCount > 0 ? el.offsetWidth : 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const modeButton = (on: boolean, label: string, Icon: typeof Mic, onClick: () => void, disabled = false) => (
    // eslint-disable-next-line no-restricted-syntax -- a segment of the mode switch.
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      title={disabled ? "Voice lessons are coming soon" : undefined}
      className={`lesson-display flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-[15px] font-medium transition-[background,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? "bg-[var(--ls-primary)] text-white shadow-[var(--ls-shadow-pop)]" : "text-[var(--ls-ink-mid)] hover:text-[var(--ls-ink)]"
      }`}
    >
      {/* The selected mode's icon sits on citron, the other's on white. */}
      <span
        className={`grid h-8 w-8 place-items-center rounded-full ${
          on ? "bg-[var(--ls-accent)] text-[var(--ls-primary)]" : "bg-white text-[var(--ls-primary)] shadow-sm"
        }`}
      >
        <Icon size={16} strokeWidth={2.3} aria-hidden />
      </span>
      {label}
    </button>
  );

  return (
    <section aria-label="Whiteboard" className="lesson-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <div className="flex rounded-full bg-[var(--ls-sage)] p-1">
          {modeButton(!voiceMode, "Chat", MessageSquareText, () => setVoiceMode(false))}
          {modeButton(voiceMode, "Voice", Mic, () => setVoiceMode(true))}
        </div>
        <span className="flex-1" />
        {node && (
          <span className="lesson-display hidden rounded-full bg-[var(--ls-accent)] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ls-primary)] sm:inline">
            {NODE_TYPE_LABEL[node.type]}
          </span>
        )}
      </div>

      <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-[22px] border border-[var(--ls-border)]">
        {hasFilmstrip ? (
          // Every figure shown this session stays on an endless board; the camera glides to each new one.
          <WhiteboardCanvas insets={insets} refitKey={stepWidth} />
        ) : (
          <div className="lesson-board absolute inset-0 grid place-items-center">{!finished && <EmptyBoard />}</div>
        )}

        {title && !finished && (
          <h1
            data-no-pan
            className="lesson-hand lesson-underline pointer-events-none absolute left-6 top-4 z-10 max-w-[60%] truncate text-[28px] leading-tight text-[var(--ls-primary)]"
          >
            {title}
          </h1>
        )}

        {/* What the learner can do now (a check, a choice, moving on), docked on the right above the canvas. */}
        <div
          ref={stepRef}
          data-no-pan
          className="absolute bottom-32 right-4 top-16 z-10 flex w-[min(380px,46%)] flex-col overflow-y-auto overscroll-contain pb-2 pr-1 empty:hidden [&:not(:has(*))]:hidden"
        >
          <StepCard />
        </div>

        {finished && (
          <div data-no-pan className="absolute inset-0 z-20 overflow-y-auto bg-[var(--ls-card-warm)]/85 p-5 backdrop-blur-[2px] sm:p-8">
            <div className="mx-auto max-w-[680px]">
              <LessonSummary />
            </div>
          </div>
        )}

        <Filmstrip />
      </div>

      <QuickActions />
    </section>
  );
}
