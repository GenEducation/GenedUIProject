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
      {question.extract_passage && (
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} className="text-slate-400" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Read the passage carefully
            </span>
          </div>
          <p className="text-[15px] text-[#042E5C]/80 leading-relaxed italic whitespace-pre-line">
            &ldquo;{question.extract_passage}&rdquo;
          </p>
        </div>
      )}

      <div className="text-[15px] font-medium text-[#042E5C] leading-relaxed whitespace-pre-line">
        {question.prompt}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={"Answer all parts here...\n(a) ...\n(b) ..."}
        rows={4}
        className="w-full p-4 rounded-xl border-2 border-[#042E5C]/10 focus:border-[#042E5C]/30 focus:ring-4 focus:ring-[#042E5C]/5 outline-none transition-all text-[15px] resize-none overflow-hidden min-h-[100px]"
      />
    </div>
  );
}
