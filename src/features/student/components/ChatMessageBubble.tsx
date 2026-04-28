"use client";

import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, Share2, Copy, Check } from "lucide-react";
import Image from "next/image";
import { ChatMessage } from "../store/useStudentStore";
import React, { useState } from "react";
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
    const [copied, setCopied] = useState(false);
    
    // Apply elegant streaming buffer if this is the active streaming message
    const displayedText = useSmoothStream(message.text, !!isStreaming, 15);

    const handleCopy = () => {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

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
            <div className="w-10 h-10 rounded-full overflow-hidden relative z-10 bg-white border border-[#042E5C]/10">
              <Image src="/Favicon1.jpg" alt="AI Agent" width={40} height={40} className="object-cover" />
            </div>
          </div>
        )}

        <div className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
          {/* Message Content Bin */}
          {(isStreaming || message.statusText || message.text.length > 0 || (message.elements && message.elements.length > 0)) && (
            <div
              className={`px-6 py-5 rounded-[2rem] leading-relaxed text-[15px] transition-all duration-300 w-full ${
                isUser
                  ? "bg-[#042E5C] text-white rounded-tr-md shadow-md shadow-[#042E5C]/5"
                  : "bg-[#F8F9FA] text-[#042E5C] rounded-tl-md border border-[#042E5C]/6"
              }`}
            >
              {message.text.length === 0 && !message.statusText && !message.elements && isStreaming ? (
                <span className="text-[#042E5C]/40 animate-pulse font-medium">Processing...</span>
              ) : message.statusText && message.text.length === 0 && (!message.elements || message.elements.length === 0) ? (
                <span className="text-[#042E5C]/40 animate-pulse font-medium">
                  {message.statusText}
                </span>
              ) : message.elements && message.elements.length > 0 ? (
                <div className="space-y-5">
                  {message.elements.map((el) => {
                    if (el.type === "text") return <MarkdownRenderer key={el.id} content={el.content} />;
                    if (el.type === "svg") return <VisualBlock key={el.id} svg={el.content} meta={el.meta} />;
                    if (el.type === "widget") return <MathWidget key={el.id} expression={el.content} meta={el.meta} />;
                    return null;
                  })}
                  {message.toolStatus && isStreaming && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#042E5C]/5 text-[#042E5C]/60 text-[12px] font-bold rounded-2xl animate-pulse mt-3 border border-[#042E5C]/5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                      {message.toolStatus}
                    </div>
                  )}
                </div>
              ) : (
                <MarkdownRenderer content={displayedText} />
              )}
            </div>
          )}

          <div className="flex items-center gap-3 px-2">
            <span className="text-[11px] font-bold text-[#042E5C]/20 uppercase tracking-wider">{message.timestamp}</span>
            {isUser && (
              <button 
                onClick={handleCopy}
                className="w-7 h-7 rounded-lg hover:bg-[#F8F9FA] flex items-center justify-center text-[#042E5C]/30 hover:text-[#042E5C] transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            )}
          </div>

          {/* AI message extras */}
          {!isUser && !isStreaming && (
            <div className="space-y-3 w-full px-1">
              {/* Option chips */}
              {message.options && message.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onOptionSelect?.(opt)}
                      className="text-[13px] font-bold text-[#042E5C] bg-white border border-[#042E5C]/12 rounded-full px-5 py-2 hover:bg-[#042E5C] hover:text-white hover:border-[#042E5C] transition-all shadow-sm"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Feedback row */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopy}
                  className="w-8 h-8 rounded-xl hover:bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/30 hover:text-[#042E5C] transition-all"
                >
                  {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                </button>
                <button className="w-8 h-8 rounded-xl hover:bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/30 hover:text-[#042E5C] transition-all">
                  <ThumbsUp size={15} />
                </button>
                <button className="w-8 h-8 rounded-xl hover:bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/30 hover:text-[#042E5C] transition-all">
                  <ThumbsDown size={15} />
                </button>
                <button className="w-8 h-8 rounded-xl hover:bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/30 hover:text-[#042E5C] transition-all">
                  <Share2 size={15} />
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

