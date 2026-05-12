"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Send, Mic, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useOnboardingStore } from "../store/useOnboardingStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";

const SUBJECT_ICONS: Record<string, string> = {
  Mathematics: "📐",
  English: "📖",
  Science: "🔬",
  History: "🏛️",
  Physics: "⚛️",
  Chemistry: "⚗️",
  Biology: "🧬",
  Geography: "🌍",
};

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex mr-auto"
    >
      <div className="bg-[#F4F3EE] border border-[#042E5C]/5 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-[#042E5C]/30 block"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function OnboardingChatView() {
  const {
    messages,
    isAITyping,
    isVoiceOnly,
    subject,
    sendVoiceMessage,
    sendMessage,
    streamingMessageId,
  } = useOnboardingStore();
  const { studentProfile } = useStudentStore();

  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        const base64Audio = await blobToBase64(audioBlob);
        if (studentProfile) {
          sendVoiceMessage(studentProfile.user_id, base64Audio, mediaRecorder.mimeType);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

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
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const isVoiceActive = isRecording;
  const isInputDisabled = isVoiceOnly || isVoiceActive || isAITyping;

  let placeholder = "Type your response...";
  if (isRecording) placeholder = "Recording your voice...";
  else if (isVoiceOnly) placeholder = "Please use the microphone to speak your answer...";
  else if (isAITyping) placeholder = "Thinking...";

  useEffect(() => {
    if (!isInputDisabled && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isInputDisabled]);

  const subjectIcon = subject ? (SUBJECT_ICONS[subject] || "📚") : "📚";
  const subjectLabel = subject ? `${subject} Onboarding` : "Subject Onboarding";

  // Visible messages: filter out the empty streaming placeholder (shown via TypingIndicator instead)
  const visibleMessages = messages.filter(
    (m) => !(m.id === streamingMessageId && m.text === "")
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white max-w-4xl mx-auto w-full border-x border-[#042E5C]/5 shadow-sm">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#042E5C]/8 bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#042E5C]/5 flex items-center justify-center text-xl">
            {subjectIcon}
          </div>
          <div>
            <h2 className="font-extrabold text-[#042E5C] text-base leading-tight">
              {subjectLabel}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059F6D] animate-pulse block" />
              <p className="text-[10px] font-bold text-[#042E5C]/40 uppercase tracking-widest">
                Onboarding in progress
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-5">
        {/* Empty state while loading first message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <div className="w-12 h-12 rounded-full border-4 border-[#042E5C]/10 border-t-[#042E5C]/40 animate-spin" />
            <p className="text-xs font-bold text-[#042E5C]/30 uppercase tracking-widest animate-pulse">
              Starting your onboarding...
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex flex-col max-w-[82%] group ${
                msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
              onMouseEnter={() => setHoveredMsgId(msg.id)}
              onMouseLeave={() => setHoveredMsgId(null)}
            >
              <div
                className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm prose prose-sm max-w-none ${
                  msg.sender === "user"
                    ? "bg-[#042E5C] text-white rounded-br-sm prose-invert"
                    : "bg-[#F4F3EE] text-[#042E5C] rounded-bl-sm border border-[#042E5C]/5"
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>

              {/* Timestamp on hover */}
              <motion.span
                initial={false}
                animate={{ opacity: hoveredMsgId === msg.id ? 1 : 0, y: hoveredMsgId === msg.id ? 0 : -4 }}
                transition={{ duration: 0.15 }}
                className="text-[10px] font-bold text-[#042E5C]/25 mt-1 px-1 select-none"
              >
                {msg.timestamp}
              </motion.span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* AI Typing Indicator */}
        <AnimatePresence>
          {isAITyping && <TypingIndicator />}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#042E5C]/5 bg-white/95 backdrop-blur-sm">
        <div
          className={`flex items-end gap-3 bg-[#F8F9FA] border rounded-[2rem] px-5 py-3 transition-all focus-within:bg-white focus-within:shadow-md ${
            isVoiceOnly
              ? "border-red-400/50 bg-red-50/50"
              : "border-[#042E5C]/10 focus-within:border-[#042E5C]/20"
          }`}
        >
          <motion.button
            animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            onClick={handleMicClick}
            disabled={isAITyping}
            className={`flex-shrink-0 mb-1 cursor-pointer transition-colors ${
              isRecording
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
            onClick={isRecording ? stopRecording : handleSend}
            disabled={
              (!input.trim() && !isVoiceActive) ||
              (isInputDisabled && !isVoiceActive)
            }
            className={`w-10 h-10 rounded-full flex-shrink-0 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm ${
              isVoiceActive ? "bg-red-500 hover:bg-red-600" : "bg-[#042E5C] hover:bg-[#064282]"
            }`}
          >
            {isVoiceActive ? (
              <Square size={16} fill="white" />
            ) : (
              <Send size={18} className="translate-x-0.5" />
            )}
          </motion.button>
        </div>

        {/* Keyboard hint */}
        <AnimatePresence>
          {input.trim() && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[10px] text-[#042E5C]/30 font-bold text-center mt-2 select-none"
            >
              ⏎ Send &nbsp;·&nbsp; Shift+⏎ New line
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
