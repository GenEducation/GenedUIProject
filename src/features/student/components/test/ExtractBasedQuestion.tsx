"use client";

import { useRef, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { Question } from "../../types/test";

interface ExtractBasedQuestionProps {
  question: Question;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ExtractBasedQuestion({
  question,
  value = "",
  onChange,
  disabled,
}: ExtractBasedQuestionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="space-y-5">
      {/* Passage as a quoted extract: canvas sheet with a teal margin rule. */}
      {question.extract_passage && (
        <div className="relative p-3 sm:p-5 rounded-2xl bg-[var(--canvas)] border border-[var(--surface-border)] border-l-4 border-l-[var(--primary)]">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} className="text-[var(--primary)]" />
            <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              Read the passage carefully
            </span>
          </div>
          <p className="text-[15px] text-[var(--primary-ink)]/80 leading-relaxed italic whitespace-pre-line">
            &ldquo;{question.extract_passage}&rdquo;
          </p>
        </div>
      )}

      <div className="text-[15px] font-medium text-[var(--primary-ink)] leading-relaxed whitespace-pre-line">
        {question.prompt}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={"Answer all parts here...\n(a) ...\n(b) ..."}
        rows={4}
        className="w-full p-3 sm:p-4 rounded-xl border-2 border-[var(--primary-ink)]/10 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 outline-none transition-all text-[15px] resize-none overflow-hidden min-h-[100px]"
      />
    </div>
  );
}
