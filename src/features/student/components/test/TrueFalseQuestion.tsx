"use client";

import { motion } from "framer-motion";
import { Question } from "../../types/test";

interface TrueFalseQuestionProps {
  question: Question;
  selectedAnswer?: string;
  justification?: string;
  onSelect: (answer: string) => void;
  onJustificationChange?: (value: string) => void;
  disabled?: boolean;
}

export function TrueFalseQuestion({
  question,
  selectedAnswer,
  justification = "",
  onSelect,
  onJustificationChange,
  disabled,
}: TrueFalseQuestionProps) {
  return (
    <div className="space-y-4">
      <p className="text-[17px] font-medium text-[#042E5C] leading-relaxed">
        {question.prompt}
      </p>

      <div className="flex gap-3">
        {["True", "False"].map((option) => {
          const isSelected = selectedAnswer === option;
          return (
            <motion.button
              key={option}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              onClick={() => !disabled && onSelect(option)}
              className={`flex-1 p-4 rounded-xl text-center transition-all border-2 flex items-center justify-center gap-2 ${
                isSelected
                  ? "bg-[#042E5C]/5 border-[#042E5C] text-[#042E5C]"
                  : "bg-white border-[#042E5C]/10 text-[#042E5C]/70 hover:border-[#042E5C]/30"
              } ${disabled ? "cursor-default" : "cursor-pointer"}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "border-[#042E5C] bg-[#042E5C]" : "border-[#042E5C]/20"
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="text-[15px] font-semibold">{option}</span>
            </motion.button>
          );
        })}
      </div>

      {question.justification_required && selectedAnswer && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <label className="block text-[13px] font-semibold text-[#042E5C]/60 uppercase tracking-wider mb-2">
            Explain your answer
          </label>
          <textarea
            value={justification}
            onChange={(e) => onJustificationChange?.(e.target.value)}
            disabled={disabled}
            placeholder="Write your justification here..."
            rows={3}
            className="w-full p-4 rounded-xl border-2 border-[#042E5C]/10 focus:border-[#042E5C]/30 focus:ring-4 focus:ring-[#042E5C]/5 outline-none transition-all text-[15px] resize-none"
          />
        </motion.div>
      )}
    </div>
  );
}
