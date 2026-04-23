"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import Image from "next/image";
import { ChatMessage } from "../store/useStudentStore";
import React from "react";
import { VisualBlock } from "./VisualBlock";
import { MathWidget } from "./MathWidget";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useSmoothStream } from "@/hooks/useSmoothStream";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onOptionSelect?: (option: string) => void;
}

export const ChatMessageBubble = React.memo(
  ({ message, isStreaming, onOptionSelect }: ChatMessageBubbleProps) => {
    const isUser = message.sender === "user";
    
    // Apply elegant streaming buffer if this is the active streaming message
    const displayedText = useSmoothStream(message.text, !!isStreaming, 15);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3 w-full`}
      >
        {/* AI avatar */}
        {!isUser && (
          <div className="relative flex-shrink-0 mt-0.5">
            {/* The Gemini-style spinner ring */}
            {isStreaming && (
              <div className="absolute -inset-[3px] rounded-full border-[2px] border-transparent border-t-emerald-500 border-r-emerald-500/20 animate-spin" style={{ animationDuration: '1s' }} />
            )}
            <div className="w-8 h-8 rounded-full overflow-hidden relative z-10 bg-white border border-[#1a3a2a]/10">
              <Image src="/Favicon1.jpg" alt="AI Agent" width={32} height={32} className="object-cover" />
            </div>
          </div>
        )}

        <div className={`max-w-[85%] space-y-1.5 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
          {/* Message Content Bin - Always show during streaming or if there is content/status */}
          {(isStreaming || message.statusText || message.text.length > 0 || (message.elements && message.elements.length > 0)) && (
            <div
              className={`px-5 py-4 rounded-2xl leading-relaxed text-sm transition-all duration-300 w-full ${
                isUser
                  ? "bg-[#1a3a2a] text-white rounded-tr-sm"
                  : "bg-[#F4F3EE] text-[#1a3a2a] rounded-tl-sm border border-[#1a3a2a]/6"
              }`}
            >
              {message.text.length === 0 && !message.statusText && !message.elements && isStreaming ? (
                <span className="text-[#1a3a2a]/40 animate-pulse">Processing...</span>
              ) : message.statusText && message.text.length === 0 && (!message.elements || message.elements.length === 0) ? (
                <span className="text-[#1a3a2a]/40 animate-pulse">
                  {message.statusText}
                </span>
              ) : message.elements && message.elements.length > 0 ? (
                <div className="space-y-4">
                  {message.elements.map((el) => {
                    if (el.type === "text") return <MarkdownRenderer key={el.id} content={el.content} />;
                    if (el.type === "svg") return <VisualBlock key={el.id} svg={el.content} meta={el.meta} />;
                    if (el.type === "widget") return <MathWidget key={el.id} expression={el.content} meta={el.meta} />;
                    return null;
                  })}
                  {message.toolStatus && isStreaming && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#1a3a2a]/5 text-[#1a3a2a]/60 text-[11px] font-bold rounded-xl animate-pulse mt-2 border border-[#1a3a2a]/5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                      {message.toolStatus}
                    </div>
                  )}
                </div>
              ) : (
                <MarkdownRenderer content={displayedText} />
              )}
            </div>
          )}

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

