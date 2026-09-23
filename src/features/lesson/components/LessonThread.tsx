"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, RotateCcw, Send, Square, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "@/features/student/components/MarkdownRenderer";
import type { AnswerResponse } from "../types/lesson";
import type { EarlierPart, TranscriptTurn } from "../store/useLessonStore";
import type { LessonStep } from "../store/lessonFlow";
import { CheckCard } from "./CheckCard";

const FAILURE_COPY: Record<string, string> = {
  first_token_timeout: "Your tutor took too long to answer.",
  stream_interrupted: "The connection dropped mid-answer.",
  model_error: "Something went wrong with that reply.",
  policy_refused: "Your tutor couldn't answer that one.",
  safety_refused: "Your tutor couldn't answer that one.",
  safety_unavailable: "Your tutor is unavailable for a moment.",
  prepare_failed: "Your tutor couldn't get ready to answer.",
  record_failed: "That couldn't be saved.",
  context_drift: "The lesson moved on before the reply finished.",
};

function Avatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex-shrink-0 overflow-hidden rounded-full bg-white"
      style={{ width: size, height: size, border: "1px solid #E2E8F0" }}
    >
      <Image src="/Favicon1.jpg" alt="" width={size} height={size} className="h-full w-full object-cover" />
    </div>
  );
}

function TurnView({ turn, onRegenerate }: { turn: TranscriptTurn; onRegenerate?: () => void }) {
  return (
    <div className="mb-6">
      {turn.learnerText && (
        <div className="mb-3 flex flex-col items-end gap-1">
          <div
            className="max-w-[80%] px-4 py-2.5 text-[14px] text-white"
            style={{
              borderRadius: "1.5rem",
              borderTopRightRadius: 6,
              background: "var(--tutor)",
              boxShadow: "0 2px 10px rgba(91,77,199,0.18)",
            }}
          >
            {turn.learnerText}
          </div>
          {turn.answer && <AnswerBadge answer={turn.answer} />}
        </div>
      )}
      {(turn.teacherText || turn.status === "streaming") && (
        <div className="flex items-start gap-3">
          <Avatar />
          <div className="min-w-0 flex-1 pt-0.5 text-[14.5px] leading-relaxed text-[#1A202C]">
            {turn.teacherText ? (
              <MarkdownRenderer content={turn.teacherText} />
            ) : (
              <span className="animate-pulse font-medium text-[#94A3B8]">Thinking…</span>
            )}
          </div>
        </div>
      )}
      {turn.status === "interrupted" && <p className="ml-10 mt-1 text-xs text-[#94A3B8]">You stopped this reply.</p>}
      {turn.status === "failed" && (
        <div className="ml-10 mt-1 flex items-center gap-2">
          <p className="text-xs text-[#E8635A]">{FAILURE_COPY[turn.failedReason ?? ""] ?? "That reply failed."}</p>
          {turn.retryable && onRegenerate && (
            <Button size="sm" variant="tertiary" onClick={onRegenerate} leadingIcon={<RotateCcw size={12} />}>
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function AnswerBadge({ answer }: { answer: NonNullable<TranscriptTurn["answer"]> }) {
  if (answer.correct === true) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
        <CheckCircle2 size={13} /> Correct
      </span>
    );
  }
  if (answer.correct === false) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-[#E8635A]">
        <XCircle size={13} /> Not quite
      </span>
    );
  }
  return <span className="text-xs font-semibold text-[#94A3B8]">Answer recorded</span>;
}

function PartDivider({ title, done }: { title: string; done?: boolean }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#E2E8F0]" />
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
        {done && <CheckCircle2 size={12} className="text-[var(--primary)]" />}
        {title}
      </span>
      <div className="h-px flex-1 bg-[#E2E8F0]" />
    </div>
  );
}

interface LessonThreadProps {
  earlier: EarlierPart[];
  partTitle: string;
  transcript: TranscriptTurn[];
  step: LessonStep;
  isSending: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onAnswer: (itemId: string, response: AnswerResponse, latencyMs: number, displayText: string) => void;
  onHint: (itemId: string) => void;
  onContinue: () => void;
}

/**
 * The lesson as one conversation. At every moment exactly one action is
 * highlighted, derived from the lesson state (`deriveStep`): talk to the
 * tutor, answer the question the thread just raised, or continue. The input
 * box stays available for questions, but its label always says what it is for.
 */
export function LessonThread(props: LessonThreadProps) {
  const { earlier, partTitle, transcript, step, isSending, onSend, onStop, onRegenerate, onAnswer, onHint, onContinue } =
    props;
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript, step.kind]);

  useEffect(() => {
    if (step.kind === "reply") inputRef.current?.focus();
  }, [step.kind]);

  const speaking = step.kind === "tutor_speaking";
  const canSend = !speaking && input.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSend(input.trim());
    setInput("");
  };

  const guide = guideFor(step);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-2 sm:px-8">
          {earlier.map((part) => (
            <div key={part.instanceNodeId} className="opacity-70">
              <PartDivider title={part.title} done />
              {part.turns.map((turn) => (
                <TurnView key={turn.turnId} turn={turn} />
              ))}
            </div>
          ))}

          <PartDivider title={partTitle} />
          {transcript.map((turn, i) => (
            <TurnView
              key={turn.turnId}
              turn={turn}
              onRegenerate={i === transcript.length - 1 ? onRegenerate : undefined}
            />
          ))}

          {step.kind === "check" && (
            <div className="ml-10">
              <CheckCard
                key={step.check.id}
                check={step.check}
                ordinal={step.ordinal}
                total={step.total}
                disabled={isSending}
                onSubmit={(response, latencyMs, displayText) => onAnswer(step.check.id, response, latencyMs, displayText)}
                onHint={() => onHint(step.check.id)}
              />
            </div>
          )}

          {step.kind === "continue" && (
            <div
              className="ml-10 flex flex-col items-start gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
              style={{ background: "rgba(5,159,109,0.07)", border: "1px solid rgba(5,159,109,0.18)" }}
            >
              <div>
                <p className="text-sm font-bold text-[var(--primary-ink)]">You&apos;ve finished this part</p>
                <p className="text-xs text-[#64748B]">Ask your tutor anything else, or move on when you&apos;re ready.</p>
              </div>
              <Button onClick={onContinue} trailingIcon={<ArrowRight size={16} />}>
                Next part
              </Button>
            </div>
          )}

          {step.kind === "waiting" && (
            <p className="ml-10 animate-pulse text-xs font-medium text-[#94A3B8]">Checking your answers…</p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-[rgba(4,46,92,0.06)] bg-white">
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-3 sm:px-8">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold" style={{ color: guide.highlight ? "var(--tutor)" : "#94A3B8" }}>
              {guide.label}
            </p>
            {step.kind === "reply" && (
              <span className="flex gap-1">
                {Array.from({ length: step.repliesNeeded }, (_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-5 rounded-full"
                    style={{ background: i < step.repliesDone ? "var(--tutor)" : "#E2E8F0" }}
                  />
                ))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              disabled={speaking}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={guide.placeholder}
              className="flex-1 rounded-full border px-4 py-2.5 text-sm text-[var(--primary-ink)] focus:outline-none disabled:bg-[#F7F8FC]"
              style={{ borderColor: guide.highlight ? "var(--tutor)" : "#E2E8F0" }}
            />
            {speaking ? (
              <Button iconOnly pill aria-label="Stop" onClick={onStop}>
                <Square size={14} fill="currentColor" />
              </Button>
            ) : (
              <Button iconOnly pill aria-label="Send" disabled={!canSend} onClick={send}>
                <Send size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function guideFor(step: LessonStep): { label: string; placeholder: string; highlight: boolean } {
  switch (step.kind) {
    case "tutor_speaking":
      return { label: "Your tutor is explaining…", placeholder: "Wait for your tutor, or press stop", highlight: false };
    case "reply":
      return { label: "Your turn: reply to your tutor", placeholder: "Type your reply…", highlight: true };
    case "check":
      return { label: "Answer the question above. Stuck? Ask here.", placeholder: "Ask your tutor for help…", highlight: false };
    case "continue":
      return { label: "Any questions before moving on?", placeholder: "Ask your tutor…", highlight: false };
    case "waiting":
      return { label: "One moment…", placeholder: "Ask your tutor…", highlight: false };
  }
}
