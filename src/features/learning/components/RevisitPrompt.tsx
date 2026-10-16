"use client";

import { Modal } from "@/components/ui/Modal";
import { useLessonStore } from "../useLessonStore";
import { RevisitChoices } from "./RevisitChoices";

/**
 * "Welcome back": shown when the learner opens a chapter in progress that has weak sections, and again once the
 * sections they chose to review are done while others are still weak. Closing it carries on where they were.
 */
export function RevisitPrompt() {
  const open = useLessonStore((s) => s.revisitPromptOpen && s.instance?.state === "active");
  const options = useLessonStore((s) => s.revisitOptions);
  const close = useLessonStore((s) => s.closeRevisitPrompt);
  const busy = useLessonStore((s) => s.reviewBusy);

  if (!options) return null;
  return (
    <Modal open={open} onClose={busy ? undefined : close} size="md" title="Welcome back" titleVisible={false}>
      <div className="lesson-rise max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[24px] bg-[var(--ls-card-warm)] p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ls-primary)]">Welcome back</p>
        <h2 className="lesson-hand mt-1 text-[26px] leading-tight text-[var(--ls-primary)]">Want to go over anything first?</h2>
        <div className="mt-4">
          <RevisitChoices options={options} onContinue={close} />
        </div>
      </div>
    </Modal>
  );
}
