"use client";

import { motion } from "framer-motion";
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
}

export const ChatMessageBubble = React.memo(({ message }: ChatMessageBubbleProps) => {
  const isUser = message.sender === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-2xl bg-[#1a3a2a] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap size={14} className="text-white" />
        </div>
      )}

      <div className={`max-w-[72%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`px-5 py-4 rounded-2xl leading-relaxed text-sm ${
            isUser
              ? "bg-[#1a3a2a] text-white rounded-tr-sm"
              : "bg-[#F4F3EE] text-[#1a3a2a] rounded-tl-sm border border-[#1a3a2a]/6"
          }`}
        >
          {renderText(message.text)}
        </div>

        <span className="text-[10px] text-[#1a3a2a]/30 px-1">{message.timestamp}</span>

        {/* AI message extras */}
        {!isUser && (
          <div className="space-y-2 w-full">
            {/* Suggestion chips */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.suggestions.map((s) => (
                  <button
                    key={s}
                    className="text-xs font-semibold text-[#1a3a2a] bg-white border border-[#1a3a2a]/12 rounded-full px-3.5 py-1.5 hover:bg-[#1a3a2a] hover:text-white hover:border-[#1a3a2a] transition-all"
                  >
                    {s}
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
});

ChatMessageBubble.displayName = "ChatMessageBubble";
