"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import { ChatMessage } from "../store/useStudentStore";
import React from "react";

// ── Markdown-lite: bold **text** renderer ─────────────────────────────────────
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onOptionSelect?: (option: string) => void;
}

export const ChatMessageBubble = React.memo(
  ({ message, isStreaming, onOptionSelect }: ChatMessageBubbleProps) => {
    const isUser = message.sender === "user";

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3`}
      >
        {/* AI avatar — pulses with a green ring while streaming */}
        {!isUser && (
          <div className="relative flex-shrink-0 mt-0.5">
            {isStreaming && (
              <span className="absolute inset-0 rounded-2xl animate-ping bg-emerald-400/30" />
            )}
            <div
              className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isStreaming
                  ? "bg-[#1a3a2a] ring-2 ring-emerald-400/60 ring-offset-1"
                  : "bg-[#1a3a2a]"
              }`}
            >
              <Zap
                size={14}
                className={`text-white ${isStreaming ? "animate-pulse" : ""}`}
              />
            </div>
          </div>
        )}

        <div className={`max-w-[72%] space-y-1.5 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
          {/* Message bubble */}
          <div
            className={`px-5 py-4 rounded-2xl leading-relaxed text-sm transition-all duration-300 ${
              isUser
                ? "bg-[#1a3a2a] text-white rounded-tr-sm"
                : isStreaming
                ? "bg-[#F4F3EE] text-[#1a3a2a] rounded-tl-sm border border-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                : "bg-[#F4F3EE] text-[#1a3a2a] rounded-tl-sm border border-[#1a3a2a]/6"
            }`}
          >
            {renderText(message.text)}
            {/* Blinking text cursor — true blink (on/off) not just opacity pulse */}
            {isStreaming && (
              <span
                className="inline-block w-[3px] h-[0.9em] bg-emerald-500 ml-[2px] align-middle rounded-[1px]"
                style={{ animation: "blink 0.9s step-end infinite" }}
              />
            )}
          </div>

          {/* "Generating…" label shown below bubble while streaming */}
          <AnimatePresence>
            {isStreaming && (
              <motion.span
                key="generating"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 px-1 tracking-wide"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Generating…
              </motion.span>
            )}
          </AnimatePresence>

          <span className="text-[10px] text-[#1a3a2a]/30 px-1">{message.timestamp}</span>

          {/* AI message extras — only shown once streaming is done */}
          {!isUser && !isStreaming && (
            <div className="space-y-2 w-full">
              {/* Option chips from backend */}
              {message.options && message.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onOptionSelect?.(opt)}
                      className="text-xs font-semibold text-[#1a3a2a] bg-white border border-[#1a3a2a]/12 rounded-full px-3.5 py-1.5 hover:bg-[#1a3a2a] hover:text-white hover:border-[#1a3a2a] transition-all"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Feedback row */}
              <div className="flex items-center gap-1">
                <button className="w-7 h-7 rounded-lg hover:bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a]/30 hover:text-[#1a3a2a] transition-all">
                  <ThumbsUp size={13} />
                </button>
                <button className="w-7 h-7 rounded-lg hover:bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a]/30 hover:text-[#1a3a2a] transition-all">
                  <ThumbsDown size={13} />
                </button>
                <button className="w-7 h-7 rounded-lg hover:bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a]/30 hover:text-[#1a3a2a] transition-all">
                  <Share2 size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

ChatMessageBubble.displayName = "ChatMessageBubble";

