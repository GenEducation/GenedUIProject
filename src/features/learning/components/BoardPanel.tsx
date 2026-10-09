"use client";

import { useRef } from "react";
import { Maximize2 } from "lucide-react";
import { StudentBlobatar } from "@/features/student/components/StudentBlobatar";
import { useLessonStore } from "../useLessonStore";
import { replyText } from "../transcript";
import { BoardFigure } from "./BoardFigure";
import { Filmstrip } from "./Filmstrip";
import { LessonMarkdown } from "./LessonMarkdown";
import { StepCard } from "./StepCard";
import { LessonSummary } from "./LessonSummary";

const NODE_TYPE_LABEL = { teach: "Learn", practice: "Practice", assess: "Check" } as const;

/**
 * The centre column and the screen's hero: the whiteboard. From the top: what
 * the tutor just said, the figure in focus, then what the learner can do now
 * (a check, a choice, moving on). The filmstrip runs along the bottom.
 */
export function BoardPanel() {
  const panelRef = useRef<HTMLElement>(null);
  const node = useLessonStore((s) => s.instance?.active_node ?? null);
  const title = useLessonStore((s) => s.payload?.node.title ?? s.instance?.active_node?.title ?? null);
  const focused = useLessonStore((s) => s.focusedFigureId);
  const finished = useLessonStore((s) => s.instance?.state === "completed");
  // The tutor's most recent words, so the board explains what it shows.
  const latest = useLessonStore((s) => {
    for (let i = s.turns.length - 1; i >= 0; i -= 1) {
      const text = replyText(s.turns[i]);
      if (text) return text;
    }
    return null;
  });

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void panelRef.current?.requestFullscreen?.();
  };

  return (
    <section ref={panelRef} aria-label="Whiteboard" className="lesson-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--ls-border)] px-5 py-3">
        <h1 className="min-w-0 flex-1 truncate text-[16px] font-bold">{title ?? "Whiteboard"}</h1>
        {node && (
          <span className="shrink-0 rounded-full bg-[var(--ls-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ls-primary)]">
            {NODE_TYPE_LABEL[node.type]}
          </span>
        )}
        {/* eslint-disable-next-line no-restricted-syntax -- a round icon tool in the board's toolbar. */}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Full screen whiteboard"
          className="grid h-9 w-9 place-items-center rounded-full text-[var(--ls-ink-mid)] hover:bg-[var(--ls-primary-soft)] hover:text-[var(--ls-primary)]"
        >
          <Maximize2 size={17} />
        </button>
      </div>

      <div className="lesson-board relative flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto flex max-w-[860px] flex-col gap-6 p-5 sm:p-8">
          {finished && <LessonSummary />}

          {latest && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-full bg-[var(--ls-soft)] p-1">
                <StudentBlobatar size={40} decorative />
              </div>
              <div className="relative min-w-0 rounded-[20px] rounded-tl-md bg-[var(--ls-soft)] px-4 py-3 text-[15px] leading-relaxed">
                <div className="line-clamp-4">
                  <LessonMarkdown text={latest} />
                </div>
              </div>
            </div>
          )}

          {finished && !focused ? null : focused ? (
            <div className="rounded-[20px] bg-white/70 p-4 sm:p-6">
              <BoardFigure figureGroupId={focused} />
            </div>
          ) : (
            <p className="lesson-hand py-10 text-center text-[22px] text-[var(--ls-ink-faint)]">Your tutor will draw here.</p>
          )}

          <StepCard />
        </div>
      </div>

      <Filmstrip />
    </section>
  );
}
