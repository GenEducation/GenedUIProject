"use client";

import { useEffect, useRef, useState } from "react";
import { Square, RotateCcw } from "lucide-react";
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
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {transcript.map((turn) => (
          <div key={turn.turnId} className="mb-4">
            {turn.learnerText && (
              <div className="mb-1 flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white">
                  {turn.learnerText}
                </div>
              </div>
            )}
            {(turn.teacherText || turn.status === "streaming") && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800">
                  {turn.teacherText ? (
                    <MarkdownRenderer content={turn.teacherText} />
                  ) : (
                    <span className="text-slate-400">…</span>
                  )}
                  {turn.status === "streaming" && <span className="ml-1 animate-pulse text-slate-400">▍</span>}
                </div>
              </div>
            )}
            {turn.status === "interrupted" && <p className="mt-1 pl-1 text-xs text-slate-400">Stopped</p>}
            {turn.status === "failed" && (
              <div className="mt-1 flex items-center gap-2 pl-1">
                <p className="text-xs text-red-500">{FAILURE_COPY[turn.failedReason ?? ""] ?? "That reply failed."}</p>
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

      <div className="flex items-center gap-2 border-t border-slate-200 p-3">
        <input
          type="text"
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={openTurnId ? "The teacher is replying…" : "Ask a question or answer here"}
          className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-slate-50"
        />
        {openTurnId ? (
          <Button iconOnly pill aria-label="Stop" onClick={onStop}>
            <Square size={14} fill="currentColor" />
          </Button>
        ) : (
          <Button pill disabled={disabled || !input.trim()} onClick={handleSend}>
            Send
          </Button>
        )}
      </div>
    </div>
  );
}
