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

function DifficultWordChip({ directiveId, word, syllables, phonetic }: ComprehensionWidgetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { playDirectiveTts } = useStudentStore();

  const handleTap = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    // Use word-tts endpoint via audioPlayerService directly
    import("@/features/student/services/audioPlayerService").then(({ audioPlayerService }) => {
      audioPlayerService.playWord(directiveId).finally(() => setIsPlaying(false));
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors select-none"
      onClick={handleTap}
      title="Tap to hear pronunciation"
    >
      <Volume2
        size={14}
        className={`flex-shrink-0 transition-colors ${isPlaying ? "text-blue-600 animate-pulse" : "text-blue-400"}`}
      />
      <span className="font-bold text-blue-700 text-sm">{word}</span>
      {syllables && syllables.length > 0 && (
        <span className="text-blue-400 text-xs font-medium">
          {syllables.join("·")}
        </span>
      )}
      {phonetic && (
        <span className="text-blue-300 text-xs italic">{phonetic}</span>
      )}
    </motion.div>
  );
}

// ── MCQ Widget ────────────────────────────────────────────────────────────────

function MCQWidget({ directiveId, question, choices, allowRetry }: ComprehensionWidgetProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [retries, setRetries] = useState(0);
  const { submitComprehensionAnswer } = useStudentStore();

  const handleSelect = async (choiceId: string, label: string) => {
    if (submitted && !allowRetry) return;
    setSelected(choiceId);
    setSubmitted(true);
    await submitComprehensionAnswer(directiveId, "mcq", label);
  };

  const handleRetry = () => {
    setSelected(null);
    setSubmitted(false);
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
          const isSelected = selected === choice.id;
          return (
            <button
              key={choice.id}
              onClick={() => handleSelect(choice.id, choice.label)}
              disabled={submitted && !allowRetry}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                isSelected
                  ? "bg-[#042E5C] text-white border-[#042E5C]"
                  : "bg-[#F8F9FA] text-[#042E5C]/70 border-transparent hover:border-[#042E5C]/20 hover:bg-white"
              }`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>

      {/* Soft retry prompt — Wave 2 §10.6: never say "Wrong" or "Incorrect" */}
      <AnimatePresence>
        {submitted && allowRetry && retries < 2 && (
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
        {submitted && !allowRetry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"
          >
            <Check size={12} /> Noted — let&apos;s continue!
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
  const { submitComprehensionAnswer } = useStudentStore();

  const handleSubmit = async () => {
    if (!value.trim() || submitted) return;
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
          value={value}
          disabled={submitted}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Your answer..."
          className="flex-1 px-4 py-2 rounded-xl border border-[#042E5C]/12 text-sm text-[#042E5C] bg-[#F8F9FA] focus:outline-none focus:border-[#042E5C]/30 focus:bg-white transition-all disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={submitted || !value.trim()}
          className="px-4 py-2 rounded-xl bg-[#042E5C] text-white text-sm font-bold disabled:opacity-30 hover:bg-[#064282] transition-all"
        >
          {submitted ? <Check size={14} /> : "Send"}
        </button>
      </div>
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
