"use client";

import { motion } from "framer-motion";
import { Send, Mic, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useStudentStore } from "../store/useStudentStore";

interface StudentChatInputProps {
  chatTitle: string;
  isCentered?: boolean;
}

export function StudentChatInput({ chatTitle, isCentered = false }: StudentChatInputProps) {
  const { 
    sendMessage, 
    isAITyping, 
    activeChat, 
    voiceSessionStatus, 
    startVoiceSession, 
    stopVoiceSession,
    stopMessageGeneration
  } = useStudentStore();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
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
    sendMessage(trimmed);
    setInput("");
    
    // Reset height after sending
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
    if (activeChat?.chatMode === "text") return;
    
    if (voiceSessionStatus === "active") {
      stopVoiceSession();
    } else if (voiceSessionStatus === "idle") {
      startVoiceSession();
    }
  };

  const isVoiceActive = voiceSessionStatus === "active" || voiceSessionStatus === "connecting";
  const isTextDisabled = activeChat?.chatMode === "voice" || isVoiceActive;
  const isMicDisabled = activeChat?.chatMode === "text" || isAITyping;

  return (
    <div className={`w-full transition-all duration-500 ${isCentered ? "px-0" : "px-0"}`}>
      <div 
        className={`flex items-end gap-3 bg-[#F8F9FA] border border-[#042E5C]/10 rounded-[2rem] px-6 py-4 chat-pill-shadow transition-all relative focus-within:chat-pill-focus focus-within:bg-white focus-within:border-[#042E5C]/20 ${
          isCentered ? "py-5" : "py-4"
        }`}
      >
        <motion.div
          animate={voiceSessionStatus === "active" ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="mb-1.5"
        >
          <Mic
            size={22}
            onClick={handleMicClick}
            className={`flex-shrink-0 cursor-pointer transition-colors ${
              voiceSessionStatus === "active" 
                ? "text-red-500 hover:text-red-600" 
                : isMicDisabled 
                  ? "text-[#042E5C]/10 cursor-not-allowed" 
                  : "text-[#042E5C]/30 hover:text-[#042E5C]"
            }`}
          />
        </motion.div>
        
        <textarea
          ref={textareaRef}
          value={input}
          disabled={isTextDisabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isVoiceActive 
              ? "Listening..." 
              : `Ask anything about ${chatTitle}...`
          }
          rows={1}
          className="flex-1 bg-transparent text-[15px] font-medium text-[#042E5C] placeholder:text-[#042E5C]/30 focus:outline-none resize-none overflow-y-auto min-h-[28px] max-h-[120px] md:max-h-[200px] leading-relaxed py-1"
          style={{ height: "auto" }}
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isVoiceActive ? stopVoiceSession : isAITyping ? stopMessageGeneration : handleSend}
          disabled={(isTextDisabled && !isVoiceActive && !isAITyping) || (!input.trim() && !isVoiceActive && !isAITyping)}
          className={`w-10 h-10 rounded-full flex-shrink-0 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm mb-0.5 ${
            (isVoiceActive || isAITyping) ? "bg-red-500 hover:bg-red-600" : "bg-[#042E5C] hover:bg-[#064282]"
          }`}
        >
          {isVoiceActive || isAITyping ? (
            <Square size={16} fill="white" />
          ) : (
            <Send size={18} className="translate-x-0.5" />
          )}
        </motion.button>
      </div>
      {!isCentered && (
        <p className="text-[11px] font-bold text-[#042E5C]/20 text-center mt-4 uppercase tracking-[0.1em]">
          Press Enter to send &bull; Shift+Enter for new line
        </p>
      )}
    </div>
  );
}
