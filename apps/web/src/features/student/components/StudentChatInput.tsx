"use client";

import { motion } from "framer-motion";
import { Send, Mic } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useStudentStore } from "../store/useStudentStore";

interface StudentChatInputProps {
  chatTitle: string;
}

export function StudentChatInput({ chatTitle }: StudentChatInputProps) {
  const { sendMessage, isAITyping } = useStudentStore();
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

  return (
    <div className="px-8 py-5 border-t border-[#1a3a2a]/8 bg-white flex-shrink-0">
      <div className="flex items-end gap-4 bg-[#F4F3EE] rounded-2xl px-5 py-3 focus-within:ring-2 focus-within:ring-[#1a3a2a]/15 focus-within:bg-white transition-all relative">
        <Mic
          size={20}
          className="text-[#1a3a2a]/30 flex-shrink-0 cursor-pointer hover:text-[#1a3a2a] transition-colors mb-2"
        />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask anything about ${chatTitle}...`}
          rows={1}
          className="flex-1 bg-transparent text-sm text-[#1a3a2a] placeholder:text-[#1a3a2a]/30 focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[120px] md:max-h-[200px] leading-relaxed py-1.5"
          style={{ height: "auto" }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!input.trim() || isAITyping}
          className="w-9 h-9 rounded-xl flex-shrink-0 bg-[#1a3a2a] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2d6a4a] transition-colors mb-1"
        >
          <Send size={15} />
        </motion.button>
      </div>
      <p className="text-[10px] text-[#1a3a2a]/25 text-center mt-3">
        Press Enter to send &bull; Shift+Enter for new line
      </p>
    </div>
  );
}
