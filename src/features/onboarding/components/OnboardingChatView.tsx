"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Send, Mic, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useOnboardingStore } from "../store/useOnboardingStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";

export function OnboardingChatView() {
  const { 
    messages, 
    isAITyping, 
    isVoiceOnly, 
    voiceSessionStatus, 
    sendMessage, 
    startVoiceSession, 
    stopVoiceSession 
  } = useOnboardingStore();
  const { studentProfile } = useStudentStore();
  
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAITyping]);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);



  const handleSend = () => {
    if (!input.trim() || !studentProfile) return;
    sendMessage(studentProfile.user_id, input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (!studentProfile) return;
    if (voiceSessionStatus === "active") {
      stopVoiceSession();
    } else if (voiceSessionStatus === "idle") {
      startVoiceSession(studentProfile.user_id);
    }
  };

  const isVoiceActive = voiceSessionStatus === "active" || voiceSessionStatus === "connecting";
  const isInputDisabled = isVoiceOnly || isVoiceActive || isAITyping;

  let placeholder = "Type your response...";
  if (isVoiceActive) placeholder = "Listening...";
  else if (isVoiceOnly) placeholder = "Please use the microphone to speak your answer...";
  else if (isAITyping) placeholder = "Assistant is typing...";

  useEffect(() => {
    if (!isInputDisabled && textareaRef.current) {
      // Use a short timeout to let the disabled state clear from the DOM
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isInputDisabled]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white max-w-4xl mx-auto w-full border-x border-[#042E5C]/5 shadow-sm">
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#042E5C]/8 bg-[#F4F3EE]/50">
        <div>
          <h2 className="font-extrabold text-[#042E5C] text-lg leading-tight font-serif">
            Welcome to GenEd
          </h2>
          <p className="text-[11px] font-bold text-[#042E5C]/40 uppercase tracking-widest mt-1">
            Let's get to know you better
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div 
                className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm prose prose-sm max-w-none ${
                  msg.sender === "user" 
                    ? "bg-[#042E5C] text-white rounded-br-sm prose-invert" 
                    : "bg-[#F4F3EE] text-[#042E5C] rounded-bl-sm border border-[#042E5C]/5"
                }`}
              >
                {msg.text ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  isAITyping && msg.sender === "ai" ? <span className="animate-pulse">...</span> : ""
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#042E5C]/5 bg-white">
        <div className={`flex items-end gap-3 bg-[#F8F9FA] border rounded-[2rem] px-5 py-3 transition-all focus-within:bg-white focus-within:shadow-sm ${
          isVoiceOnly ? "border-red-400/50 bg-red-50/50" : "border-[#042E5C]/10 focus-within:border-[#042E5C]/20"
        }`}>
          <motion.button
            animate={voiceSessionStatus === "active" ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            onClick={handleMicClick}
            disabled={isAITyping}
            className={`flex-shrink-0 mb-1 cursor-pointer transition-colors ${
              voiceSessionStatus === "active" 
                ? "text-red-500 hover:text-red-600" 
                : isVoiceOnly 
                  ? "text-red-500 animate-pulse" 
                  : "text-[#042E5C]/30 hover:text-[#042E5C]"
            } disabled:opacity-50`}
          >
            <Mic size={22} />
          </motion.button>
          
          <textarea
            ref={textareaRef}
            value={input}
            disabled={isInputDisabled}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent text-[15px] font-medium text-[#042E5C] placeholder:text-[#042E5C]/40 focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[120px] py-1 disabled:opacity-70 disabled:cursor-not-allowed"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isVoiceActive ? stopVoiceSession : handleSend}
            disabled={(!input.trim() && !isVoiceActive) || (isInputDisabled && !isVoiceActive)}
            className={`w-10 h-10 rounded-full flex-shrink-0 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm ${
              isVoiceActive ? "bg-red-500 hover:bg-red-600" : "bg-[#042E5C] hover:bg-[#064282]"
            }`}
          >
            {isVoiceActive ? <Square size={16} fill="white" /> : <Send size={18} className="translate-x-0.5" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
