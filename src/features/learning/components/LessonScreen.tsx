"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { useLessonStore } from "../useLessonStore";
import { LessonHeader } from "./LessonHeader";
import { LessonRail } from "./LessonRail";
import { BoardPanel } from "./BoardPanel";
import { ChatPanel } from "./ChatPanel";
import { RailDrawer } from "./RailDrawer";
import { ResizeHandle } from "./ResizeHandle";
import { RotatePrompt } from "./RotatePrompt";
import { CHAT, RAIL, fitWidths, gridTemplate, useLessonMode, useLessonWidths } from "./layout";

type Pane = "board" | "chat" | "progress";

const PANES: Array<{ key: Pane; label: string }> = [
  { key: "board", label: "Whiteboard" },
  { key: "chat", label: "Chat" },
  { key: "progress", label: "Progress" },
];

/** "Continue in portrait" lasts for this browser tab. */
const PORTRAIT_OK_KEY = "gened.lesson.portraitOk";

/** Matches the CSS grid gutter (px-4) so measured width = usable width. */
const SIDE_PADDING = 32;

/**
 * `/student/lesson/{id}`: one lesson, chat and voice in one place.
 *
 * - Wide (≥ 1024px): progress rail · whiteboard · chat, with draggable
 *   dividers the student can move (remembered on this device). As the window
 *   narrows the rail gives way first.
 * - Compact (< 1024px, incl. a phone held sideways): whiteboard · chat; the
 *   rail opens as a drawer from the header.
 * - Phone held upright: a "turn your phone sideways" prompt, with the old
 *   one-panel tabs as the fallback.
 *
 * Full-focus: no app sidebar, the header leads back out.
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

  const mode = useLessonMode();
  const [portraitOk, setPortraitOk] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { widths: pref, setWidths, save, reset: resetWidth } = useLessonWidths();

  // Width actually available to the columns, so preferred widths can be fitted.
  const mainRef = useRef<HTMLElement>(null);
  const [containerW, setContainerW] = useState(0);
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setContainerW(el.clientWidth - SIDE_PADDING);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, status]);

  useEffect(() => {
    try {
      setPortraitOk(window.sessionStorage.getItem(PORTRAIT_OK_KEY) === "1");
    } catch {
      /* storage blocked: the prompt just shows each time */
    }
  }, []);

  // Leaving compact mode closes the drawer, so it isn't stuck open on rotate.
  useEffect(() => {
    if (mode !== "compact") setDrawerOpen(false);
  }, [mode]);

  // A figure tapped in the chat opens on the whiteboard; in tab mode, switch to that tab.
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

  const tabs = mode === "portrait" && portraitOk;
  const columns = mode !== "portrait";
  const fitted = columns && containerW > 0 ? fitWidths(mode, containerW, pref) : null;
  const template = fitted && mode !== "portrait" ? gridTemplate(mode, fitted) : undefined;

  // In tab mode only the chosen tab's panel shows; in column mode, all that belong.
  const paneClass = (key: Pane) => (tabs ? (pane === key ? "flex" : "hidden") : "flex") + " min-h-0 flex-col";

  // Persist from inside the state update so a key press saves the width it just set.
  const commitWidths = () => setWidths((w) => { save(w); return w; });

  const continueInPortrait = () => {
    setPortraitOk(true);
    try {
      window.sessionStorage.setItem(PORTRAIT_OK_KEY, "1");
    } catch {
      /* fine: it just won't survive a reload */
    }
  };

  return (
    <div className="lesson-theme flex h-dvh flex-col overflow-hidden">
      <LessonHeader
        subject={subject}
        chapterTitle={launched?.chapter?.title ?? null}
        exitHref={exitHref}
        gridTemplate={mode === "wide" ? template : undefined}
        onOpenSteps={mode === "compact" ? () => setDrawerOpen(true) : undefined}
      />

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
      ) : mode === "portrait" && !portraitOk ? (
        <RotatePrompt onContinue={continueInPortrait} />
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Lesson panels"
            className={`mx-4 mb-3 gap-1 rounded-full bg-[var(--ls-soft)] p-1 ${tabs ? "flex" : "hidden"}`}
          >
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
            ref={mainRef}
            aria-busy={status === "loading"}
            className={`grid flex-1 min-h-0 px-4 pb-4 ${tabs ? "gap-4" : ""} ${
              // Until measured, a sensible static template so the first paint isn't one column.
              !tabs && !template ? (mode === "wide" ? "grid-cols-[264px_16px_minmax(0,1fr)_16px_380px]" : "grid-cols-[minmax(0,1fr)_16px_380px]") : ""
            }`}
            style={template ? { gridTemplateColumns: template } : undefined}
          >
            {(tabs || mode === "wide") && (
              <div id="lesson-pane-progress" role="tabpanel" aria-labelledby="lesson-tab-progress" className={`${paneClass("progress")} lesson-rise`}>
                <LessonRail />
              </div>
            )}
            {mode === "wide" && fitted && (
              <ResizeHandle
                label="steps panel"
                value={fitted.rail}
                min={RAIL.min}
                max={RAIL.max}
                direction={1}
                onResize={(rail) => setWidths((w) => ({ ...w, rail }))}
                onCommit={commitWidths}
                onReset={() => resetWidth("rail")}
              />
            )}
            {mode === "wide" && !fitted && <div aria-hidden />}
            <div id="lesson-pane-board" role="tabpanel" aria-labelledby="lesson-tab-board" className={`${paneClass("board")} lesson-rise`} style={{ "--rise-delay": "90ms" } as React.CSSProperties}>
              <BoardPanel />
            </div>
            {!tabs && fitted && (
              <ResizeHandle
                label="chat"
                value={fitted.chat}
                min={mode === "wide" ? CHAT.min : 240}
                max={CHAT.max}
                direction={-1}
                onResize={(chat) => setWidths((w) => ({ ...w, chat }))}
                onCommit={commitWidths}
                onReset={() => resetWidth("chat")}
              />
            )}
            {!tabs && !fitted && <div aria-hidden />}
            <div id="lesson-pane-chat" role="tabpanel" aria-labelledby="lesson-tab-chat" className={`${paneClass("chat")} lesson-rise`} style={{ "--rise-delay": "180ms" } as React.CSSProperties}>
              <ChatPanel onShowFigure={showFigure} subject={subject} />
            </div>
          </main>
        </>
      )}

      {mode === "compact" && <RailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
