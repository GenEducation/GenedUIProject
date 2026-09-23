"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLessonStore } from "../store/useLessonStore";
import { LessonHeader } from "./LessonHeader";
import { LessonChat } from "./LessonChat";
import { LessonPanel } from "./LessonPanel";
import { ChapterReportView } from "./ChapterReportView";

interface LessonScreenProps {
  chapterId: string;
}

/**
 * The learner's lesson screen: the textbook content and checks for the
 * active node on the left, the AI Tutor conversation on the right — the
 * conversation is a helper alongside the lesson, not the only thing on
 * screen (ADR 0006's only prior teaching loop was an uncommitted prototype,
 * so there was no existing layout to match).
 */
export function LessonScreen({ chapterId }: LessonScreenProps) {
  const { phase, instance, payload, transcript, openTurnId, report, errorMessage, isSending, ...actions } =
    useLessonStore();

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
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[#64748B]">
        <p className="font-bold text-[var(--primary-ink)]">This part is blocked.</p>
        <p>
          {instance.blocked?.blocked_reason === "content_gap"
            ? "There's a gap in the content this student would need next."
            : "This student needs support before continuing."}
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

  return (
    <div className="flex h-full flex-col">
      <LessonHeader instance={instance} />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <LessonPanel
            instance={instance}
            payload={payload}
            isSending={isSending}
            onAnswer={actions.submitAnswer}
            onHint={actions.requestHint}
            onDone={actions.markNodeDone}
          />
        </div>
        <div className="w-[380px] flex-none border-l border-[rgba(4,46,92,0.06)]">
          <LessonChat
            transcript={transcript}
            openTurnId={openTurnId}
            onSend={actions.sendMessage}
            onStop={actions.stopTeacher}
            onRegenerate={actions.regenerateLastTurn}
          />
        </div>
      </div>
      {errorMessage && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{errorMessage}</div>
      )}
    </div>
  );
}
