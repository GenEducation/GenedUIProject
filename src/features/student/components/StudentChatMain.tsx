"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Menu, Volume2, VolumeX, Mic, MicOff, Square, Check } from "lucide-react";
import React, { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStudentStore, ChatMessage, ChatSession } from "../store/useStudentStore";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { KaraokeRenderer } from "./KaraokeRenderer";
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

// ── Reading Skill Modal ──────────────────────────────────────────────────────
function ReadingSkillModal({ 
  state, 
  prompt, 
  skillData,
  error,
  analysisResult,
  playbackState,
  onStart,
  onStop, 
  onPlayAanya,
  onDismissPrompt 
}: { 
  state: string; 
  prompt: "silence" | "cap" | null; 
  skillData: any;
  error: string | null;
  analysisResult: any | null;
  playbackState: string;
  onStart: () => void;
  onStop: () => void;
  onPlayAanya: () => void;
  onDismissPrompt: () => void;
}) {
  // Reset to return null only on idle
  if (state === "idle") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#042E5C]/40 backdrop-blur-sm" 
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white rounded-[32px] shadow-2xl border border-[#042E5C]/10 w-full max-w-lg overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#042E5C]/5 flex items-center justify-between bg-[#FAFBFF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Mic className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#042E5C]">Reading Task</h3>
              <p className="text-[11px] font-bold text-[#042E5C]/40 uppercase tracking-widest">Speak clearly into the mic</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-[#042E5C]/5 shadow-sm">
            {state === "recording" ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-600 uppercase tracking-tight">Recording</span>
              </>
            ) : state === "uploading" || state === "processing" ? (
              <>
                <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-tight">Saving</span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-amber-600 uppercase tracking-tight">Ready</span>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-y-auto max-h-[40vh]">
          <div className="bg-[#F7FAFF] rounded-3xl p-4 mb-8 border border-[#042E5C]/5">
            <KaraokeRenderer 
              text={skillData?.source_text || skillData?.text || ""} 
              directiveId={skillData?.directive_id || ""} 
              mode={skillData?.type}
            />
          </div>
        </div>

        {/* Actions Area */}
        <div className="px-8 pb-8 pt-4 flex flex-col gap-4">
              {(state === "recording" || state === "permission_request" || state === "ready" || state === "uploading" || state === "processing") && (
                <div className="w-full flex flex-col gap-3">
                  {state === "processing" && (
                    <div className="bg-blue-50 text-blue-800 text-xs px-4 py-3 rounded-xl text-center font-bold border border-blue-200 animate-pulse">
                      Analyzing your reading...
                    </div>
                  )}
                  {prompt === "silence" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 text-amber-800 text-xs px-4 py-3 rounded-xl text-center font-bold border border-amber-200"
                >
                  Silence detected. Are you finished reading?
                </motion.div>
              )}
              {prompt === "cap" && (
                <div className="bg-blue-50 text-blue-800 text-xs px-4 py-3 rounded-xl text-center font-bold border border-blue-200">
                  Time's up! Tap done to send your recording.
                </div>
              )}

              <button
                disabled={state === "permission_request" || state === "uploading" || state === "processing"}
                onClick={(state === "permission_request" || state === "ready") ? onStart : onStop}
                className="w-full bg-[#042E5C] hover:bg-[#042E5C]/90 disabled:bg-[#042E5C]/50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/10 active:scale-[0.98]"
              >
                {state === "permission_request" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Requesting Mic...
                  </>
                ) : state === "ready" ? (
                  <>
                    <Mic className="w-5 h-5" />
                    Start Reading Now
                  </>
                ) : state === "uploading" || state === "processing" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {prompt === "silence" ? "Yes, Send Recording" : "I'm Done Reading"}
                  </>
                )}
              </button>
              
              {prompt === "silence" && (
                <button
                  onClick={onDismissPrompt}
                  className="text-xs font-bold text-[#042E5C]/40 hover:text-[#042E5C] uppercase tracking-widest pt-1"
                >
                  Keep Recording
                </button>
              )}
            </div>
          )}

          {state === "completed" && analysisResult && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">Accuracy</span>
                  <span className="text-xl font-black text-blue-900">
                    {Math.max(0, Math.round((1 - (analysisResult.wer || 0)) * 100))}%
                  </span>
                </div>
                <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-green-600 font-bold">Speed</span>
                  <span className="text-xl font-black text-green-900">
                    {Math.round(analysisResult.pace_wpm || 0)} <span className="text-[10px] font-normal">wpm</span>
                  </span>
                </div>
                <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-purple-600 font-bold">Fluency</span>
                  <span className="text-lg font-black text-purple-900 capitalize">
                    {analysisResult.fluency || "Good"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-700">A</div>
                  <span className="text-xs font-bold text-orange-800">Aanya's Feedback</span>
                </div>
                <p className="text-sm text-orange-900/80 italic leading-relaxed">
                  "{analysisResult.feedback || "Great job reading! Keep it up."}"
                </p>
              </div>

              <div className="flex gap-3">
                {skillData?.type === "KARAOKE" && (
                  <button
                    onClick={onPlayAanya}
                    disabled={playbackState === "loading" || playbackState === "buffering"}
                    className="flex-1 bg-white border-2 border-[#042E5C] text-[#042E5C] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {(playbackState === "loading" || playbackState === "buffering") ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                    Hear Aanya
                  </button>
                )}
                <button
                  onClick={onStop}
                  className="flex-1 bg-[#042E5C] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
          
          {state === "error" && (
            <div className="flex flex-col gap-3 items-center w-full">
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-600 w-full">
                <MicOff className="w-5 h-5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold">
                    {error?.toLowerCase().includes("upload") || error?.toLowerCase().includes("server") || error?.includes("500")
                      ? "Upload Failed"
                      : error?.toLowerCase().includes("fetch") || error?.toLowerCase().includes("network")
                      ? "Network Error"
                      : "Microphone access failed"}
                  </span>
                  {error && <span className="text-[10px] opacity-70 leading-tight mt-0.5">{error}</span>}
                  {typeof window !== "undefined" && !window.isSecureContext && (
                    <span className="text-[10px] font-extrabold uppercase tracking-tighter mt-1 bg-red-100 px-2 py-0.5 rounded">
                      Insecure Context (Requires HTTPS or localhost)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={onStart}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={onStop}
                  className="flex-1 bg-[#042E5C]/5 hover:bg-[#042E5C]/10 text-[#042E5C] font-bold py-4 rounded-2xl transition-all"
                >
                  Close Task
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
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
    recordingState, 
    recordingPrompt, 
    recordingError,
    activeSkillDirective,
    oralAnalysisResult,
    playbackState,
    playDirectiveTts,
    stopSkillRecording, 
    confirmStartRecording,
    dismissRecordingPrompt,
    stopPlayback
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
            <AudioStatusPill key="audio-pill" state={playbackState} onStop={stopPlayback} />
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

        {/* Global Reading Skill Modal */}
        <AnimatePresence>
          {recordingState !== "idle" && (
            <ReadingSkillModal 
              state={recordingState} 
              prompt={recordingPrompt} 
              skillData={activeSkillDirective}
              error={recordingError}
              analysisResult={oralAnalysisResult}
              playbackState={playbackState}
              onStart={confirmStartRecording}
              onStop={stopSkillRecording}
              onPlayAanya={() => {
                if (activeSkillDirective?.directive_id) {
                  playDirectiveTts(activeSkillDirective.directive_id, []);
                }
              }}
              onDismissPrompt={dismissRecordingPrompt}
            />
          )}
        </AnimatePresence>

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
