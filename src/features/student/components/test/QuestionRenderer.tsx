"use client";

import { Question } from "../../types/test";
import { MultipleChoiceQuestion } from "./MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "./ShortAnswerQuestion";
import { TrueFalseQuestion } from "./TrueFalseQuestion";
import { MatchTheFollowingQuestion } from "./MatchTheFollowingQuestion";
import { AssertionReasoningQuestion } from "./AssertionReasoningQuestion";
import { ExtractBasedQuestion } from "./ExtractBasedQuestion";

interface QuestionRendererProps {
  question: Question;
  questionNumber: number;
  answer?: string;
  justification?: string;
  matchSelections?: Record<number, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onJustificationChange?: (questionId: string, value: string) => void;
  onMatchSelectionChange?: (questionId: string, selections: Record<number, string>) => void;
  disabled?: boolean;
}

export function QuestionRenderer({
  question,
  questionNumber,
  answer,
  justification,
  matchSelections,
  onAnswerChange,
  onJustificationChange,
  onMatchSelectionChange,
  disabled,
}: QuestionRendererProps) {
  const marksLabel = question.marks === 1 ? "1 mark" : `${question.marks} marks`;

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#042E5C]/8 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-black text-[#042E5C]/40 uppercase tracking-widest">
          Q{questionNumber}
        </span>
        <span className="px-3 py-1 rounded-full bg-[#042E5C]/5 text-[11px] font-bold text-[#042E5C]/60 uppercase tracking-wider">
          {marksLabel}
        </span>
      </div>

      {renderQuestion()}
    </div>
  );

  function renderQuestion() {
    switch (question.type) {
      case "multiple_choice":
        return (
          <MultipleChoiceQuestion
            question={question}
            selectedAnswer={answer}
            onSelect={(val) => onAnswerChange(question.question_id, val)}
            disabled={disabled}
          />
        );

      case "true_false":
        return (
          <TrueFalseQuestion
            question={question}
            selectedAnswer={answer}
            justification={justification}
            onSelect={(val) => onAnswerChange(question.question_id, val)}
            onJustificationChange={(val) =>
              onJustificationChange?.(question.question_id, val)
            }
            disabled={disabled}
          />
        );

      case "match_the_following":
        return (
          <MatchTheFollowingQuestion
            question={question}
            selections={matchSelections ?? {}}
            onSelectionChange={(sel) =>
              onMatchSelectionChange?.(question.question_id, sel)
            }
            disabled={disabled}
          />
        );

      case "assertion_reasoning":
        return (
          <AssertionReasoningQuestion
            question={question}
            selectedAnswer={answer}
            onSelect={(val) => onAnswerChange(question.question_id, val)}
            disabled={disabled}
          />
        );

      case "extract_based":
        return (
          <ExtractBasedQuestion
            question={question}
            value={answer}
            onChange={(val) => onAnswerChange(question.question_id, val)}
            disabled={disabled}
          />
        );

      case "short_answer":
      case "long_answer":
      case "open_ended":
      case "application":
      case "fill_in_the_blank":
        return (
          <ShortAnswerQuestion
            question={question}
            value={answer}
            onChange={(val) => onAnswerChange(question.question_id, val)}
            disabled={disabled}
          />
        );

      default:
        return (
          <ShortAnswerQuestion
            question={question}
            value={answer}
            onChange={(val) => onAnswerChange(question.question_id, val)}
            disabled={disabled}
          />
        );
    }
  }
}
