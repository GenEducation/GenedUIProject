"use client";

import Image from "next/image";
import { History } from "lucide-react";

import { STUDENT_COLORS } from "../theme/colors";
import { CONTINUE_ART } from "../theme/progressArt";

/* ═══ TOKENS ═══ — sourced from STUDENT_COLORS (see theme/colors.ts) */
const C = {
  primary: STUDENT_COLORS.tutor,
  text: STUDENT_COLORS.text,
  textMid: STUDENT_COLORS.textMid,
  textMuted: STUDENT_COLORS.textMuted,
  card: STUDENT_COLORS.card,
};

/** A pale sky for the scene to drift in: canvas-lime at the top, soft surface low down (the scene brings its own clouds). */
const SKY = "linear-gradient(180deg, #F4F8E6 0%, #E3EEC4 100%)";
const FILL = "#8DB000";
/* From sm up the scene rises 36px above the card's top edge (the wrapper's sm:mt-[36px]
   leaves room for it); on phones it sits inside the card, above the text. */

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
  /** When it was last studied, e.g. "2h ago", after the eyebrow. */
  lastStudied?: string;
  /** A chapter finished once and open again (reviewing sections, or started over). */
  revisiting?: boolean;
  onStart: () => void;
  style?: React.CSSProperties;
}

/**
 * Dashboard hero for the chapter the student is part-way through: the chapter
 * on the left and, on the right, one fixed 3D scene of what the card is for (a
 * paper plane folded from your notebook taking off again) drifting in a strip
 * of sky and rising out of the card's top edge. The subject shows in the
 * chip. The scene is the only moving thing on the dashboard (and stays still
 * under prefers-reduced-motion).
 */
export function ContinueLearningCard({
  session,
  gradeLabel,
  lastStudied,
  revisiting = false,
  onStart,
  style,
}: ContinueLearningCardProps) {
  const percent = Math.max(0, Math.min(100, session.mastery));
  const chip = [session.vis.label, gradeLabel].filter(Boolean).join(" · ");

  return (
    <div className="relative mb-8 mt-2 sm:mt-[36px]" style={style}>
      <div
        className="relative rounded-[26px] grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-center"
        style={{ background: SKY, minHeight: "clamp(220px, 24vw, 290px)" }}
      >
        <div className="relative z-[1]" style={{ padding: "clamp(20px, 2.8vw, 36px)" }}>
          {/* Subject chip */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full font-bold"
            style={{ background: C.card, color: session.vis.color, padding: "4px 12px", fontSize: "clamp(11px, 1vw, 12px)" }}
          >
            <span aria-hidden className="rounded-[3px]" style={{ width: 8, height: 8, background: session.vis.color }} />
            {chip}
          </span>

          {/* Eyebrow */}
          <div
            className="flex items-center gap-2 font-bold uppercase mt-3"
            style={{ color: C.textMuted, letterSpacing: "0.1em", fontSize: "clamp(10px, 0.9vw, 11px)" }}
          >
            <History size={14} strokeWidth={2} aria-hidden />
            <span>{revisiting ? "Revisiting a finished chapter" : "Pick up where you left off"}</span>
            {lastStudied && (
              <span className="font-semibold normal-case tracking-normal" style={{ opacity: 0.8 }}>
                · {lastStudied}
              </span>
            )}
          </div>

          <h2
            className="m-0 mt-2 font-extrabold"
            style={{
              color: C.text,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 3.4vw, 40px)",
              lineHeight: 1.05,
              textWrap: "balance",
            }}
          >
            {session.title}
          </h2>

          {/* Progress */}
          <div className="mt-5" style={{ maxWidth: 420 }}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-bold" style={{ color: C.textMid, fontSize: "clamp(11px, 1vw, 12px)" }}>
                Progress
              </span>
              <span className="font-bold" style={{ color: C.textMid, fontSize: "clamp(11px, 1vw, 12px)" }}>
                {percent}% complete
              </span>
            </div>
            <div
              className="rounded-full overflow-hidden w-full"
              style={{ height: 10, background: "rgba(255,255,255,0.9)", boxShadow: "inset 0 1px 2px rgba(29,99,21,0.08)" }}
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
              background: C.primary,
              padding: "clamp(11px, 1.3vw, 14px) clamp(20px, 2.2vw, 26px)",
              fontSize: "clamp(13px, 1.3vw, 15px)",
              fontFamily: "var(--font-body)",
              boxShadow: "0 8px 20px rgba(40,118,36,0.28)",
              transition: "transform 0.15s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 12px 26px rgba(40,118,36,0.34)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(40,118,36,0.28)";
            }}
          >
            <span>Continue Learning</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* The paper-plane scene: floats over the right half and out of the top edge. */}
        <div aria-hidden="true" className="relative order-first sm:order-none h-[150px] sm:h-auto sm:self-stretch pointer-events-none select-none">
          <div
            className="island-shadow absolute rounded-[50%]"
            style={{ left: "18%", right: "14%", bottom: "11%", height: 18, background: "rgba(29,99,21,0.16)", filter: "blur(6px)" }}
          />
          <div className="island-float absolute inset-x-[4%] top-2 bottom-0 sm:left-[-6%] sm:right-[1%] sm:bottom-[8%] sm:top-[-36px]">
            <Image
              src={CONTINUE_ART}
              alt=""
              width={1200}
              height={600}
              // A fixed-size 1200x600 WebP; serve it as is.
              unoptimized
              priority
              style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "right bottom" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
