"use client";

import { MessageSquareText, Mic } from "lucide-react";
import { useLessonStore } from "../useLessonStore";
import { TutorCard } from "./TutorCard";
import { LessonProgressRail } from "./LessonProgressRail";

/** Voice is gated until the backend's voice service is live (Phase F). */
export const lessonVoiceEnabled = (): boolean => process.env.NEXT_PUBLIC_LESSON_VOICE === "true";

/**
 * The left column: the tutor, the mode switch and the lesson's steps.
 */
export function LessonRail() {
  const voiceMode = useLessonStore((s) => s.voiceMode);
  const setVoiceMode = useLessonStore((s) => s.setVoiceMode);

  const modes = [
    { key: "text", label: "Chat & Whiteboard", icon: MessageSquareText, active: !voiceMode, onClick: () => setVoiceMode(false), disabled: false },
    { key: "voice", label: "Voice Mode", icon: Mic, active: voiceMode, onClick: () => setVoiceMode(true), disabled: !lessonVoiceEnabled() },
  ];

  return (
    <aside aria-label="Lesson" className="lesson-panel flex h-full flex-col gap-5 overflow-y-auto p-4">
      <TutorCard />

      <div role="radiogroup" aria-label="Lesson mode" className="flex flex-col gap-1.5">
        {modes.map(({ key, label, icon: Icon, active, onClick, disabled }) => (
          // eslint-disable-next-line no-restricted-syntax -- a radio in the mode switch; selected state is its look.
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={disabled ? "Voice lessons are coming soon" : undefined}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              active
                ? "bg-[var(--ls-primary)] text-white shadow-[0_6px_16px_-8px_rgb(7_94_99/0.7)]"
                : "text-[var(--ls-ink)] hover:bg-[var(--ls-primary-soft)]"
            }`}
          >
            <Icon size={18} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <section aria-labelledby="lesson-progress-heading" className="flex flex-col gap-3">
        <h2 id="lesson-progress-heading" className="text-[13px] font-semibold text-[var(--ls-ink-mid)]">
          Lesson progress
        </h2>
        <LessonProgressRail />
      </section>
    </aside>
  );
}
