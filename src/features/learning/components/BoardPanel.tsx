"use client";

import { useRef } from "react";
import { Maximize2, MessageSquareText, Mic } from "lucide-react";
import { useLessonStore } from "../useLessonStore";
import { BoardFigure } from "./BoardFigure";
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
 * full screen across the top; on the sheet, the step's title in the board's
 * hand, the figure in focus and what the learner can do now; the filmstrip and
 * the quick chips at the foot. The tutor's words live in the chat, not here.
 */
export function BoardPanel() {
  const panelRef = useRef<HTMLElement>(null);
  const node = useLessonStore((s) => s.instance?.active_node ?? null);
  const title = useLessonStore((s) => s.payload?.node.title ?? s.instance?.active_node?.title ?? null);
  const focused = useLessonStore((s) => s.focusedFigureId);
  const finished = useLessonStore((s) => s.instance?.state === "completed");
  const voiceMode = useLessonStore((s) => s.voiceMode);
  const setVoiceMode = useLessonStore((s) => s.setVoiceMode);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void panelRef.current?.requestFullscreen?.();
  };

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
    <section ref={panelRef} aria-label="Whiteboard" className="lesson-panel flex h-full min-h-0 flex-col overflow-hidden">
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
        {/* eslint-disable-next-line no-restricted-syntax -- a round icon tool in the board's toolbar. */}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Full screen whiteboard"
          className="grid h-10 w-10 place-items-center rounded-full text-[var(--ls-ink-mid)] transition-colors hover:bg-[var(--ls-primary-soft)] hover:text-[var(--ls-primary)]"
        >
          <Maximize2 size={19} />
        </button>
      </div>

      <div className="mx-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[var(--ls-border)]">
        <div className="lesson-board relative flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto flex max-w-[880px] flex-col gap-6 p-5 sm:p-8">
            {finished && <LessonSummary />}

            {title && !finished && (
              <h1 className="lesson-hand lesson-underline self-start text-[30px] leading-tight text-[var(--ls-primary)]">{title}</h1>
            )}

            {focused ? (
              <div className="rounded-[22px] bg-white/80 p-4 shadow-[var(--ls-shadow)] sm:p-6">
                <BoardFigure figureGroupId={focused} />
              </div>
            ) : finished ? null : (
              <EmptyBoard />
            )}

            <StepCard />
          </div>
        </div>
        <Filmstrip />
      </div>

      <QuickActions />
    </section>
  );
}
