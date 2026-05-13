import { useRef, useEffect } from "react";
import { Question } from "../../types/test";

interface ShortAnswerQuestionProps {
  question: Question;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ShortAnswerQuestion({ 
  question, 
  value = "", 
  onChange, 
  disabled 
}: ShortAnswerQuestionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="space-y-4">
      <p className="text-[17px] font-medium text-[#042E5C] leading-relaxed">
        {question.prompt}
      </p>
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={question.type === "open_ended" ? "Write your explanation here..." : "Your answer..."}
        rows={1}
        className="w-full p-4 rounded-xl border-2 border-[#042E5C]/10 focus:border-[#042E5C]/30 focus:ring-4 focus:ring-[#042E5C]/5 outline-none transition-all text-[15px] resize-none overflow-hidden min-h-[56px]"
      />
    </div>
  );
}
