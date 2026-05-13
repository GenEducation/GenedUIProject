"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Menu, Volume2, VolumeX, Mic, MicOff, Square } from "lucide-react";
import React, { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStudentStore, ChatMessage, ChatSession } from "../store/useStudentStore";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { StudentChatInput } from "./StudentChatInput";
import { RateLimitPrompt } from "@/features/billing/components/RateLimitPrompt";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

interface StudentChatMainProps {
  activeChat: ChatSession;
  messages: ChatMessage[];
  isAITyping: boolean;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

// ── Audio status pill (TTS playback indicator) ───────────────────────────────
function AudioStatusPill({ state, onStop }: { state: string; onStop: () => void }) {
  const isActive = ["loading", "buffering", "playing"].includes(state);
  if (!isActive) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200"
    >
      {state === "playing" ? (
        <>
          <Volume2 size={13} className="text-emerald-600 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700">Listening...</span>
          <button
            onClick={onStop}
            className="ml-1 w-4 h-4 rounded-full bg-emerald-200 flex items-center justify-center hover:bg-emerald-300 transition-colors"
            title="Stop playback"
          >
            <Square size={8} className="text-emerald-700" />
          </button>
        </>
      ) : (
        <>
          <Loader2 size={13} className="text-emerald-500 animate-spin" />
          <span className="text-xs font-bold text-emerald-600">Preparing audio...</span>
        </>
      )}
    </motion.div>
  );
}

// ── Recording status pill ────────────────────────────────────────────────────
function RecordingStatusPill({ state, onStop }: { state: string; onStop: () => void }) {
  if (state === "idle" || state === "completed") return null;

  const stateMap: Record<string, { label: string; icon: React.JSX.Element; color: string }> = {
    permission_request: { label: "Mic access...", icon: <Loader2 size={13} className="animate-spin text-amber-500" />, color: "amber" },
    ready:             { label: "Mic ready",     icon: <Mic size={13} className="text-emerald-500" />, color: "emerald" },
    recording:         { label: "Recording...",  icon: <Mic size={13} className="text-red-500 animate-pulse" />, color: "red" },
    uploading:         { label: "Uploading...",  icon: <Loader2 size={13} className="animate-spin text-blue-500" />, color: "blue" },
    processing:        { label: "Processing...", icon: <Loader2 size={13} className="animate-spin text-purple-500" />, color: "purple" },
    error:             { label: "Try again",     icon: <MicOff size={13} className="text-red-400" />, color: "red" },
  };

  const info = stateMap[state];
  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-${info.color}-50 border border-${info.color}-200`}
    >
      {info.icon}
      <span className={`text-xs font-bold text-${info.color}-700`}>{info.label}</span>
      {state === "recording" && (
        <button
          onClick={onStop}
          className="ml-1 w-4 h-4 rounded-full bg-red-200 flex items-center justify-center hover:bg-red-300 transition-colors"
          title="Stop recording"
        >
          <Square size={8} className="text-red-700" />
        </button>
      )}
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function StudentChatMain({ 
  activeChat, 
  messages, 
  isAITyping,
  isSidebarOpen,
  toggleSidebar
}: StudentChatMainProps) {
  const router = useRouter();
  const { 
    closeChat, 
    isHistoryLoading, 
    sendMessage, 
    streamingMessageId,
    isRateLimitHit,
    setRateLimitHit,
    // English skill mode state
    playbackState,
    recordingState,
    stopPlayback,
    stopSkillRecording,
  } = useStudentStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // During streaming or AI typing, use "auto" for instant sync
    // Otherwise use "smooth" for a nice transition
    const behavior = (streamingMessageId || isAITyping) ? "auto" : "smooth";
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, [messages, isAITyping, streamingMessageId]);

  // Cleanup audio on unmount / navigation (Wave 1 §3.2)
  useEffect(() => {
    return () => {
      import("@/features/student/services/audioPlayerService").then(({ audioPlayerService }) => {
        audioPlayerService.destroy();
      });
      import("@/features/student/services/audioRecorderService").then(({ audioRecorderService }) => {
        audioRecorderService.destroy();
      });
    };
  }, []);

  const handleOptionSelect = useCallback(
    (option: string) => {
      sendMessage(option);
    },
    [sendMessage]
  );

  const isNewChat = messages.length === 0 && !isHistoryLoading;

  const { isActive, nextStep, completeAction, getCurrentStep } = useTutorialStore();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#042E5C]/8 bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              toggleSidebar();
              const currentStep = getCurrentStep();
              if (isActive && currentStep?.requiresAction === "open_sidebar") {
                completeAction("open_sidebar");
                nextStep();
              }
            }}
            data-tutorial="hamburger-menu"
            className="w-10 h-10 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/60 hover:text-[#042E5C] transition-all"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={() => { closeChat(); router.push('/student'); }}
            className="w-10 h-10 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/60 hover:text-[#042E5C] hover:bg-[#042E5C]/5 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-extrabold text-[#042E5C] text-lg leading-tight">
              {activeChat.title}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-widest">
                Assistant Active
              </span>
            </div>
          </div>
        </div>

        {/* Right side: grade badge + audio/recording status pills */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            <AudioStatusPill state={playbackState} onStop={stopPlayback} />
            <RecordingStatusPill state={recordingState} onStop={stopSkillRecording} />
          </AnimatePresence>
          {activeChat.grade && (
            <span className="text-xs font-bold text-[#042E5C]/40 bg-[#F4F3EE] px-4 py-2 rounded-full">
              {activeChat.grade}
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex-1 overflow-y-auto flex flex-col">
          <AnimatePresence initial={false}>
            {isHistoryLoading && messages.length === 0 ? (
              <motion.div
                key="loading-history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4"
              >
                <Loader2 className="w-10 h-10 text-[#042E5C]/20 animate-spin" />
                <p className="text-sm text-[#042E5C]/40 font-bold tracking-wide">Retrieving history...</p>
              </motion.div>
            ) : isNewChat ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center px-6 max-w-5xl mx-auto w-full"
              >
                <div className="w-24 h-24 rounded-[2.5rem] bg-white border border-[#042E5C]/10 flex items-center justify-center overflow-hidden mb-8 shadow-sm">
                  <Image 
                    src="/Favicon1.jpg" 
                    alt="Agent Icon" 
                    width={96} 
                    height={96} 
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="text-center space-y-4 mb-12">
                  <h1 className="font-serif text-4xl text-[#042E5C] leading-tight">
                    New session: {activeChat.title}
                  </h1>
                  <p className="text-lg text-[#042E5C]/50 max-w-md mx-auto leading-relaxed">
                    Ask anything about {activeChat.title}. Your Socratic guide is ready.
                  </p>
                </div>
                
                {/* Centered Input for New Chat */}
                <div className="w-full max-w-4xl">
                  <StudentChatInput chatTitle={activeChat.title} isCentered />
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Messages List */}
                <div className="flex-1 px-6 md:px-12 py-8 space-y-8 max-w-5xl mx-auto w-full">
                  {messages.map((msg) => (
                    <ChatMessageBubble
                      key={msg.id}
                      message={msg}
                      isStreaming={msg.id === streamingMessageId}
                      onOptionSelect={handleOptionSelect}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Dedicated Bottom Input Area (Outside Scroll) */}
        {!isNewChat && !isHistoryLoading && (
          <div className="flex-shrink-0 px-6 pb-8 bg-white pt-4 border-t border-[#042E5C]/5">
            <div className="max-w-5xl mx-auto relative">
              <RateLimitPrompt 
                isVisible={isRateLimitHit} 
                onClose={() => setRateLimitHit(false)} 
              />
              <StudentChatInput chatTitle={activeChat.title} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
