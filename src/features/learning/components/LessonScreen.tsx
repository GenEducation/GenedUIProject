"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { useLessonStore } from "../useLessonStore";
import { LessonHeader } from "./LessonHeader";
import { LessonRail } from "./LessonRail";
import { BoardPanel } from "./BoardPanel";
import { ChatPanel } from "./ChatPanel";

type Pane = "board" | "chat" | "progress";

const PANES: Array<{ key: Pane; label: string }> = [
  { key: "board", label: "Whiteboard" },
  { key: "chat", label: "Chat" },
  { key: "progress", label: "Progress" },
];

/**
 * `/student/lesson/{id}`: one lesson, chat and voice in one place. Desktop is
 * three columns (progress rail · whiteboard · chat); below `lg` the columns
 * become tabs, the whiteboard first. Full-focus: no app sidebar, the header
 * leads back out.
 */
export function LessonScreen({ instanceId }: { instanceId: string }) {
  const load = useLessonStore((s) => s.load);
  const reset = useLessonStore((s) => s.reset);
  const status = useLessonStore((s) => s.status);
  const error = useLessonStore((s) => s.error);
  // The tile that opened this lesson in this tab, if any (survives a reload via sessionStorage).
  const launched = useLessonLaunch((s) => (s.instanceId === instanceId ? s : null));
  const [pane, setPane] = useState<Pane>("board");
  const focusFigure = useLessonStore((s) => s.focusFigure);
  // A figure tapped in the chat opens on the whiteboard; on mobile, switch to that tab.
  const showFigure = useCallback((figureGroupId: string) => {
    focusFigure(figureGroupId);
    setPane("board");
  }, [focusFigure]);

  useEffect(() => {
    void load(instanceId);
    return () => reset();
  }, [instanceId, load, reset]);

  const subject = launched?.subject ?? null;
  const exitHref = subject ? `/student/subjects/${encodeURIComponent(subject)}` : "/student";
  // Each column shows on desktop; on mobile only the chosen tab's does.
  const paneClass = (key: Pane) => `${pane === key ? "flex" : "hidden"} lg:flex min-h-0 flex-col`;

  return (
    <div className="lesson-theme flex h-dvh flex-col overflow-hidden">
      <LessonHeader subject={subject} chapterTitle={launched?.chapter?.title ?? null} exitHref={exitHref} />

      {status === "error" ? (
        <div role="alert" className="m-4 lesson-panel mx-auto mt-16 max-w-md p-8 text-center">
          <p className="text-[17px] font-bold">This lesson couldn&apos;t be opened.</p>
          <p className="mt-2 text-[14px] text-[var(--ls-ink-mid)]">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={() => void load(instanceId)}>Try again</Button>
            <Link href={exitHref} className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-[var(--ls-primary)] hover:bg-[var(--ls-primary-soft)]">
              Back to chapters
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Lesson panels" className="mx-4 mb-3 flex gap-1 rounded-full bg-[var(--ls-soft)] p-1 lg:hidden">
            {PANES.map(({ key, label }) => (
              // eslint-disable-next-line no-restricted-syntax -- a tab in a segmented tablist, not an action button.
              <button
                key={key}
                type="button"
                role="tab"
                id={`lesson-tab-${key}`}
                aria-selected={pane === key}
                aria-controls={`lesson-pane-${key}`}
                onClick={() => setPane(key)}
                className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors ${
                  pane === key ? "bg-white text-[var(--ls-primary)] shadow-sm" : "text-[var(--ls-ink-mid)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <main
            aria-busy={status === "loading"}
            className="grid flex-1 min-h-0 gap-4 px-4 pb-4 lg:grid-cols-[244px_minmax(0,1fr)_minmax(300px,368px)] xl:grid-cols-[264px_minmax(0,1fr)_minmax(340px,400px)]"
          >
            <div id="lesson-pane-progress" role="tabpanel" aria-labelledby="lesson-tab-progress" className={`${paneClass("progress")} lesson-rise`}>
              <LessonRail />
            </div>
            <div id="lesson-pane-board" role="tabpanel" aria-labelledby="lesson-tab-board" className={`${paneClass("board")} lesson-rise`} style={{ "--rise-delay": "90ms" } as React.CSSProperties}>
              <BoardPanel />
            </div>
            <div id="lesson-pane-chat" role="tabpanel" aria-labelledby="lesson-tab-chat" className={`${paneClass("chat")} lesson-rise`} style={{ "--rise-delay": "180ms" } as React.CSSProperties}>
              <ChatPanel onShowFigure={showFigure} />
            </div>
          </main>
        </>
      )}
    </div>
  );
}
