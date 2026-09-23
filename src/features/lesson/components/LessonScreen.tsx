"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLessonStore } from "../store/useLessonStore";
import { deriveStep } from "../store/lessonFlow";
import { LessonHeader } from "./LessonHeader";
import { LessonThread } from "./LessonThread";
import { TextbookDrawer } from "./TextbookDrawer";
import { ChapterReportView } from "./ChapterReportView";

interface LessonScreenProps {
  chapterId: string;
}

/**
 * The learner's lesson: one conversation with the tutor that carries the
 * whole chapter. Questions appear in the thread when the lesson reaches them,
 * the next part is one button once this one is done, and the textbook is a
 * drawer to open for reference rather than a second place to look.
 */
export function LessonScreen({ chapterId }: LessonScreenProps) {
  const { phase, instance, payload, transcript, earlier, openTurnId, report, errorMessage, isSending, ...actions } =
    useLessonStore();
  const [textbookOpen, setTextbookOpen] = useState(false);

  useEffect(() => {
    useLessonStore.getState().loadChapter(chapterId);
    return () => useLessonStore.getState().reset();
  }, [chapterId]);

  if (phase === "idle" || phase === "loading") {
    return (
      <div className="flex h-full items-center justify-center text-[#94A3B8]">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-[#64748B]">
        <p>{errorMessage ?? "Something went wrong loading this lesson."}</p>
        <Button onClick={() => useLessonStore.getState().loadChapter(chapterId)}>Retry</Button>
      </div>
    );
  }

  if (phase === "blocked" && instance) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-[#64748B]">
        <p className="font-bold text-[var(--primary-ink)]">Let&apos;s pause here.</p>
        <p>
          {instance.blocked?.blocked_reason === "content_gap"
            ? "The next part of this chapter isn't ready yet."
            : "This part needs a little help from your teacher before you continue."}
        </p>
      </div>
    );
  }

  if (phase === "completed" && report) {
    return (
      <div className="h-full overflow-y-auto">
        <ChapterReportView report={report} />
      </div>
    );
  }

  if (!instance || !payload) return null;

  const step = deriveStep(instance, payload, openTurnId !== null);

  return (
    <div className="flex h-full flex-col">
      <LessonHeader instance={instance} textbookOpen={textbookOpen} onToggleTextbook={() => setTextbookOpen((o) => !o)} />
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <LessonThread
            earlier={earlier}
            partTitle={instance.active_node?.title ?? "This part"}
            transcript={transcript}
            step={step}
            isSending={isSending}
            onSend={actions.sendMessage}
            onStop={actions.stopTeacher}
            onRegenerate={actions.regenerateLastTurn}
            onAnswer={actions.submitAnswer}
            onHint={actions.requestHint}
            onContinue={actions.markNodeDone}
          />
        </div>
        {textbookOpen && (
          <div className="absolute inset-0 z-10 sm:static sm:inset-auto">
            <TextbookDrawer payload={payload} onClose={() => setTextbookOpen(false)} />
          </div>
        )}
      </div>
      {errorMessage && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{errorMessage}</div>
      )}
    </div>
  );
}
