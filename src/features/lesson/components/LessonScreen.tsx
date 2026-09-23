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
  chapterTitle?: string;
}

/**
 * The developer-facing lesson screen: exercises every learner endpoint and
 * every teacher-turn stream rule end to end (TEACHER_TURN_v1,
 * TEXT_STREAMING_TRANSPORT_v1 in the backend repo). Not a final design —
 * there was no prior UI here to extend (ADR 0006's only teaching loop was
 * an uncommitted prototype), so this is built for manual verification of
 * the real conversation first.
 */
export function LessonScreen({ chapterId, chapterTitle = "Lesson" }: LessonScreenProps) {
  const { phase, instance, payload, transcript, openTurnId, report, errorMessage, isSending, ...actions } =
    useLessonStore();

  useEffect(() => {
    useLessonStore.getState().loadChapter(chapterId);
    return () => useLessonStore.getState().reset();
  }, [chapterId]);

  if (phase === "idle" || phase === "loading") {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
        <p>{errorMessage ?? "Something went wrong loading this lesson."}</p>
        <Button onClick={() => useLessonStore.getState().loadChapter(chapterId)}>Retry</Button>
      </div>
    );
  }

  if (phase === "blocked" && instance) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
        <p className="font-medium text-slate-700">This part is blocked.</p>
        <p>
          {instance.blocked?.blocked_reason === "content_gap"
            ? "There's a gap in the content this student would need next."
            : "This student needs support before continuing."}
        </p>
      </div>
    );
  }

  if (phase === "completed" && report) {
    return <ChapterReportView report={report} />;
  }

  if (!instance || !payload) return null;

  return (
    <div className="flex h-full flex-col">
      <LessonHeader chapterTitle={chapterTitle} instance={instance} />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-[2] flex-col">
          <LessonChat
            transcript={transcript}
            openTurnId={openTurnId}
            onSend={actions.sendMessage}
            onStop={actions.stopTeacher}
            onRegenerate={actions.regenerateLastTurn}
          />
        </div>
        <div className="w-80 flex-none">
          <LessonPanel
            instance={instance}
            payload={payload}
            isSending={isSending}
            onAnswer={actions.submitAnswer}
            onHint={actions.requestHint}
            onDone={actions.markNodeDone}
          />
        </div>
      </div>
      {errorMessage && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{errorMessage}</div>
      )}
    </div>
  );
}
