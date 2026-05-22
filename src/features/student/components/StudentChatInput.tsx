"use client";

import { motion } from "framer-motion";
import { Send, Mic, MicOff, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useStudentStore } from "../store/useStudentStore";
import { InlineSubjectPicker } from "./InlineSubjectPicker";
import { Subject } from "@/constants/subjectConfig";

interface StudentChatInputProps {
  chatTitle: string;
  isCentered?: boolean;
  isHub?: boolean;
}

export function StudentChatInput({ chatTitle, isCentered = false, isHub = false }: StudentChatInputProps) {
  const {
    sendMessage,
    isAITyping,
    activeChat,
    voiceSessionStatus,
    startVoiceSession,
    stopVoiceSession,
    stopMessageGeneration,
    isMuted,
    toggleMute,
    activeActivity,
    isRateLimitHit,
    messages,
    availableAgents,
    openNewChat,
  } = useStudentStore();

  const [input, setInput] = useState("");
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // If in hub mode with a subject selected, route to that subject's agent
    if (isHub && selectedSubject) {
      const agent = availableAgents.find(
        a => a.subject.toLowerCase() === selectedSubject ||
             (selectedSubject === "mathematics" && a.subject.toLowerCase() === "math")
      );
      if (agent) {
        openNewChat(agent);
      }
    }

    sendMessage(trimmed);
    setInput("");
    setSelectedSubject(null);
    setShowSubjectPicker(false);

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

  const handleMicClick = () => {
    if (voiceSessionStatus === "active") {
      toggleMute();
    } else if (voiceSessionStatus === "idle") {
      startVoiceSession();
    }
  };

  const isVoiceActive = voiceSessionStatus === "active" || voiceSessionStatus === "connecting";
  const isFirstResponseWaiting = messages.length <= 2 && isAITyping;
  const isTextDisabled = !!activeActivity || isFirstResponseWaiting;
  const isMicDisabled = !!activeActivity || isFirstResponseWaiting;

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
        className="flex items-end gap-3 transition-all relative bg-white border border-[#E2E8F0] rounded-2xl px-5 focus-within:border-[#5B4DC7]/40 focus-within:shadow-sm"
        style={{ padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <textarea
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
                : isVoiceActive
                  ? "Listening..."
                  : isHub
                    ? "Ask Anything..."
                    : `Ask anything to ${chatTitle}...`
          }
          rows={1}
          className="flex-1 bg-transparent text-[15px] font-medium focus:outline-none resize-none overflow-y-auto min-h-[28px] max-h-[120px] md:max-h-[200px] leading-relaxed py-1"
          style={{ height: "auto", color: "#1A202C" }}
        />

        <div className="flex items-center gap-3 mb-0.5">
          <motion.div
            animate={voiceSessionStatus === "active" ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center justify-center w-8"
            title={voiceSessionStatus === "active" ? (isMuted ? "Unmute Microphone" : "Mute Microphone") : "Start Voice Chat"}
          >
            {isMuted ? (
              <MicOff
                size={22}
                onClick={handleMicClick}
                className="flex-shrink-0 cursor-pointer text-red-500 hover:text-red-600 transition-colors"
              />
            ) : (
              <Mic
                size={22}
                onClick={handleMicClick}
                className={`flex-shrink-0 cursor-pointer transition-colors ${
                  voiceSessionStatus === "active"
                    ? "text-[#5B4DC7] hover:text-[#4A90D9]"
                    : isMicDisabled
                      ? "text-[#CBD5E1] cursor-not-allowed"
                      : "text-[#94A3B8] hover:text-[#5B4DC7]"
                }`}
              />
            )}
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isVoiceActive ? stopVoiceSession : isAITyping ? stopMessageGeneration : handleSend}
            disabled={isRateLimitHit || (isTextDisabled && !isVoiceActive && !isAITyping) || (!input.trim() && !isVoiceActive && !isAITyping)}
            className={`w-10 h-10 rounded-full flex-shrink-0 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm ${
              (isVoiceActive || isAITyping) ? "bg-red-500 hover:bg-red-600" : "bg-[#5B4DC7] hover:bg-[#4A3DB5]"
            }`}
          >
            {isVoiceActive || isAITyping ? (
              <Square size={16} fill="white" />
            ) : (
              <Send size={18} />
            )}
          </motion.button>
        </div>
      </div>
      {!isCentered && !isHub && (
        <p className="text-[11px] font-bold text-center mt-3 uppercase tracking-[0.1em]" style={{ color: "#CBD5E1" }}>
          Press Enter to send &bull; Shift+Enter for new line
        </p>
      )}
    </div>
  );
}
