"use client";

import { motion } from "framer-motion";
import { Question } from "../../types/test";

interface AssertionReasoningQuestionProps {
  question: Question;
  selectedAnswer?: string;
  onSelect: (answer: string) => void;
  disabled?: boolean;
}

export function AssertionReasoningQuestion({
  question,
  selectedAnswer,
  onSelect,
  disabled,
}: AssertionReasoningQuestionProps) {
  const hasStructuredFields = question.assertion && question.reason;

  return (
    <div className="space-y-5">
      {hasStructuredFields ? (
        <div className="space-y-3">
          <div className="p-3 sm:p-4 rounded-xl bg-[var(--soft-surface)]/50 border border-[var(--soft-surface)]">
            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-widest">
              Assertion (A)
            </span>
            <p className="text-[15px] font-medium text-[var(--primary-ink)] mt-1 leading-relaxed">
              {question.assertion}
            </p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-[var(--canvas)] border border-[var(--surface-border)]">
            <span className="text-[11px] font-black text-[var(--text-mid)] uppercase tracking-widest">
              Reason (R)
            </span>
            <p className="text-[15px] font-medium text-[var(--primary-ink)] mt-1 leading-relaxed">
              {question.reason}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[15px] sm:text-[17px] font-medium text-[var(--primary-ink)] leading-relaxed whitespace-pre-line">
          {question.prompt}
        </p>
      )}

      <p className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        Choose the correct option
      </p>

      <div className="grid gap-3">
        {question.options?.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          return (
            <motion.button
              key={idx}
              whileHover={!disabled ? { scale: 1.01 } : {}}
              whileTap={!disabled ? { scale: 0.99 } : {}}
              onClick={() => !disabled && onSelect(option)}
              className={`w-full p-3 sm:p-4 rounded-xl text-left transition-all border-2 flex items-center gap-3 ${
                isSelected
                  ? "bg-[var(--soft-surface)]/50 border-[var(--primary)] text-[var(--ink)]"
                  : "bg-white border-[var(--surface-border)] text-[var(--text-mid)] hover:border-[var(--primary)]/40"
              } ${disabled ? "cursor-default" : "cursor-pointer"}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--primary-ink)]/20"
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="text-[15px] font-medium">{option}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
