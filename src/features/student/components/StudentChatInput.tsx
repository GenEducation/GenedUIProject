"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useStudentStore } from "../store/useStudentStore";
import { InlineSubjectPicker } from "./InlineSubjectPicker";
import type { ExactSubject } from "@/features/subjects/subjectCatalog";

/* ── Text-only compositor ─────────────────────────────────────────────── */

interface StudentChatInputProps {
  chatTitle: string;
  isCentered?: boolean;
  isHub?: boolean;
}

export function StudentChatInput({ chatTitle, isCentered = false, isHub = false }: StudentChatInputProps) {
  const {
    sendMessage,
    studentProfile,
    isAITyping,
    stopMessageGeneration,
    activeActivity,
    isRateLimitHit,
    messages,
    availableAgents,
    openNewChat,
  } = useStudentStore();

  const [input, setInput] = useState("");
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<ExactSubject | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The keyboard hint below shows once, until the student's first send —
  // it used to render permanently on every visit to the docked input.
  const [hintDismissed, setHintDismissed] = useState(true);
  useEffect(() => {
    setHintDismissed(localStorage.getItem("gened_chat_hint_seen") === "1");
  }, []);


  // Show picker only while user has text in hub mode; hide when cleared
  useEffect(() => {
    if (isHub) {
      setShowSubjectPicker(input.length > 0);
    }
  }, [isHub, input]);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const maxHeight = window.innerWidth >= 768 ? 200 : 120;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // If in hub mode with a subject selected, route to that subject's agent.
    if (isHub && selectedSubject) {
      const agent = availableAgents.find((candidate) => candidate.subject === selectedSubject);
      if (agent) {
        openNewChat(agent);
      } else {
        return;
      }
    }

    sendMessage(trimmed, undefined, { isTypedQuery: true });
    setInput("");
    setSelectedSubject(null);
    setShowSubjectPicker(false);
    if (!hintDismissed) {
      localStorage.setItem("gened_chat_hint_seen", "1");
      setHintDismissed(true);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isFirstResponseWaiting = messages.length <= 2 && isAITyping;
  const isTextDisabled = !!activeActivity || isFirstResponseWaiting;

  return (
    <div className={`w-full transition-all duration-500 ${isCentered ? "px-0" : "px-0"}`}>
      {/* Inline subject picker */}
      {isHub && showSubjectPicker && (
        <InlineSubjectPicker
          selectedSubject={selectedSubject}
          onSelectSubject={setSelectedSubject}
          onDismiss={() => {
            setShowSubjectPicker(false);
            setSelectedSubject(null);
          }}
        />
      )}

      <div
        className="flex items-end gap-2 sm:gap-3 transition-all relative bg-white border border-[#E2E8F0] rounded-2xl focus-within:border-[var(--tutor)]/40 focus-within:shadow-sm"
        style={{ padding: "10px clamp(12px, 3vw, 20px)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <motion.textarea
          key="textarea"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          ref={textareaRef}
          value={input}
          disabled={isTextDisabled || isRateLimitHit}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRateLimitHit
              ? "Daily limit reached. Upgrade to continue..."
              : activeActivity
                ? "Complete the activity above..."
                : isHub
                  ? "Ask Anything..."
                  : `Ask anything to ${studentProfile?.ai_name || chatTitle}...`
          }
          rows={1}
          className="flex-1 bg-transparent text-[15px] font-medium focus:outline-none resize-none overflow-y-auto min-h-[28px] max-h-[120px] md:max-h-[200px] leading-relaxed py-1"
          style={{ height: "auto", color: "#1A202C" }}
        />

        <div className="flex items-center gap-3 mb-0.5">
          {/* Action button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={
              isAITyping
                ? stopMessageGeneration
                : handleSend
            }
            disabled={
              isRateLimitHit ||
              (!isAITyping && isTextDisabled) ||
              (!isAITyping && !input.trim())
            }
            className={`w-10 h-10 rounded-full flex-shrink-0 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm ${
              isAITyping
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[var(--tutor)] hover:bg-[#4A3DB5]"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isAITyping ? (
                <motion.span
                  key="stop"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Square size={16} fill="white" />
                </motion.span>
              ) : (
                <motion.span
                  key="send"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Send size={18} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
      {!isCentered && !isHub && !hintDismissed && (
        <p className="text-[11px] font-bold text-center mt-3 uppercase tracking-[0.1em]" style={{ color: "#CBD5E1" }}>
          Press Enter to send &bull; Shift+Enter for new line
        </p>
      )}
    </div>
  );
}
