"use client";

import { memo } from "react";
import { RotateCcw } from "lucide-react";
import { StudentBlobatar } from "@/features/student/components/StudentBlobatar";
import { StudentAvatar } from "@/features/student/components/StudentAvatar";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { picturesFor, useLessonStore } from "../useLessonStore";
import { replyText, type LessonTurn } from "../transcript";
import type { FailureReason } from "../types";
import { LessonMarkdown } from "./LessonMarkdown";

/** What the learner sees when a turn fails; never the internal reason. */
function failureCopy(reason: FailureReason): string {
  if (reason === "safety_refused" || reason === "policy_refused") return "Let's keep to the lesson. Try asking another way.";
  if (reason === "stream_interrupted") return "The connection dropped before the answer finished.";
  return "Your tutor couldn't answer just now.";
}

const timeOf = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

interface ChatTurnProps {
  turn: LessonTurn;
  /** Open a presented figure on the whiteboard. */
  onShowFigure: (figureGroupId: string) => void;
  onRetry: (turnId: string) => void;
}

/** One exchange: the learner's message (if the turn had one), then the tutor's reply. */
export const ChatTurn = memo(function ChatTurn({ turn, onShowFigure, onRetry }: ChatTurnProps) {
  const avatarId = useStudentStore((s) => s.avatarId);
  const manifest = useLessonStore((s) => s.manifest);
  const text = replyText(turn);
  const streaming = turn.status === "streaming";
  const time = timeOf(turn.createdAt);
  const figures = turn.figureGroupIds
    .map((id) => ({ id, picture: picturesFor(manifest, id)[0] }))
    .filter((f) => f.picture);

  return (
    <li className="flex flex-col gap-3">
      {turn.learnerText && (
        <div className="flex items-end justify-end gap-2">
          <div className="flex max-w-[82%] flex-col items-end">
            <p className="whitespace-pre-wrap break-words rounded-[18px] rounded-br-md bg-[var(--ls-soft)] px-3.5 py-2.5 text-[14px] leading-relaxed">
              {turn.learnerText}
            </p>
            {time && <span className="mt-1 text-[11px] text-[var(--ls-ink-faint)]">{time}</span>}
          </div>
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white">
            <StudentAvatar id={avatarId} size={32} alt="" />
          </div>
        </div>
      )}

      {(text || streaming || figures.length > 0 || turn.status === "failed" || turn.status === "interrupted") && (
      <div className="flex items-start gap-2">
        <div className="shrink-0 rounded-full bg-[var(--ls-soft)] p-0.5">
          <StudentBlobatar size={30} decorative />
        </div>
        <div className="flex min-w-0 max-w-[88%] flex-col items-start">
          <div className="min-w-0 rounded-[18px] rounded-tl-md border border-[var(--ls-border)] bg-[#F3F8F6] px-3.5 py-2.5 text-[14px] leading-relaxed">
            {text ? (
              <div className={streaming ? "lesson-caret" : undefined}>
                <LessonMarkdown text={text} />
              </div>
            ) : streaming ? (
              <span className="flex items-center gap-1 py-1.5" role="status" aria-label="Your tutor is typing">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="lesson-typing-dot" style={{ animationDelay: `${i * 140}ms` }} />
                ))}
              </span>
            ) : null}

            {figures.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {figures.map(({ id, picture }) => (
                  // eslint-disable-next-line no-restricted-syntax -- a figure thumbnail that opens it on the whiteboard.
                  <button
                    key={id}
                    type="button"
                    onClick={() => onShowFigure(id)}
                    aria-label="Show this figure on the whiteboard"
                    className="overflow-hidden rounded-xl border border-[var(--ls-border)] bg-white p-1.5 transition-shadow hover:shadow-[var(--ls-shadow)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed, expiring API URL; next/image can't cache it. */}
                    <img src={picture!.src} alt="" className="block h-24 w-auto max-w-[200px] object-contain" />
                  </button>
                ))}
              </div>
            )}

            {turn.status === "failed" && turn.failure && (
              <div role="alert" className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--ls-ink-mid)]">
                <span>{failureCopy(turn.failure.reason)}</span>
                {turn.failure.retryable && (
                  // eslint-disable-next-line no-restricted-syntax -- an inline text action inside the bubble.
                  <button
                    type="button"
                    onClick={() => onRetry(turn.turnId)}
                    className="inline-flex items-center gap-1 font-semibold text-[var(--ls-primary)] hover:underline"
                  >
                    <RotateCcw size={13} aria-hidden /> Try again
                  </button>
                )}
              </div>
            )}
            {turn.status === "interrupted" && <p className="mt-1 text-[12px] italic text-[var(--ls-ink-faint)]">Stopped</p>}
          </div>
          {!turn.learnerText && time && !streaming && <span className="mt-1 text-[11px] text-[var(--ls-ink-faint)]">{time}</span>}
        </div>
      </div>
      )}
    </li>
  );
});
