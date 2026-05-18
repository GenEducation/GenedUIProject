"use client";

/**
 * ComprehensionWidget.tsx
 * Renders inline listening comprehension interactions inside the chat.
 * Follows Wave 2 §10 (widget philosophy: inline, lightweight, NOT full-screen modal).
 *
 * Supported widget_type values:
 *   mcq               — multiple choice
 *   fill_blank        — short text answer
 *   retell / free_response — open spoken/typed answer
 *   difficult_word    — tappable word chip with pronunciation
 */

import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useStudentStore } from "../store/useStudentStore";

interface ComprehensionWidgetProps {
  directiveId: string;
  widgetType: "mcq" | "fill_blank" | "retell" | "free_response" | "difficult_word";
  question?: string;
  choices?: Array<{ id: string; label: string }>;
  allowRetry?: boolean;
  // difficult_word props
  word?: string;
  syllables?: string[];
  phonetic?: string;
  slowAvailable?: boolean;
}

// ── Difficult Word Chip ───────────────────────────────────────────────────────

function DifficultWordChip({ directiveId, word, syllables, phonetic, slowAvailable }: ComprehensionWidgetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  const handlePlay = (slow: boolean) => {
    if (isPlaying) return;
    setIsPlaying(true);
    setIsSlow(slow);
    import("@/features/student/services/audioPlayerService").then(({ audioPlayerService }) => {
      audioPlayerService.playWord(directiveId, word || "", slow).finally(() => {
        setIsPlaying(false);
        setIsSlow(false);
      });
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex flex-col px-5 py-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 select-none"
    >
      <div className="flex items-center gap-6 justify-between">
        <span className="font-bold text-blue-800 text-lg leading-tight">{word}</span>
        
        <div className="flex items-center gap-2">
          {slowAvailable && (
            <button
              onClick={() => handlePlay(true)}
              disabled={isPlaying}
              title="Slower pronunciation"
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                isPlaying && isSlow
                  ? "bg-blue-200 text-blue-700 border-blue-300"
                  : "bg-white text-blue-500 border-blue-200 hover:bg-blue-100"
              }`}
            >
              slow
            </button>
          )}
          <button
            onClick={() => handlePlay(false)}
            disabled={isPlaying}
            title="Tap to hear pronunciation"
            className={`flex-shrink-0 transition-colors hover:opacity-70 ${isPlaying && !isSlow ? "text-blue-600 animate-pulse" : "text-blue-500"}`}
          >
            <Volume2 size={20} />
          </button>
        </div>
      </div>

      {((syllables && syllables.length > 0) || phonetic) && (
        <div className="flex items-center gap-2 mt-1">
          {syllables && syllables.length > 0 && (
            <span className="text-blue-500 text-[15px] font-medium tracking-wide">
              {syllables.join(" · ")}
            </span>
          )}
          {phonetic && (
            <span className="text-blue-400 text-xs italic">{phonetic}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── MCQ Widget ────────────────────────────────────────────────────────────────

function MCQWidget({ directiveId, question, choices, allowRetry }: ComprehensionWidgetProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [retries, setRetries] = useState(0);
  const { submitComprehensionAnswer, comprehensionResults, clearComprehensionResult } = useStudentStore();

  const result = comprehensionResults[directiveId];
  const isCorrect = result?.is_correct;
  const chosenLabel = result?.answer;

  const selectedChoice = choices?.find((c) => c.label === chosenLabel);
  const effectiveSelected = selected || selectedChoice?.id || null;
  const effectiveSubmitted = submitted || !!result;

  const handleSelect = async (choiceId: string, label: string) => {
    if (effectiveSubmitted && !allowRetry) return;
    setSelected(choiceId);
    setSubmitted(true);
    await submitComprehensionAnswer(directiveId, "mcq", label);
  };

  const handleRetry = () => {
    setSelected(null);
    setSubmitted(false);
    clearComprehensionResult(directiveId);
    setRetries(r => r + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 bg-white rounded-2xl border border-[#042E5C]/8 space-y-3"
    >
      {question && (
        <p className="text-sm font-semibold text-[#042E5C]/80 leading-snug">{question}</p>
      )}
      <div className="flex flex-col gap-2">
        {(choices || []).map((choice) => {
          const isSelected = effectiveSelected === choice.id;
          
          let buttonClass = "bg-[#F8F9FA] text-[#042E5C]/70 border-transparent hover:border-[#042E5C]/20 hover:bg-white";
          if (isSelected) {
            if (effectiveSubmitted && result !== undefined) {
              buttonClass = isCorrect
                ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10"
                : "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/10";
            } else {
              buttonClass = "bg-[#042E5C] text-white border-[#042E5C]";
            }
          }

          return (
            <button
              key={choice.id}
              onClick={() => handleSelect(choice.id, choice.label)}
              disabled={effectiveSubmitted && !allowRetry}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${buttonClass}`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>

      {/* Soft retry prompt — Wave 2 §10.6: never say "Wrong" or "Incorrect" */}
      <AnimatePresence>
        {effectiveSubmitted && allowRetry && retries < 2 && !isCorrect && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs font-bold text-[#042E5C]/40 hover:text-[#042E5C]/70 transition-colors mt-1"
          >
            <RefreshCw size={11} />
            Want to try once more?
          </motion.button>
        )}
        {effectiveSubmitted && result !== undefined && (isCorrect || !allowRetry || retries >= 2) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-center gap-1.5 text-xs font-bold ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}
          >
            {isCorrect ? (
              <>
                <Check size={12} className="stroke-[3]" /> Brilliant! That is correct. Let&apos;s continue!
              </>
            ) : (
              <>
                Not quite, but good effort — let&apos;s keep going!
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Fill-blank Widget ─────────────────────────────────────────────────────────

function FillBlankWidget({ directiveId, question }: ComprehensionWidgetProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { submitComprehensionAnswer, comprehensionResults } = useStudentStore();

  const result = comprehensionResults[directiveId];
  const isCorrect = result?.is_correct;
  const chosenAnswer = result?.answer;

  const effectiveSubmitted = submitted || !!result;
  const effectiveValue = value || chosenAnswer || "";

  const handleSubmit = async () => {
    if (!value.trim() || effectiveSubmitted) return;
    setSubmitted(true);
    await submitComprehensionAnswer(directiveId, "fill_blank", value.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 bg-white rounded-2xl border border-[#042E5C]/8 space-y-3"
    >
      {question && (
        <p className="text-sm font-semibold text-[#042E5C]/80 leading-snug">{question}</p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={effectiveValue}
          disabled={effectiveSubmitted}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Your answer..."
          className={`flex-1 px-4 py-2 rounded-xl border text-sm focus:outline-none transition-all disabled:opacity-80 ${
            effectiveSubmitted && result !== undefined
              ? isCorrect
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-rose-50 text-rose-800 border-rose-300"
              : "border-[#042E5C]/12 text-[#042E5C] bg-[#F8F9FA] focus:border-[#042E5C]/30 focus:bg-white"
          }`}
        />
        <button
          onClick={handleSubmit}
          disabled={effectiveSubmitted || !value.trim()}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            effectiveSubmitted && result !== undefined
              ? isCorrect
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white"
              : "bg-[#042E5C] text-white hover:bg-[#064282] disabled:opacity-30"
          }`}
        >
          {effectiveSubmitted && result !== undefined ? (
            isCorrect ? (
              <Check size={14} className="stroke-[3]" />
            ) : (
              <span className="font-bold text-xs">X</span>
            )
          ) : (
            "Send"
          )}
        </button>
      </div>

      {effectiveSubmitted && result !== undefined && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-xs font-bold mt-1.5 flex items-center gap-1 ${
            isCorrect ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {isCorrect ? (
            <>
              <Check size={12} className="stroke-[3]" /> Excellent! Correct answer.
            </>
          ) : (
            <>
              Good try! Let&apos;s keep practicing together.
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function ComprehensionWidget(props: ComprehensionWidgetProps) {
  if (props.widgetType === "difficult_word") {
    return <DifficultWordChip {...props} />;
  }
  if (props.widgetType === "mcq") {
    return <MCQWidget {...props} />;
  }
  if (props.widgetType === "fill_blank") {
    return <FillBlankWidget {...props} />;
  }
  // retell / free_response — fallback to fill blank for MVP
  return <FillBlankWidget {...props} />;
}
