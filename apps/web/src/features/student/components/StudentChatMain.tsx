"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Mic, Zap, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useStudentStore, ChatMessage, ChatSession } from "../store/useStudentStore";
import { ChatMessageBubble } from "./ChatMessageBubble";

interface StudentChatMainProps {
  activeChat: ChatSession;
  messages: ChatMessage[];
  isAITyping: boolean;
}

export function StudentChatMain({ activeChat, messages, isAITyping }: StudentChatMainProps) {
  const { closeChat, sendMessage, isHistoryLoading } = useStudentStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAITyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1a3a2a]/8 bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={closeChat}
            className="w-9 h-9 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a]/50 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/10 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-extrabold text-[#1a3a2a] text-base leading-none">
              {activeChat.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Assistant Active
              </span>
            </div>
          </div>
        </div>
        {activeChat.grade && (
          <span className="text-xs font-semibold text-[#1a3a2a]/40 bg-[#F4F3EE] px-3 py-1.5 rounded-full">
            {activeChat.grade}
          </span>
        )}
      </header>

      {/* Session label */}
      <div className="flex justify-center py-4 bg-white border-b border-[#1a3a2a]/5 flex-shrink-0">
        <span className="text-[10px] font-bold text-[#1a3a2a]/25 uppercase tracking-[0.2em]">
          Foundation Session &bull; Today
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {isHistoryLoading ? (
            <motion.div
              key="loading-history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4"
            >
              <Loader2 className="w-8 h-8 text-[#1a3a2a]/20 animate-spin" />
              <p className="text-sm text-[#1a3a2a]/40 font-medium">Retrieving history...</p>
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-3xl bg-[#F4F3EE] flex items-center justify-center text-3xl">
                {activeChat.agentIcon}
              </div>
              <div className="space-y-2">
                <p className="font-bold text-[#1a3a2a] text-lg">
                  New session: {activeChat.title}
                </p>
                <p className="text-sm text-[#1a3a2a]/45 max-w-xs mx-auto">
                  Ask anything about {activeChat.title}. Your Socratic guide is ready.
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
          )}
        </AnimatePresence>

        {/* AI typing indicator */}
        {isAITyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-2xl bg-[#1a3a2a] flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <div className="bg-[#F4F3EE] rounded-2xl rounded-tl-none px-5 py-3.5 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#1a3a2a]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-[#1a3a2a]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-[#1a3a2a]/40 rounded-full animate-bounce" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="px-8 py-5 border-t border-[#1a3a2a]/8 bg-white flex-shrink-0">
        <div className="flex items-center gap-4 bg-[#F4F3EE] rounded-2xl px-5 py-3 focus-within:ring-2 focus-within:ring-[#1a3a2a]/15 focus-within:bg-white transition-all">
          <Mic
            size={20}
            className="text-[#1a3a2a]/30 flex-shrink-0 cursor-pointer hover:text-[#1a3a2a] transition-colors"
          />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask anything about ${activeChat.title}...`}
            className="flex-1 bg-transparent text-sm text-[#1a3a2a] placeholder:text-[#1a3a2a]/30 focus:outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isAITyping}
            className="w-9 h-9 rounded-xl bg-[#1a3a2a] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2d6a4a] transition-colors flex-shrink-0"
          >
            <Send size={15} />
          </motion.button>
        </div>
        <p className="text-[10px] text-[#1a3a2a]/25 text-center mt-3">
          Press Enter to send &bull; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
