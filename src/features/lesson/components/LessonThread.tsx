"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AnswerResponse } from "../types/lesson";
import type { EarlierPart, TranscriptTurn } from "../store/useLessonStore";
import type { LessonStep } from "../store/lessonFlow";
import { CheckCard } from "./CheckCard";
import { EarlierPartSummary, PartDivider, TurnView } from "./TurnView";

interface LessonThreadProps {
  earlier: EarlierPart[];
  partLabel: string;
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
 * The lesson as one conversation. At every moment exactly one action is highlighted,
 * derived from the lesson state (`deriveStep`): wait for the tutor, retry a failed reply,
 * reply to the tutor, answer the question the lesson has reached, or move on. The input
 * box stays available for questions, and its label always says what it is for.
 */
export function LessonThread(props: LessonThreadProps) {
  const { earlier, partLabel, transcript, step, isSending, onSend, onStop, onRegenerate, onAnswer, onHint, onContinue } =
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
  const canSend = !speaking && step.kind !== "retry" && input.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSend(input.trim());
    setInput("");
  };

  const guide = guideFor(step);
  const lastIndex = transcript.length - 1;

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        {/* Fades text scrolling under the header instead of cutting it mid-line. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6"
          style={{ background: "linear-gradient(var(--surface-page, #F7F8FC), transparent)" }}
        />
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 pb-6 pt-4 sm:px-8">
            {earlier.map((part) => (
              <EarlierPartSummary key={part.instanceNodeId} part={part} />
            ))}

            <PartDivider label={partLabel} />
            {transcript.map((turn, i) => (
              <TurnView key={turn.turnId} turn={turn} onRegenerate={i === lastIndex ? onRegenerate : undefined} />
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
                  <p className="text-sm font-bold text-[var(--primary-ink)]">
                    {step.isLastPart ? "That's the last part of this chapter" : "You've finished this part"}
                  </p>
                  <p className="text-xs text-[#64748B]">Ask your tutor anything else, or move on when you&apos;re ready.</p>
                </div>
                <Button onClick={onContinue} trailingIcon={<ArrowRight size={16} />}>
                  {step.isLastPart ? "Finish chapter" : "Next part"}
                </Button>
              </div>
            )}

            {step.kind === "waiting" && (
              <p className="ml-10 animate-pulse text-xs font-medium text-[#94A3B8]">Checking your answers…</p>
            )}
            <div ref={endRef} />
          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(4,46,92,0.06)] bg-white">
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-3 sm:px-8">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold" style={{ color: guide.highlight ? "var(--tutor)" : "#94A3B8" }}>
              {guide.label}
            </p>
            {step.kind === "reply" && !step.canMoveOn && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#94A3B8]">
                {step.repliesDone} of {step.repliesNeeded} replies
                <span className="flex gap-1">
                  {Array.from({ length: step.repliesNeeded }, (_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-4 rounded-full"
                      style={{ background: i < step.repliesDone ? "var(--tutor)" : "#E2E8F0" }}
                    />
                  ))}
                </span>
              </span>
            )}
            {step.kind === "reply" && step.canMoveOn && (
              // A quiet secondary choice: answering the tutor stays the main action.
              // eslint-disable-next-line no-restricted-syntax
              <button
                type="button"
                onClick={onContinue}
                className="text-xs font-semibold text-[#94A3B8] underline-offset-2 hover:text-[var(--primary-ink)] hover:underline"
              >
                {step.isLastPart ? "Skip and finish the chapter" : "Skip to the next part"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              disabled={speaking || step.kind === "retry"}
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
    case "retry":
      return { label: "Your tutor's reply didn't come through. Try again above.", placeholder: "", highlight: false };
    case "reply":
      return step.canMoveOn
        ? { label: "Your turn: answer your tutor's question", placeholder: "Type your answer…", highlight: true }
        : { label: "Your turn: reply to your tutor", placeholder: "Type your reply…", highlight: true };
    case "check":
      return { label: "Answer the question above. Stuck? Ask here.", placeholder: "Ask your tutor for help…", highlight: false };
    case "continue":
      return { label: "Any questions before moving on?", placeholder: "Ask your tutor…", highlight: false };
    case "waiting":
      return { label: "One moment…", placeholder: "Ask your tutor…", highlight: false };
  }
  return { label: "", placeholder: "", highlight: false };
}
