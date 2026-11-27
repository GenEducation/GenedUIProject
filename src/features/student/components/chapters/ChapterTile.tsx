"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Play } from "lucide-react";
import { learnerService } from "../../learner/learnerService";
import { paletteFor } from "../../learner/cardPalettes";
import type { LearnerChapter } from "../../learner/types";
import type { ChapterStatus } from "../../learner/recentChapters";
import { STUDENT_COLORS } from "../../theme/colors";

interface ChapterTileProps {
  chapter: LearnerChapter;
  /** Position in the grid, for the staggered entrance. */
  index: number;
  opening: boolean;
  disabled: boolean;
  onOpen: (chapter: LearnerChapter) => void;
  /** First image error only: the signed URL has likely expired, so the page refetches the list. */
  onCardExpired: () => void;
  /** Where the student stands on it; null while unknown (loading, or the recent list failed). */
  status?: ChapterStatus | null;
  statusLoading?: boolean;
  /** The subject's name, set under the title on a tile without a card (as the card kit sets it on a card). */
  subject?: string;
}

/**
 * One chapter as a 16:10 tile (ADR 0016): the accepted cover card is the whole
 * tile, its chapter number, title and subject already set in the image by the
 * card kit. Without a card, a soft gradient in the card's own palette with the
 * title set here, so the tile already looks like the family its card will join.
 */
export function ChapterTile({ chapter, index, opening, disabled, onOpen, onCardExpired, status = null, statusLoading = false, subject }: ChapterTileProps) {
  const pal = paletteFor(chapter.palette);
  const src = chapter.card ? learnerService.cardSrc(chapter.card.image_url) : null;
  // The URL that failed: show the gradient until a refetch hands back another.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const showCard = src !== null && failedSrc !== src;
  const current = !!status?.current;
  const statusId = `chapter-status-${chapter.chapter_id}`;

  const handleError = () => {
    setFailedSrc(src);
    if (!reported) {
      setReported(true);
      onCardExpired();
    }
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 8) * 0.05 }}
      onClick={() => onOpen(chapter)}
      disabled={disabled}
      aria-busy={opening}
      aria-label={`Chapter ${chapter.number}: ${chapter.title}`}
      id={`chapter-tile-${chapter.chapter_id}`}
      aria-describedby={statusId}
      data-current={current || undefined}
      className={`group relative flex w-full flex-col overflow-hidden rounded-[22px] border bg-white text-left cursor-pointer outline-none transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 focus-visible:ring-4 disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 ${current ? "-translate-y-1" : ""}`}
      style={{
        borderColor: current ? STUDENT_COLORS.accent : "rgba(29,99,21,0.10)",
        boxShadow: current
          ? `0 0 0 2px ${STUDENT_COLORS.accent}, 0 14px 30px -14px ${STUDENT_COLORS.ink}66`
          : `0 1px 2px ${pal.ink}14, 0 8px 24px -14px ${pal.a}55`,
        // focus ring in the tile's own accent
        ["--tw-ring-color" as string]: `${pal.a}66`,
      }}
    >
      <div
        className="@container relative aspect-[16/10] w-full overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${pal.sky[0]} 0%, ${pal.sky[1]} 100%)` }}
      >
      {showCard ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived API path; next/image would cache past expiry
        <img
          src={src}
          alt=""
          onError={handleError}
          loading="lazy"
          data-testid="chapter-card-image"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div data-testid="chapter-card-fallback" aria-hidden="true" className="absolute inset-0">
          {/* Soft shapes in the palette's accents, kept to the right two thirds like a card's art. */}
          <div
            className="absolute rounded-full transition-transform duration-700 ease-out group-hover:scale-110"
            style={{ width: "62%", aspectRatio: "1", right: "-14%", top: "-22%", background: `radial-gradient(circle at 35% 35%, ${pal.a}55, ${pal.a}00 70%)` }}
          />
          <div
            className="absolute rounded-full transition-transform duration-700 ease-out group-hover:-translate-y-2"
            style={{ width: "34%", aspectRatio: "1", right: "12%", bottom: "-14%", background: `radial-gradient(circle at 40% 40%, ${pal.b}4D, ${pal.b}00 70%)` }}
          />
          <span
            className="absolute select-none font-black leading-none"
            style={{ right: "6%", bottom: "-6%", fontSize: "clamp(96px, 16vw, 168px)", color: pal.a, opacity: 0.16, fontFamily: "var(--font-display)" }}
          >
            {chapter.number}
          </span>
        </div>
      )}

      {/* The title is on the cover (in the image, or set here); only "Opening…" needs saying over it. */}
      {opening && (
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[var(--primary)] shadow-sm">
          <Loader2 size={13} className="animate-spin" /> Opening…
        </span>
      )}

      {/* Without a card: the title band, a scrim over the left third, and the title set by the app. */}
      {!showCard && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-[62%] sm:w-[48%]"
            style={{ background: `linear-gradient(90deg, ${pal.sky[0]}F2 0%, ${pal.sky[0]}CC 55%, ${pal.sky[0]}00 100%)` }}
          />
          {/* Set like the card kit sets a card: a small chapter chip, the title, a short rule and the subject. */}
          {/* Sized by the tile's own width (cqw), so it fits however many columns the grid has. */}
          <div className="absolute inset-y-0 left-0 w-[50%] flex flex-col justify-center p-[6cqw]">
            <span
              className="self-start shrink-0 rounded-full px-2 py-0.5 text-[clamp(8px,2.7cqw,10px)] font-extrabold uppercase tracking-[0.12em]"
              style={{ background: `${pal.a}24`, color: pal.ink }}
            >
              Chapter {chapter.number}
            </span>
            <h3
              className="m-0 mt-[3cqw] shrink-0 font-extrabold leading-[1.08] line-clamp-4 [overflow-wrap:anywhere]"
              style={{ color: pal.ink, fontFamily: "var(--font-display)", fontSize: titleSize(chapter.title) }}
            >
              {chapter.title}
            </h3>
            <span aria-hidden className="mt-[3cqw] block h-[3px] w-5 shrink-0 rounded-full" style={{ background: pal.a }} />
            {subject && (
              <span className="mt-[2cqw] shrink-0 text-[clamp(7px,2.4cqw,9px)] font-extrabold uppercase tracking-[0.14em]" style={{ color: `${pal.ink}99` }}>
                {subject}
              </span>
            )}
          </div>
        </>
      )}

      {/* The one to pick up is named on its cover; a finished one gets a small medal. Kept top right, clear of the
          card's own title. */}
      {current && (
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-extrabold shadow-sm"
          style={{ background: STUDENT_COLORS.accent, color: STUDENT_COLORS.ink }}
        >
          <Play size={11} strokeWidth={3} fill="currentColor" aria-hidden /> Continue
        </span>
      )}
      {!current && (status?.kind === "done" || status?.kind === "revisit") && (
        <span
          data-testid="chapter-medal"
          aria-hidden
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
          style={{ background: STUDENT_COLORS.logoDark }}
        >
          <Check size={16} strokeWidth={3} />
        </span>
      )}
      </div>

      <StatusFooter id={statusId} status={status} loading={statusLoading} current={current} />
    </motion.button>
  );
}

/** The title's size on a tile without a card: smaller as it gets longer, so even a long one fits in four lines. */
function titleSize(title: string): string {
  const n = title.length;
  if (n > 34) return "clamp(11px, 4.6cqw, 16px)";
  if (n > 22) return "clamp(12px, 5.4cqw, 19px)";
  return "clamp(14px, 6.6cqw, 23px)";
}

const FOOTER_TEXT: Record<ChapterStatus["kind"], (s: ChapterStatus) => string> = {
  done: () => "Finished · review anytime",
  revisit: (s) => `Reviewing · ${s.done} of ${s.total} steps`,
  progress: (s) => `${s.done} of ${s.total} steps`,
  restart: () => "Not finished · start again",
  new: () => "Not started",
};

/** The slim line under the cover: the chapter's status in words, a dot and a small progress ring. */
function StatusFooter({ id, status, loading, current }: { id: string; status: ChapterStatus | null; loading: boolean; current: boolean }) {
  const C = STUDENT_COLORS;
  if (!status) {
    return (
      <div id={id} className="flex h-[44px] items-center gap-2 px-3.5">
        {loading ? (
          <span data-testid="chapter-status-loading" className="h-2.5 w-28 animate-pulse rounded-full bg-[var(--soft-surface)]" />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--primary-ink)]/70">
            Open chapter <ArrowRight size={13} strokeWidth={2.5} aria-hidden />
          </span>
        )}
      </div>
    );
  }
  const started = status.kind !== "new";
  const finished = status.kind === "done";
  const tone = finished || status.kind === "revisit" ? C.logoDark : started ? C.accentDeep : "#CFD6BF";
  // Opened but nothing done yet reads as "just started", not "0 of 12 steps"
  const base = status.kind === "progress" && status.done === 0 ? "Just started" : FOOTER_TEXT[status.kind](status);
  const text = current && status.kind === "progress" ? `Pick up here · ${status.done === 0 ? "just started" : base}` : base;
  const pct = status.kind === "restart" ? 0 : status.percent;
  return (
    <div id={id} data-testid="chapter-status" data-status={status.kind} className="flex h-[44px] items-center gap-2 px-3.5">
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone }} />
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold" style={{ color: C.ink }}>{text}</span>
      {(finished || pct > 0) && <span
        aria-hidden
        data-testid="chapter-ring"
        className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${tone} ${pct * 3.6}deg, #E4E9D6 0)` }}
      >
        <span className="grid h-[21px] w-[21px] place-items-center rounded-full bg-white text-[8px] font-extrabold" style={{ color: C.logoDark }}>
          {finished ? <Check size={11} strokeWidth={3.2} /> : `${pct}%`}
        </span>
      </span>}
    </div>
  );
}
