"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { Target } from "lucide-react";

import { STUDENT_COLORS } from "../theme/colors";

/* ═══ TOKENS ═══ — sourced from STUDENT_COLORS (see theme/colors.ts) */
const C = {
  genPurple: STUDENT_COLORS.tutor,
  genBlue: STUDENT_COLORS.tutorSoft,
  sparkle: STUDENT_COLORS.tutorLight,
  text: STUDENT_COLORS.text,
  textMid: STUDENT_COLORS.textMid,
  textMuted: STUDENT_COLORS.textMuted,
};

/** Pale lavender ground and the lighter blob that bleeds off the corner. */
const BANNER_BG = "#EDEAFD";
const BANNER_BLOB = "#E3DEFB";
const TRACK = "#FFFFFF";
const FILL = "#2E9E4F";

/** Banner mascot poses; one is picked at random per mount. */
const POSES = [
  "/mascots/banner/cheer.webp",
  "/mascots/banner/butterfly.webp",
] as const;

/**
 * "Has this mounted on the client?", in the same shape as useNow — false on the
 * server and through hydration, true afterwards. The random pose can only be
 * committed to markup once we are past hydration, or the server's roll and the
 * client's would disagree. The value never changes after mount, so there is
 * nothing to subscribe to.
 */
const subscribeNever = () => () => {};
const getMounted = () => true;
const getMountedOnServer = () => false;

/**
 * The shape the dashboard hands in — a recent-chat row already decorated with
 * `vis` and a rounded `mastery` by StudentHome. Kept structural rather than
 * importing the store type so the card stays easy to render in isolation.
 */
export interface ContinueLearningSession {
  title: string;
  mastery: number;
  vis: { label: string; color: string };
}

interface ContinueLearningCardProps {
  session: ContinueLearningSession;
  /** Grade + board line, e.g. "Grade 8 CBSE". Omitted when unknown. */
  gradeLabel?: string;
  onStart: () => void;
  style?: React.CSSProperties;
}

/** Four-point sparkle, sized and placed by the caller. */
function Sparkle({
  size,
  top,
  left,
  opacity,
}: {
  size: number;
  top: string;
  left: string;
  opacity: number;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="absolute pointer-events-none"
      style={{ top, left, opacity, color: C.sparkle }}
    >
      <path
        d="M12 0c.6 6.2 5.2 10.8 12 12-6.8 1.2-11.4 5.8-12 12-.6-6.2-5.2-10.8-12-12C6.8 10.8 11.4 6.2 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Dashboard hero banner for the chapter the student is part-way through.
 *
 * Matches UpcomingSessionPanel's outer geometry (radius, bottom margin,
 * padding) so the two swap without the layout shifting.
 */
export function ContinueLearningCard({
  session,
  gradeLabel,
  onStart,
  style,
}: ContinueLearningCardProps) {
  const percent = Math.max(0, Math.min(100, session.mastery));

  // Lazy init keeps the pose stable across re-renders rather than re-rolling on
  // every state change; `mounted` gates it out of the server markup entirely.
  const [pose] = useState(() => POSES[Math.floor(Math.random() * POSES.length)]);
  const mounted = useSyncExternalStore(subscribeNever, getMounted, getMountedOnServer);

  // The title already carries the chapter name, so the subline is just
  // subject and grade — repeating the title here reads as a stutter.
  const subtitle = [session.vis.label, gradeLabel].filter(Boolean).join(" • ");

  return (
    <div
      className="rounded-[22px] relative overflow-hidden mb-8"
      style={{
        background: BANNER_BG,
        padding: "clamp(18px, 2.4vw, 28px)",
        ...style,
      }}
    >
      {/* Decorative corner blob + sparkles — no mascot. */}
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          background: BANNER_BLOB,
          width: "clamp(180px, 26vw, 300px)",
          height: "clamp(180px, 26vw, 300px)",
          right: "-6%",
          bottom: "-58%",
        }}
      />
      {mounted && (
        <Image
          src={pose}
          alt=""
          aria-hidden="true"
          width={340}
          height={420}
          unoptimized
          className="hidden sm:block absolute pointer-events-none select-none"
          style={{
            height: "100%",
            width: "auto",
            // Fills the card's height, but capped so a taller card (a title
            // that wraps) can't grow the artwork into the text column.
            // object-fit keeps it undistorted when the cap binds.
            maxWidth: "28%",
            objectFit: "contain",
            objectPosition: "center bottom",
            right: "clamp(8px, 2vw, 32px)",
            bottom: 0,
            // Mirrored so the elephant faces into the card rather than off its
            // edge; the artwork is drawn facing right.
            transform: "scaleX(-1)",
          }}
        />
      )}

      <Sparkle size={14} top="14%" left="80%" opacity={0.85} />
      <Sparkle size={10} top="36%" left="92%" opacity={0.7} />
      <Sparkle size={12} top="72%" left="85%" opacity={0.6} />

      <div className="relative" style={{ maxWidth: "min(66%, 800px)" }}>
        {/* Eyebrow */}
        <div
          className="flex items-center gap-2 font-bold uppercase"
          style={{
            color: C.textMuted,
            letterSpacing: "0.12em",
            fontSize: "clamp(9px, 0.9vw, 11px)",
          }}
        >
          <Target size={14} strokeWidth={2} />
          <span>Today&apos;s learning goal</span>
        </div>

        {/* Title block behind the purple rule */}
        <div
          className="mt-3.5"
          style={{ borderLeft: `3px solid ${C.genPurple}`, paddingLeft: "clamp(12px, 1.4vw, 16px)" }}
        >
          <h2
            className="font-extrabold leading-tight m-0"
            style={{
              color: C.text,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(19px, 2.4vw, 28px)",
            }}
          >
            {session.title}
          </h2>
          <p
            className="mt-1.5 mb-0 font-medium"
            style={{ color: C.textMid, fontSize: "clamp(12px, 1.3vw, 15px)" }}
          >
            {subtitle}
          </p>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between mb-1.5">
            <span
              className="font-semibold"
              style={{ color: FILL, fontSize: "clamp(10px, 1vw, 12px)" }}
            >
              Progress
            </span>
            <span
              className="font-bold"
              style={{ color: C.textMid, fontSize: "clamp(10px, 1vw, 12px)" }}
            >
              {percent}% complete
            </span>
          </div>
          <div
            className="rounded-full overflow-hidden w-full"
            style={{ height: 8, background: TRACK }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${session.title} progress`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${percent}%`,
                background: FILL,
                transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onStart}
          className="mt-6 inline-flex items-center gap-2.5 rounded-full border-none cursor-pointer text-white font-bold"
          style={{
            background: C.genPurple,
            padding: "clamp(11px, 1.3vw, 14px) clamp(20px, 2.2vw, 26px)",
            fontSize: "clamp(13px, 1.3vw, 15px)",
            fontFamily: "var(--font-body)",
            boxShadow: "0 6px 18px rgba(91,77,199,0.28)",
            transition: "transform 0.15s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 10px 24px rgba(91,77,199,0.34)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(91,77,199,0.28)";
          }}
        >
          <span>Continue Learning</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
