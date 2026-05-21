"use client";

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
  disabled?: boolean;
  word?: string;
  syllables?: string[];
  phonetic?: string;
  slowAvailable?: boolean;
}

// ── Difficult Word Chip ───────────────────────────────────────────────────────

function DifficultWordChip({ directiveId, word, syllables, phonetic, slowAvailable, disabled }: ComprehensionWidgetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  const handlePlay = (slow: boolean) => {
    if (isPlaying || disabled) return;
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
      className="inline-flex flex-col select-none"
      style={{
        padding: "12px 18px",
        borderRadius: 18,
        background: "#EDE9FE",
        border: "1px solid #C4B5FD40",
      }}
    >
      <div className="flex items-center gap-6 justify-between">
        <span style={{ fontWeight: 800, fontSize: 18, color: "#5B4DC7", lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>
          {word}
        </span>

        <div className="flex items-center gap-2">
          {slowAvailable && (
            <button
              onClick={() => handlePlay(true)}
              disabled={isPlaying}
              title="Slower pronunciation"
              style={{
                fontSize: 10, fontWeight: 800, padding: "3px 10px",
                borderRadius: 20, border: "1px solid #5B4DC730",
                background: isPlaying && isSlow ? "#5B4DC720" : "#FFFFFF",
                color: "#5B4DC7", cursor: "pointer", transition: "all 0.15s",
              }}
            >
              slow
            </button>
          )}
          <button
            onClick={() => handlePlay(false)}
            disabled={isPlaying}
            title="Tap to hear pronunciation"
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              color: isPlaying && !isSlow ? "#5B4DC7" : "#8B7FE8",
              transition: "all 0.15s",
              animation: isPlaying && !isSlow ? "pulse 1s infinite" : "none",
            }}
          >
            <Volume2 size={20} />
          </button>
        </div>
      </div>

      {((syllables && syllables.length > 0) || phonetic) && (
        <div className="flex items-center gap-2 mt-1.5">
          {syllables && syllables.length > 0 && (
            <span style={{ fontSize: 14, fontWeight: 600, color: "#8B7FE8", letterSpacing: "0.05em" }}>
              {syllables.join(" · ")}
            </span>
          )}
          {phonetic && (
            <span style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>{phonetic}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── MCQ Widget ────────────────────────────────────────────────────────────────

function MCQWidget({ directiveId, question, choices, allowRetry, disabled }: ComprehensionWidgetProps) {
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

  const getChoiceStyle = (choice: { id: string; label: string }) => {
    const isSelected = effectiveSelected === choice.id;
    if (isSelected && effectiveSubmitted && result !== undefined) {
      return isCorrect
        ? { background: "#00B894", border: "1px solid #00B894", color: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,184,148,0.25)" }
        : { background: "#E53E3E", border: "1px solid #E53E3E", color: "#FFFFFF", boxShadow: "0 2px 8px rgba(229,62,62,0.2)" };
    }
    if (isSelected) {
      return { background: "#5B4DC7", border: "1px solid #5B4DC7", color: "#FFFFFF", boxShadow: "0 2px 8px rgba(91,77,199,0.2)" };
    }
    return { background: "#F8F9FA", border: "1px solid #E2E8F0", color: "#1A202C" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: 12, padding: 16, borderRadius: 20,
        background: "#F0F9FF", border: "1px solid #5DADE225",
      }}
    >
      {question && (
        <p style={{ fontSize: 14, fontWeight: 700, color: "#1A202C", lineHeight: 1.5, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>
          {question}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {(choices || []).map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleSelect(choice.id, choice.label)}
            disabled={disabled || (effectiveSubmitted && !allowRetry)}
            style={{
              width: "100%", textAlign: "left", padding: "10px 16px",
              borderRadius: 14, fontSize: 14, fontWeight: 600,
              cursor: disabled || (effectiveSubmitted && !allowRetry) ? "default" : "pointer",
              transition: "all 0.18s", fontFamily: "'DM Sans', sans-serif",
              ...getChoiceStyle(choice),
            }}
          >
            {choice.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {effectiveSubmitted && allowRetry && retries < 2 && !isCorrect && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleRetry}
            style={{
              display: "flex", alignItems: "center", gap: 5, marginTop: 10,
              fontSize: 12, fontWeight: 700, color: "#94A3B8", background: "none",
              border: "none", cursor: "pointer", transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#5B4DC7"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8"}
          >
            <RefreshCw size={11} />
            Want to try once more?
          </motion.button>
        )}
        {effectiveSubmitted && result !== undefined && (isCorrect || !allowRetry || retries >= 2) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex", alignItems: "center", gap: 5, marginTop: 10,
              fontSize: 12, fontWeight: 700,
              color: isCorrect ? "#00B894" : "#E53E3E",
            }}
          >
            {isCorrect ? (
              <><Check size={12} style={{ strokeWidth: 3 }} /> Brilliant! That is correct. Let&apos;s continue!</>
            ) : (
              <>Not quite, but good effort — let&apos;s keep going!</>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Fill-blank Widget ─────────────────────────────────────────────────────────

function FillBlankWidget({ directiveId, question, disabled }: ComprehensionWidgetProps) {
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

  const inputStyle = effectiveSubmitted && result !== undefined
    ? isCorrect
      ? { background: "#F0FFF8", color: "#1A202C", border: "1px solid #00B89440" }
      : { background: "#FFF5F5", color: "#1A202C", border: "1px solid #E53E3E40" }
    : { background: "#F8F9FA", color: "#1A202C", border: "1px solid #E2E8F0" };

  const btnStyle = effectiveSubmitted && result !== undefined
    ? isCorrect
      ? { background: "#00B894", color: "#FFFFFF" }
      : { background: "#E53E3E", color: "#FFFFFF" }
    : { background: "#5B4DC7", color: "#FFFFFF" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: 12, padding: 16, borderRadius: 20,
        background: "#ECFDF5", border: "1px solid #00B89420",
      }}
    >
      {question && (
        <p style={{ fontSize: 14, fontWeight: 700, color: "#1A202C", lineHeight: 1.5, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>
          {question}
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={effectiveValue}
          disabled={disabled || effectiveSubmitted}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Your answer..."
          style={{
            flex: 1, padding: "10px 16px", borderRadius: 14,
            fontSize: 14, fontWeight: 600, outline: "none",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.18s",
            ...inputStyle,
          }}
          onFocus={e => {
            if (!effectiveSubmitted) {
              (e.target as HTMLInputElement).style.borderColor = "#5B4DC750";
              (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(91,77,199,0.08)";
            }
          }}
          onBlur={e => {
            (e.target as HTMLInputElement).style.boxShadow = "none";
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || effectiveSubmitted || !value.trim()}
          style={{
            padding: "10px 18px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: "none", cursor: disabled || effectiveSubmitted || !value.trim() ? "default" : "pointer",
            opacity: disabled || (!effectiveSubmitted && !value.trim()) ? 0.35 : 1,
            transition: "all 0.18s", fontFamily: "'DM Sans', sans-serif",
            minWidth: 64, display: "flex", alignItems: "center", justifyContent: "center",
            ...btnStyle,
          }}
        >
          {effectiveSubmitted && result !== undefined ? (
            isCorrect ? <Check size={14} style={{ strokeWidth: 3 }} /> : <span style={{ fontWeight: 800 }}>✕</span>
          ) : "Send"}
        </button>
      </div>

      {effectiveSubmitted && result !== undefined && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: "flex", alignItems: "center", gap: 5, marginTop: 10,
            fontSize: 12, fontWeight: 700,
            color: isCorrect ? "#00B894" : "#E53E3E",
          }}
        >
          {isCorrect ? (
            <><Check size={12} style={{ strokeWidth: 3 }} /> Excellent! Correct answer.</>
          ) : (
            <>Good try! Let&apos;s keep practicing together.</>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function ComprehensionWidget(props: ComprehensionWidgetProps) {
  if (props.widgetType === "difficult_word") return <DifficultWordChip {...props} />;
  if (props.widgetType === "mcq") return <MCQWidget {...props} />;
  if (props.widgetType === "fill_blank") return <FillBlankWidget {...props} />;
  return <FillBlankWidget {...props} />;
}
