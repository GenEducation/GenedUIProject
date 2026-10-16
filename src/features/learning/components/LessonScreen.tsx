"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { useLessonStore } from "../useLessonStore";
import { useLessonPresence } from "../presence/useLessonPresence";
import { LessonHeader } from "./LessonHeader";
import { LessonRail } from "./LessonRail";
import { BoardPanel } from "./BoardPanel";
import { ChatPanel } from "./ChatPanel";
import { RailDrawer } from "./RailDrawer";
import { RevisitPrompt } from "./RevisitPrompt";
import { ResizeHandle } from "./ResizeHandle";
import { CHAT, RAIL, fitWidths, gridTemplate, useLessonFrame, useLessonWidths } from "./layout";

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
 * - Phone held upright: the same landscape layout, drawn turned 90° to fill
 *   the screen. The lesson is landscape only; nobody is asked to rotate.
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
  const focusFigure = useLessonStore((s) => s.focusFigure);
  useLessonPresence(instanceId);

  // How the lesson fits this screen: scaled down on a small one, and turned on a phone held upright.
  const frame = useLessonFrame();
  const { mode, turned: upright, scale } = frame;
  const fittedFrame = upright || scale !== 1;
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

  // Tells the drag code (whiteboard pan, pinch, dividers) how the lesson is drawn, so it reads touches the right way.
  useEffect(() => {
    if (!fittedFrame) return;
    const root = document.documentElement;
    if (upright) root.dataset.lessonRotated = "true";
    root.dataset.lessonScale = String(scale);
    return () => {
      delete root.dataset.lessonRotated;
      delete root.dataset.lessonScale;
    };
  }, [fittedFrame, upright, scale]);

  // Leaving compact mode closes the drawer, so it isn't stuck open on rotate.
  useEffect(() => {
    if (mode !== "compact") setDrawerOpen(false);
  }, [mode]);

  // A figure tapped in the chat opens on the whiteboard.
  const showFigure = useCallback((figureGroupId: string) => {
    focusFigure(figureGroupId);
  }, [focusFigure]);

  useEffect(() => {
    void load(instanceId);
    return () => reset();
  }, [instanceId, load, reset]);

  const subject = launched?.subject ?? null;
  const exitHref = subject ? `/student/subjects/${encodeURIComponent(subject)}` : "/student";

  const fitted = containerW > 0 ? fitWidths(mode, containerW, pref) : null;
  const template = fitted ? gridTemplate(mode, fitted) : undefined;
  const paneClass = "flex min-h-0 flex-col";

  // Persist from inside the state update so a key press saves the width it just set.
  const commitWidths = () => setWidths((w) => { save(w); return w; });

  return (
    <div
      className={`lesson-theme flex flex-col overflow-hidden ${fittedFrame ? "" : "h-dvh"}`}
      // A small screen: lay the lesson out at its design size, then scale it to fit exactly (everything shrinks
      // together). An upright phone also gets it turned 90°, landscape across the screen's height.
      style={fittedFrame ? {
        position: "fixed",
        top: 0,
        left: 0,
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        transform: upright
          ? `translateX(${Math.round(frame.height * scale)}px) rotate(90deg) scale(${scale})`
          : `scale(${scale})`,
        transformOrigin: "top left",
      } : undefined}
      data-orientation={upright ? "turned" : undefined}
      data-scale={fittedFrame ? scale : undefined}
    >
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
      ) : (
        <>
          <main
            ref={mainRef}
            aria-busy={status === "loading"}
            className={`grid flex-1 min-h-0 px-4 pb-4 ${
              // Until measured, a sensible static template so the first paint isn't one column.
              !template ? (mode === "wide" ? "grid-cols-[264px_16px_minmax(0,1fr)_16px_380px]" : "grid-cols-[minmax(0,1fr)_16px_380px]") : ""
            }`}
            style={template ? { gridTemplateColumns: template } : undefined}
          >
            {mode === "wide" && (
              <div id="lesson-pane-progress" className={`${paneClass} lesson-rise`}>
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
            <div id="lesson-pane-board" className={`${paneClass} lesson-rise`} style={{ "--rise-delay": "90ms" } as React.CSSProperties}>
              <BoardPanel subject={subject} />
            </div>
            {fitted && (
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
            {!fitted && <div aria-hidden />}
            <div id="lesson-pane-chat" className={`${paneClass} lesson-rise`} style={{ "--rise-delay": "180ms" } as React.CSSProperties}>
              <ChatPanel onShowFigure={showFigure} subject={subject} />
            </div>
          </main>
        </>
      )}

      {mode === "compact" && <RailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
      <RevisitPrompt />
    </div>
  );
}
