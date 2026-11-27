"use client";

import { useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SubjectIcon } from "@/features/subjects/subjectPresentation";
import { WORDMARK_FPS, WORDMARK_SCALE, wordmarkArt, type WordmarkSprite } from "../../theme/wordmarkArt";

interface SubjectHeaderProps {
  subject: string;
  /** The student's grade, once the chapters are in. */
  grade?: number;
  /** How many chapters the subject has (0 while loading). */
  chapterCount: number;
  /** Where the student stands, once their progress is in (null while it loads, or if it couldn't). */
  progress: { finished: number; underWay: number } | null;
  /** The chapter to pick up, if there is one. */
  current: { number: number; title: string } | null;
  onBack: () => void;
  onContinue: () => void;
  /** With the sidebar closed, its button floats over the top left on phones: the header makes room for it. */
  sidebarOpen?: boolean;
}

/**
 * The chapter page's header: the subject's paper word-mark on the left (its letters fold up as the page opens, and a
 * wave runs along them on hover), the grade, the student's standing and the Continue button spread down the right.
 * Subjects without a word-mark get their name set large. Replaces the plain page bar and the "Pick a chapter" title.
 */
export function SubjectHeader({ subject, grade, chapterCount, progress, current, onBack, onContinue, sidebarOpen = true }: SubjectHeaderProps) {
  const art = wordmarkArt(subject);
  const eyebrow = [grade ? `Grade ${grade}` : null, chapterCount ? `${chapterCount} chapter${chapterCount === 1 ? "" : "s"}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    // The info is pinned to the right edge and the word-mark centred in the space between it and the back button:
    // the word-marks keep one letter size across subjects, so a short name splits its spare room either side
    // rather than leaving one wide gap.
    <header className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6 ${sidebarOpen ? "" : "pl-12 md:pl-0"}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Button variant="outline" size="md" iconOnly pill aria-label="Back to home" onClick={onBack} className="!h-10 !w-10 shrink-0 !bg-white">
          <ArrowLeft size={18} />
        </Button>
        {art ? (
          <>
            <h1 className="sr-only">{subject}</h1>
            <div className="flex min-w-0 flex-1 justify-center">
              <Wordmark key={subject} sprites={art} />
            </div>
          </>
        ) : (
          <h1
            className="m-0 mt-1 flex items-center gap-3 font-bold leading-none text-[var(--primary-ink)] text-[clamp(38px,5.6vw,68px)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--soft-surface)]">
              <SubjectIcon subject={subject} size={22} />
            </span>
            {subject}
          </h1>
        )}
      </div>

      {/* Spread down the header's height: what this is, where you stand, where to pick up. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:flex-nowrap sm:items-end sm:justify-between sm:py-3">
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">{eyebrow || " "}</p>
        {progress && chapterCount > 0 && (
          <p className="m-0 rounded-full bg-[var(--soft-surface)] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[var(--primary)]">
            {progress.finished} of {chapterCount} finished · {progress.underWay} under way
          </p>
        )}
        {current && (
          <Button variant="primary" size="md" pill onClick={onContinue} title={`Continue Ch ${current.number} · ${current.title}`}>
            <Play size={11} strokeWidth={3} fill="currentColor" aria-hidden />
            {/* a long chapter title is cut short; the full one stays in the accessible name */}
            <span className="max-w-[min(36ch,60vw)] truncate">Continue Ch {current.number} · {current.title}</span>
          </Button>
        )}
      </div>
    </header>
  );
}

/** Steps a sprite's frames into an element's background. */
function showFrame(el: HTMLElement, sprite: WordmarkSprite, i: number) {
  const { cols, rows } = sprite;
  el.style.backgroundImage = `url(${sprite.src})`;
  el.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
  el.style.backgroundPosition = `${cols > 1 ? ((i % cols) / (cols - 1)) * 100 : 0}% ${rows > 1 ? (Math.floor(i / cols) / (rows - 1)) * 100 : 0}%`;
}

function load(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

/** The word-mark: plays its entrance once the frames are in, rests on the last frame, and waves on hover. */
function Wordmark({ sprites }: { sprites: NonNullable<ReturnType<typeof wordmarkArt>> }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const busy = useRef(true);
  const hoverReady = useRef(false);
  const hoverLoading = useRef(false);
  const motionOff = useRef(false);

  const rest = useCallback(() => {
    if (ref.current) showFrame(ref.current, sprites.enter, sprites.enter.frames - 1);
  }, [sprites]);

  const play = useCallback((sprite: WordmarkSprite, done: () => void) => {
    const el = ref.current;
    if (!el) return;
    busy.current = true;
    const t0 = performance.now();
    const tick = () => {
      const i = Math.floor(((performance.now() - t0) / 1000) * WORDMARK_FPS);
      if (i >= sprite.frames) {
        busy.current = false;
        done();
        return;
      }
      showFrame(el, sprite, i);
      raf.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  useEffect(() => {
    let alive = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void load(sprites.enter.src).then(() => {
      if (!alive) return;
      if (reduce) {
        rest();
        busy.current = false;
      } else {
        play(sprites.enter, rest);
      }
      if (reduce) motionOff.current = true;
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf.current);
    };
  }, [sprites, play, rest]);

  // The hover frames load on the first hover (most visits never hover), and that first hover waves once they're in.
  const wave = () => {
    if (motionOff.current) return;
    if (!hoverReady.current) {
      if (hoverLoading.current) return;
      hoverLoading.current = true;
      void load(sprites.hover.src).then(() => {
        hoverReady.current = true;
        if (!busy.current && ref.current) play(sprites.hover, rest);
      });
      return;
    }
    if (busy.current) return;
    play(sprites.hover, rest);
  };

  return (
    <div
      ref={ref}
      aria-hidden
      data-testid="subject-wordmark"
      onPointerEnter={wave}
      className="max-w-full bg-no-repeat"
      style={{ width: sprites.width / WORDMARK_SCALE, aspectRatio: `${sprites.width} / ${sprites.height}` }}
    />
  );
}
