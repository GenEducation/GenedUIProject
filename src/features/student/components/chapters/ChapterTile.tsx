"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { learnerService } from "../../learner/learnerService";
import { paletteFor } from "../../learner/cardPalettes";
import type { LearnerChapter } from "../../learner/types";

interface ChapterTileProps {
  chapter: LearnerChapter;
  /** Position in the grid, for the staggered entrance. */
  index: number;
  opening: boolean;
  disabled: boolean;
  onOpen: (chapter: LearnerChapter) => void;
  /** First image error only: the signed URL has likely expired, so the page refetches the list. */
  onCardExpired: () => void;
}

/**
 * One chapter as a 16:10 tile (ADR 0016): the accepted cover card is the whole
 * tile, its chapter number, title and subject already set in the image by the
 * card kit. Without a card, a soft gradient in the card's own palette with the
 * title set here, so the tile already looks like the family its card will join.
 */
export function ChapterTile({ chapter, index, opening, disabled, onOpen, onCardExpired }: ChapterTileProps) {
  const pal = paletteFor(chapter.palette);
  const src = chapter.card ? learnerService.cardSrc(chapter.card.image_url) : null;
  // The URL that failed: show the gradient until a refetch hands back another.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const showCard = src !== null && failedSrc !== src;

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
      className="group relative block w-full aspect-[16/10] overflow-hidden rounded-[22px] text-left cursor-pointer outline-none transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 focus-visible:ring-4 disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
      style={{
        background: `linear-gradient(160deg, ${pal.sky[0]} 0%, ${pal.sky[1]} 100%)`,
        boxShadow: `0 1px 2px ${pal.ink}14, 0 8px 24px -12px ${pal.a}55`,
        // focus ring in the tile's own accent
        ["--tw-ring-color" as string]: `${pal.a}66`,
      }}
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

      {/* With a card the title is in the image; only "Opening…" needs saying over it. */}
      {showCard && opening && (
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-bold shadow-sm" style={{ color: pal.ink }}>
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
          <div className="absolute inset-y-0 left-0 w-[58%] sm:w-[42%] flex flex-col justify-between p-[clamp(14px,2.2vw,22px)]">
            <span
              className="self-start rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ background: `${pal.a}1F`, color: pal.ink }}
            >
              Chapter {chapter.number}
            </span>
            <div>
              <h3
                className="m-0 font-extrabold leading-[1.12] line-clamp-3"
                style={{ color: pal.ink, fontFamily: "var(--font-display)", fontSize: "clamp(16px, 1.7vw, 21px)" }}
              >
                {chapter.title}
              </h3>
              <span
                className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-bold transition-[gap] duration-300 group-hover:gap-2.5"
                style={{ color: pal.a }}
              >
                {opening ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Opening…
                  </>
                ) : (
                  <>
                    Start <ArrowRight size={13} strokeWidth={2.5} />
                  </>
                )}
              </span>
            </div>
          </div>
        </>
      )}
    </motion.button>
  );
}
