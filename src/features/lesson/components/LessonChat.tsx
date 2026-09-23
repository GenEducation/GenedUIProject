"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Square, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "@/features/student/components/MarkdownRenderer";
import type { TranscriptTurn } from "../store/useLessonStore";

interface LessonChatProps {
  transcript: TranscriptTurn[];
  openTurnId: string | null;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  disabled?: boolean;
}

const FAILURE_COPY: Record<string, string> = {
  first_token_timeout: "The teacher took too long to start answering.",
  stream_interrupted: "The connection dropped mid-answer.",
  model_error: "Something went wrong generating a reply.",
  policy_refused: "That reply was blocked by a safety policy.",
  safety_refused: "That reply was blocked by a safety policy.",
  safety_unavailable: "Safety checking is unavailable right now.",
  prepare_failed: "Could not prepare the teacher's reply.",
  record_failed: "Could not record what happened.",
  context_drift: "The lesson moved on before the reply finished.",
};

/**
 * The AI Tutor panel — visual language mirrors ChatMessageBubble
 * (src/features/student/components): the learner's turn is a filled
 * `var(--tutor)` bubble; the teacher's reply carries no bubble at all, since
 * it is long-form lesson content rather than small talk, distinguished only
 * by a small avatar.
 */
export function LessonChat({ transcript, openTurnId, onSend, onStop, onRegenerate, disabled }: LessonChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  const handleSend = () => {
    if (!input.trim() || openTurnId) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2.5 border-b border-[rgba(4,46,92,0.06)] px-4 py-3.5">
        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-white" style={{ border: "1px solid #E2E8F0" }}>
          <Image src="/Favicon1.jpg" alt="AI Tutor" width={32} height={32} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--primary-ink)]">AI Tutor</p>
          <p className="truncate text-xs text-[#94A3B8]">Ask anything about this lesson</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {transcript.map((turn) => (
          <div key={turn.turnId} className="mb-5">
            {turn.learnerText && (
              <div className="mb-2 flex justify-end">
                <div
                  className="max-w-[85%] px-4 py-2.5 text-[13.5px] text-white"
                  style={{
                    borderRadius: "1.75rem",
                    borderTopRightRadius: 6,
                    background: "var(--tutor)",
                    boxShadow: "0 2px 10px rgba(91,77,199,0.18)",
                  }}
                >
                  {turn.learnerText}
                </div>
              </div>
            )}
            {(turn.teacherText || turn.status === "streaming") && (
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-white" style={{ border: "1px solid #E2E8F0" }}>
                  <Image src="/Favicon1.jpg" alt="" width={28} height={28} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-[#1A202C]">
                  {turn.teacherText ? (
                    <MarkdownRenderer content={turn.teacherText} />
                  ) : (
                    <span className="animate-pulse font-medium text-[#94A3B8]">Thinking…</span>
                  )}
                  {turn.status === "streaming" && turn.teacherText && (
                    <span className="ml-0.5 animate-pulse text-[var(--tutor)]">▍</span>
                  )}
                </div>
              </div>
            )}
            {turn.status === "interrupted" && <p className="ml-9 mt-1 text-xs text-[#94A3B8]">Stopped</p>}
            {turn.status === "failed" && (
              <div className="ml-9 mt-1 flex items-center gap-2">
                <p className="text-xs text-[var(--danger,#E8635A)]">{FAILURE_COPY[turn.failedReason ?? ""] ?? "That reply failed."}</p>
                {turn.retryable && (
                  <Button size="sm" variant="tertiary" onClick={onRegenerate} leadingIcon={<RotateCcw size={12} />}>
                    Try again
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-[rgba(4,46,92,0.06)] p-3">
        <input
          type="text"
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={openTurnId ? "The teacher is replying…" : "Ask a question or answer here"}
          className="flex-1 rounded-full border px-4 py-2 text-sm text-[var(--primary-ink)] focus:outline-none disabled:bg-[#F7F8FC]"
          style={{ borderColor: "#E2E8F0" }}
        />
        {openTurnId ? (
          <Button iconOnly pill aria-label="Stop" onClick={onStop}>
            <Square size={14} fill="currentColor" />
          </Button>
        ) : (
          <Button iconOnly pill aria-label="Send" disabled={disabled || !input.trim()} onClick={handleSend}>
            <Send size={15} />
          </Button>
        )}
      </div>
    </div>
  );
}
