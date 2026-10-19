"use client";

import { BookOpen, Lightbulb, NotebookPen, Target } from "lucide-react";
import { useLessonStore } from "../useLessonStore";

/**
 * The prototype's quick chips. The backend has no route for concepts,
 * examples, practice or notes; each is an ordinary learner message the tutor
 * answers on the current step, so they work everywhere a typed message does.
 */
const ACTIONS = [
  { label: "Concepts", icon: Lightbulb, prompt: "Can you explain the key ideas of this step simply?" },
  { label: "Examples", icon: BookOpen, prompt: "Can you show me an example?" },
  { label: "Practice", icon: Target, prompt: "Can you give me a practice question on this?" },
  { label: "Notes", icon: NotebookPen, prompt: "Can you sum up this step as short notes?" },
] as const;

export function QuickActions() {
  const send = useLessonStore((s) => s.send);
  const canTalk = useLessonStore((s) => s.status === "ready" && s.instance?.state === "active" && Boolean(s.instance.active_node));

  return (
    <div role="group" aria-label="Ask your tutor" className="flex flex-wrap gap-2.5 px-5 pb-4 pt-3">
      {ACTIONS.map(({ label, icon: Icon, prompt }) => (
        // eslint-disable-next-line no-restricted-syntax -- a quick-prompt chip.
        <button
          key={label}
          type="button"
          disabled={!canTalk}
          onClick={() => void send(prompt)}
          className="lesson-display flex items-center gap-2 rounded-full border border-[var(--ls-border)] bg-white px-4 py-2 text-[14px] font-medium text-[var(--ls-ink)] shadow-[0_1px_2px_rgb(18_45_48/0.05)] transition-[border-color,background] hover:border-[var(--ls-primary)] hover:bg-[var(--ls-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon size={16} strokeWidth={2.2} className="text-[var(--ls-primary)]" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
