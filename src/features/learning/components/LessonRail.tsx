"use client";

import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { learnerService } from "@/features/student/learner/learnerService";
import { paletteFor } from "@/features/student/learner/cardPalettes";
import { useLessonStore } from "../useLessonStore";
import { LessonProgressRail } from "./LessonProgressRail";

/** Whether this build connects voice mode to the backend (`/v1/voice`); off until the voice service is live. */
export const lessonVoiceEnabled = (): boolean => process.env.NEXT_PUBLIC_LESSON_VOICE === "true";

/**
 * Where the prototype's mascot sat: the chapter itself. Its accepted cover art
 * when it has one, its subject's gradient when not, with the chapter number,
 * and its title.
 */
function ChapterCard() {
  const instanceId = useLessonStore((s) => s.instanceId);
  const chapter = useLessonLaunch((s) => (s.instanceId === instanceId ? s.chapter : null));
  const pal = paletteFor(chapter?.palette);

  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-white/70 shadow-[var(--ls-shadow)]"
      style={{ background: `linear-gradient(150deg, ${pal.sky[0]} 0%, ${pal.sky[1]} 100%)` }}
    >
      {chapter?.card ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed, expiring API URL.
        <img
          src={learnerService.cardSrc(chapter.card.image_url)}
          alt=""
          className="block aspect-[16/10] w-full object-cover"
        />
      ) : (
        <div className="relative aspect-[16/10] w-full p-4">
          <div aria-hidden className="absolute -right-6 -top-8 h-28 w-28 rounded-full opacity-50" style={{ background: `radial-gradient(circle, ${pal.a}66, transparent 70%)` }} />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: pal.a }}>
            {chapter ? `Chapter ${chapter.number}` : "Your lesson"}
          </p>
          <p className="lesson-display relative mt-1 text-[20px] font-semibold leading-tight" style={{ color: pal.ink }}>
            {chapter?.title ?? "Let's begin"}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The left column: the chapter and the lesson's steps.
 */
export function LessonRail() {
  return (
    <aside aria-label="Lesson" className="lesson-rail relative flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <ChapterCard />

        <section aria-labelledby="lesson-progress-heading" className="flex flex-col gap-4">
          <h2 id="lesson-progress-heading" className="lesson-display text-[16px] font-medium text-[var(--ls-ink)]">
            Lesson Progress
          </h2>
          <LessonProgressRail />
        </section>
      </div>
    </aside>
  );
}
