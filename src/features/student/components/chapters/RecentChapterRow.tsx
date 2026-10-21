"use client";

import { useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { learnerService } from "../../learner/learnerService";
import { paletteFor } from "../../learner/cardPalettes";
import { chapterPercent } from "../../learner/recentChapters";
import type { RecentChapter } from "../../learner/types";
import { STUDENT_COLORS } from "../../theme/colors";
import { ProgressRing } from "../ProgressRing";

/**
 * One chapter the student worked on recently: its cover card (or the card palette with its number, until a card
 * is accepted), the title, where it's from and when, and how far through it is. Opening it resumes the lesson.
 */
export function RecentChapterRow({
  chapter,
  subjectLabel,
  color,
  when,
  opening,
  disabled,
  onOpen,
  onCardExpired,
}: {
  chapter: RecentChapter;
  subjectLabel: string;
  /** The subject's accent, for the progress ring. */
  color: string;
  /** "2h ago", "Yesterday"… */
  when: string;
  opening: boolean;
  disabled: boolean;
  onOpen: (chapter: RecentChapter) => void;
  onCardExpired: () => void;
}) {
  const pal = paletteFor(chapter.palette);
  const src = chapter.card ? learnerService.cardSrc(chapter.card.image_url) : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const showCard = src !== null && failedSrc !== src;
  const done = chapter.state === "completed";
  // Finished once and open again: it stays finished, and the row says it is being revisited.
  const revisiting = chapter.revisiting === true && !done;
  const percent = chapterPercent(chapter);

  return (
    // eslint-disable-next-line no-restricted-syntax -- a whole list row that opens the chapter, in the home's own card style.
    <button
      type="button"
      onClick={() => onOpen(chapter)}
      disabled={disabled}
      aria-busy={opening}
      aria-label={`${chapter.chapter_title}, ${subjectLabel}, ${done ? "finished" : revisiting ? "finished, revisiting" : `${percent}% done`}. ${done ? "Review" : "Continue"}`}
      className="group flex w-full cursor-pointer items-center rounded-[14px] text-left transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-60"
      style={{
        background: STUDENT_COLORS.card,
        border: `1px solid ${STUDENT_COLORS.border}`,
        padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.6vw, 18px)",
        gap: "clamp(10px, 1.4vw, 16px)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
        outlineColor: color,
      }}
    >
      {/* the chapter's cover, small */}
      <span
        className="relative block shrink-0 overflow-hidden rounded-[10px]"
        style={{
          width: "clamp(64px, 6.4vw, 80px)",
          aspectRatio: "16 / 10",
          background: `linear-gradient(160deg, ${pal.sky[0]} 0%, ${pal.sky[1]} 100%)`,
        }}
      >
        {showCard ? (
          // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring API image
          <img
            src={src!}
            alt=""
            data-testid="recent-chapter-card"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => {
              setFailedSrc(src);
              if (!reported) {
                setReported(true);
                onCardExpired();
              }
            }}
          />
        ) : (
          <span aria-hidden data-testid="recent-chapter-fallback" className="absolute inset-0">
            <span className="absolute -right-3 -top-4 h-10 w-10 rounded-full opacity-70" style={{ background: pal.a }} />
            <span className="absolute -bottom-5 -left-3 h-10 w-10 rounded-full opacity-50" style={{ background: pal.b }} />
            <span className="absolute inset-0 flex items-center justify-center text-[22px] font-black" style={{ color: pal.ink, opacity: 0.55 }}>
              {chapter.chapter_number}
            </span>
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold" style={{ color: STUDENT_COLORS.text, fontSize: "clamp(13px, 1.3vw, 15px)" }}>
          {chapter.chapter_title}
        </span>
        <span className="mt-0.5 block truncate" style={{ color: STUDENT_COLORS.textMuted, fontSize: "clamp(10px, 1vw, 12px)" }}>
          {subjectLabel} · Ch {chapter.chapter_number} · {chapter.book_title}
        </span>
        <span className="mt-0.5 block" style={{ color: STUDENT_COLORS.textFaint, fontSize: "clamp(10px, 1vw, 11.5px)" }}>
          {done ? `Finished ${when.toLowerCase() === "just now" ? "just now" : when}` : `Last studied ${when.charAt(0).toLowerCase() + when.slice(1)}`}
        </span>
      </span>

      <span className="flex shrink-0 items-center" style={{ gap: 8 }}>
        {opening ? (
          <Loader2 size={18} className="animate-spin" style={{ color }} aria-hidden />
        ) : done || revisiting ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: `${color}18`, color }}
          >
            {revisiting ? <RotateCcw size={12} strokeWidth={3} aria-hidden /> : <Check size={12} strokeWidth={3} aria-hidden />}{" "}
            {revisiting ? "Revisiting" : "Done"}
          </span>
        ) : (
          <span className="relative">
            <ProgressRing percent={percent} size={38} stroke={3.5} color={color} />
            <span className="absolute inset-0 flex items-center justify-center font-bold" style={{ color, fontSize: "clamp(9px, 0.9vw, 11px)" }}>
              {percent}%
            </span>
          </span>
        )}
        <span aria-hidden style={{ color: STUDENT_COLORS.textFaint, fontSize: 18 }}>›</span>
      </span>
    </button>
  );
}
