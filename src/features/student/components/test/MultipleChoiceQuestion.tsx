"use client";

import { motion } from "framer-motion";
import { Question } from "../../types/test";

interface MultipleChoiceQuestionProps {
  question: Question;
  selectedAnswer?: string;
  onSelect: (answer: string) => void;
  disabled?: boolean;
}

export function MultipleChoiceQuestion({ 
  question, 
  selectedAnswer, 
  onSelect, 
  disabled 
}: MultipleChoiceQuestionProps) {
  return (
    <div className="space-y-4">
      <p className="text-[17px] font-medium text-[#042E5C] leading-relaxed">
        {question.prompt}
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
              className={`w-full p-4 rounded-xl text-left transition-all border-2 flex items-center gap-3 ${
                isSelected 
                  ? "bg-[#042E5C]/5 border-[#042E5C] text-[#042E5C]" 
                  : "bg-white border-[#042E5C]/10 text-[#042E5C]/70 hover:border-[#042E5C]/30"
              } ${disabled ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected ? "border-[#042E5C] bg-[#042E5C]" : "border-[#042E5C]/20"
              }`}>
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
