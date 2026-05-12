"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, BookOpen, Clock, ShieldCheck, User, TrendingUp, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Send, Mic, Square } from "lucide-react";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { WavingStudentCharacter } from "@/components/shared/loaders/StudentLoader/WavingStudentCharacter";
import { MarkdownRenderer } from "@/features/student/components/MarkdownRenderer";

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
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface OnboardingModalProps {
  subject: string;
  grade: number;
  onClose: () => void;
}

export function OnboardingModal({ subject, grade, onClose }: OnboardingModalProps) {
  const { messages, isAITyping, isVoiceOnly, sendVoiceMessage, sendMessage, streamingMessageId, startOnboarding, isComplete, clearSession, type, subject: storeSubject } = useOnboardingStore();
  const { studentProfile } = useStudentStore();

  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Start onboarding when modal opens
  useEffect(() => {
    if (!studentProfile) return;
    if (!type || subject !== storeSubject) {
      startOnboarding(studentProfile.user_id, "subject", subject, grade);
    }
  }, [studentProfile, subject, grade, startOnboarding, type, storeSubject]);

  // Close when onboarding completes
  useEffect(() => {
    if (isComplete) {
      if (studentProfile?.user_id) {
        useOnboardingStore.getState().checkDNAStatus(studentProfile.user_id);
      }
      clearSession();
      onClose();
      // Ensure the dashboard/parent page is fresh after onboarding
      window.location.reload();
    }
  }, [isComplete, clearSession, onClose, studentProfile?.user_id]);

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

  useEffect(() => { adjustHeight(); }, [input]);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const b64 = await blobToBase64(blob);
        if (studentProfile) sendVoiceMessage(studentProfile.user_id, b64, mediaRecorder.mimeType);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { console.error("Recording failed:", err); }
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  useEffect(() => {
    const isInputDisabled = isVoiceOnly || isRecording || isAITyping;
    if (!isInputDisabled && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isVoiceOnly, isRecording, isAITyping]);

  const isVoiceActive = isRecording;
  const isInputDisabled = isVoiceOnly || isVoiceActive || isAITyping;
  const subjectIcon = SUBJECT_ICONS[subject] || "📚";
  const visibleMessages = messages.filter(m => !(m.id === streamingMessageId && m.text === ""));

  let placeholder = "Type your response...";
  if (isRecording) placeholder = "Recording your voice...";
  else if (isVoiceOnly) placeholder = "Please use the microphone to speak...";
  else if (isAITyping) placeholder = "Thinking...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#042E5C]/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl h-[92vh] sm:max-h-[90vh] overflow-hidden sm:rounded-[2rem] rounded-t-[2rem] border border-white/20 bg-white shadow-[0_32px_80px_rgba(4,46,92,0.18)] flex flex-col md:flex-row"
      >
        {/* Left Panel */}
        <div className="hidden md:flex w-[320px] shrink-0 flex-col bg-gradient-to-br from-[#059F6D] to-[#042e5c] text-white relative overflow-hidden p-8">
          {/* Decorative sparks to match signup flow */}
          <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-300 rounded-full blur-[1px] animate-pulse" />
          <div className="absolute top-40 right-10 w-3 h-3 bg-blue-300 rounded-full blur-[1px] opacity-60" />
          <div className="absolute bottom-20 left-12 w-2 h-2 bg-pink-300 rounded-full blur-[1px] opacity-40" />

          {/* Subject badge */}
          <div className="relative z-10 pt-4 pb-4">
            <div className="inline-flex items-center gap-3 bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-3">
              <span className="text-2xl">{subjectIcon}</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-none mb-1">Onboarding</p>
                <p className="text-sm font-extrabold text-white leading-tight">{subject}</p>
              </div>
            </div>
            <p className="text-[11px] font-bold text-white/30 mt-3 uppercase tracking-wider">Grade {grade}</p>
          </div>

          {/* Character */}
          <div className="relative z-10 flex flex-1 items-center justify-center min-h-0 -mt-10">
            <div className="relative scale-90">
              <div className="absolute inset-0 rounded-full bg-white/5 blur-2xl scale-110" />
              <WavingStudentCharacter />
            </div>
          </div>

          {/* What to expect - Styled to match Signup welcome screen */}
          <div className="relative z-10 space-y-6">
            <div className="space-y-6">
              {[
                { 
                  Icon: User, 
                  title: "Personalized Learning", 
                  desc: "I adapt to how you think and learn." 
                },
                { 
                  Icon: TrendingUp, 
                  title: "Smarter Progress", 
                  desc: "I adjust the pace and difficulty for you." 
                },
                { 
                  Icon: Shield, 
                  title: "Your Privacy Matters", 
                  desc: "Your data is private and never shared." 
                },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight text-white leading-tight">{title}</h4>
                    <p className="text-[11px] text-white/60 font-medium mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-5 border-t border-white/10 flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#059F6D] shrink-0" />
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Secure Onboarding</p>
            </div>
          </div>
        </div>

        {/* Right Panel — Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#042E5C]/8 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="font-extrabold text-[#042E5C] text-[15px] leading-tight">GenEd Onboarding</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059F6D] animate-pulse block" />
                  <p className="text-[10px] font-bold text-[#042E5C]/40 uppercase tracking-widest">Onboarding in progress</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#042E5C]/30 hover:text-[#042E5C] hover:bg-[#042E5C]/5 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-[#042E5C]/10 border-t-[#042E5C]/40 animate-spin" />
                <p className="text-xs font-bold text-[#042E5C]/30 uppercase tracking-widest animate-pulse">
                  Starting onboarding...
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
                  className={`flex flex-col max-w-[82%] group ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  <div className={`px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm max-w-none ${
                    msg.sender === "user"
                      ? "bg-[#042E5C] text-white rounded-br-sm prose-invert"
                      : "bg-[#F4F3EE] text-[#042E5C] rounded-bl-sm border border-[#042E5C]/5"
                  }`}>
                    <MarkdownRenderer content={msg.text} />
                  </div>
                  <motion.span
                    animate={{ opacity: hoveredMsgId === msg.id ? 1 : 0 }}
                    className="text-[10px] font-bold text-[#042E5C]/25 mt-1 px-1 select-none"
                  >
                    {msg.timestamp}
                  </motion.span>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isAITyping && <TypingIndicator />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 sm:px-5 py-4 border-t border-[#042E5C]/5 bg-white shrink-0">
            <div className={`flex items-end gap-3 bg-[#F8F9FA] border rounded-[2rem] px-5 py-3 transition-all focus-within:bg-white focus-within:shadow-md ${
              isVoiceOnly ? "border-red-400/50" : "border-[#042E5C]/10 focus-within:border-[#042E5C]/20"
            }`}>
              <motion.button
                animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                onClick={() => isRecording ? stopRecording() : startRecording()}
                disabled={isAITyping}
                className={`flex-shrink-0 mb-1 cursor-pointer transition-colors ${
                  isRecording ? "text-red-500" : isVoiceOnly ? "text-red-500 animate-pulse" : "text-[#042E5C]/30 hover:text-[#042E5C]"
                } disabled:opacity-50`}
              >
                <Mic size={20} />
              </motion.button>

              <textarea
                ref={textareaRef}
                value={input}
                disabled={isInputDisabled}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                className="flex-1 bg-transparent text-[14px] font-medium text-[#042E5C] placeholder:text-[#042E5C]/40 focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[120px] py-1 disabled:opacity-60 disabled:cursor-not-allowed"
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isRecording ? stopRecording : handleSend}
                disabled={(!input.trim() && !isVoiceActive) || (isInputDisabled && !isVoiceActive)}
                className={`w-9 h-9 rounded-full flex-shrink-0 text-white flex items-center justify-center disabled:opacity-30 transition-all shadow-sm ${
                  isVoiceActive ? "bg-red-500" : "bg-[#042E5C] hover:bg-[#064282]"
                }`}
              >
                {isVoiceActive ? <Square size={14} fill="white" /> : <Send size={16} className="translate-x-0.5" />}
              </motion.button>
            </div>

            <AnimatePresence>
              {input.trim() && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-[#042E5C]/30 font-bold text-center mt-2 select-none"
                >
                  ⏎ Send &nbsp;·&nbsp; Shift+⏎ New line
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
