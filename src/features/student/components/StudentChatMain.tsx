"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Menu, Loader2, Volume2, VolumeX, Mic, MicOff, Square, Check, BookOpen, HelpCircle, GraduationCap } from "lucide-react";
import React, { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { STUDENT_COLORS } from "../theme/colors";
import { useStudentStore, ChatMessage, ChatSession } from "../store/useStudentStore";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { KaraokeRenderer } from "./KaraokeRenderer";
import { StudentChatInput } from "./StudentChatInput";
import { RateLimitPrompt } from "@/features/billing/components/RateLimitPrompt";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { useSessionHeartbeat } from "@/hooks/useSessionHeartbeat";

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
        className="absolute inset-0 bg-[#1C2333]/40 backdrop-blur-sm" 
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F7F8FC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base" style={{ color: "#1A202C" }}>Reading Task</h3>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>Speak clearly into the mic</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-full border border-[#E2E8F0] shadow-sm flex-shrink-0">
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
        <div className="p-4 sm:p-8 flex-1 overflow-y-auto" style={{ maxHeight: "38vh" }}>
          <div className="bg-[#F7F8FC] rounded-2xl sm:rounded-3xl p-3 sm:p-4 mb-4 sm:mb-8 border border-[#E2E8F0]">
            <KaraokeRenderer 
              text={skillData?.source_text || skillData?.text || ""} 
              directiveId={skillData?.directive_id || ""} 
              mode={skillData?.type}
            />
          </div>
        </div>

        {/* Actions Area */}
        <div className="px-4 sm:px-8 pb-5 sm:pb-8 pt-3 sm:pt-4 flex flex-col gap-3 sm:gap-4">
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
                className="w-full bg-[var(--tutor)] hover:bg-[var(--tutor)]/90 disabled:bg-[var(--tutor)]/50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-[var(--tutor)]/20 active:scale-[0.98]"
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
                  className="text-xs font-bold text-[#94A3B8] hover:text-[var(--tutor)] uppercase tracking-widest pt-1"
                >
                  Keep Recording
                </button>
              )}
            </div>
          )}

          {state === "completed" && analysisResult && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-blue-50/50 p-2.5 sm:p-3 rounded-xl border border-blue-100 flex flex-col items-center text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-blue-600 font-bold mb-0.5">Accuracy</span>
                  <span className="text-lg sm:text-xl font-black text-blue-900 leading-tight">
                    {Math.max(0, Math.round((1 - (analysisResult.wer || 0)) * 100))}%
                  </span>
                </div>
                <div className="bg-green-50/50 p-2.5 sm:p-3 rounded-xl border border-green-100 flex flex-col items-center text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-green-600 font-bold mb-0.5">Speed</span>
                  <span className="text-lg sm:text-xl font-black text-green-900 leading-tight">
                    {Math.round(analysisResult.pace_wpm || 0)}
                  </span>
                  <span className="text-[9px] text-green-700 font-medium">wpm</span>
                </div>
                <div className="bg-purple-50/50 p-2.5 sm:p-3 rounded-xl border border-purple-100 flex flex-col items-center text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-purple-600 font-bold mb-0.5">Fluency</span>
                  <span className="text-sm sm:text-base font-black text-purple-900 capitalize leading-tight break-words w-full text-center">
                    {(analysisResult.fluency || "Good").replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-orange-50/30 rounded-xl sm:rounded-2xl border border-orange-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-700 flex-shrink-0">A</div>
                  <span className="text-xs font-bold text-orange-800">Aanya's Feedback</span>
                </div>
                <p className="text-sm text-orange-900/80 italic leading-relaxed">
                  "{analysisResult.feedback || "Great job reading! Keep it up."}"
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3">
                {skillData?.type === "KARAOKE" && (
                  <button
                    onClick={onPlayAanya}
                    disabled={playbackState === "loading" || playbackState === "buffering"}
                    className="flex-1 bg-white border-2 border-[var(--tutor)] text-[var(--tutor)] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
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
                  className="flex-1 bg-[var(--tutor)] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[var(--tutor)]/20 active:scale-[0.98] transition-all"
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
                  className="flex-1 bg-[var(--tutor)]/5 hover:bg-[var(--tutor)]/10 text-[var(--tutor)] font-bold py-4 rounded-2xl transition-all"
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
    stopPlayback,
    openChapterPdf,
    isPdfViewerOpen,
    isPdfLoading,
    chapterPdfError,
    clearPdfError,
    studentProfile,
    chatQueryMode,
    chatQueryModePinned,
    setChatQueryMode,
  } = useStudentStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Heartbeat: signals to the backend that this session is live.
  useSessionHeartbeat(studentProfile?.user_id, activeChat?.id);

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

  useTutorialStore();

  const chapterPct = typeof activeChat.chapter_completion_percentage === "number"
    ? Math.round(activeChat.chapter_completion_percentage)
    : null;

  // Derive subject color from chat subject
  // Raw hex, not var() — these get alpha-suffix concatenated below
  // (`${subjectAccent}20`), which CSS custom properties can't support.
  const subjectColorMap: Record<string, string> = {
    english: STUDENT_COLORS.subjectEnglish, mathematics: STUDENT_COLORS.subjectMath, math: STUDENT_COLORS.subjectMath,
    science: STUDENT_COLORS.subjectScience, hindi: STUDENT_COLORS.subjectHindi,
  };
  const subjectKey = (activeChat.subject ?? "").toLowerCase();
  const subjectAccent = Object.entries(subjectColorMap).find(([k]) => subjectKey.includes(k))?.[1] ?? STUDENT_COLORS.tutor;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#F7F8FC" }}>
      {/* Top bar */}
      <header
        className="flex-shrink-0 relative"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}
      >
        <div className="flex items-center justify-between" style={{ padding: "10px 12px" }}>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="transition-all flex-shrink-0"
              style={{ width: 32, height: 32, borderRadius: 10, background: "#F7F8FC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A5568", cursor: "pointer" }}
            >
              <Menu size={15} />
            </button>
            <button
              onClick={() => { closeChat(); router.push('/student'); }}
              className="transition-all flex-shrink-0"
              style={{ width: 32, height: 32, borderRadius: 10, background: "#F7F8FC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A5568", cursor: "pointer" }}
            >
              <ArrowLeft size={15} />
            </button>
            <div className="min-w-0">
              <h2 className="truncate" style={{ fontWeight: 800, color: "#1A202C", fontSize: "clamp(11px, 3vw, 17px)", lineHeight: 1.3, fontFamily: "var(--font-display), var(--font-body)", margin: 0 }}>
                {activeChat.title}
              </h2>
              {(chapterPct !== null || activeChat.subject) && (
                <p style={{ fontSize: "clamp(9px, 2.2vw, 13px)", fontWeight: 600, color: subjectAccent, margin: "1px 0 0", fontFamily: "var(--font-body)" }}>
                  {[chapterPct !== null ? `${chapterPct}%` : null, activeChat.subject].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* Right side: textbook pill + audio status + active dot + grade badge */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {activeChat.chapter_name && (
              <div className="flex flex-col items-end gap-0.5">
                <button
                  onClick={openChapterPdf}
                  disabled={isPdfLoading}
                  className="flex items-center gap-1.5 transition-all"
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: isPdfViewerOpen ? "1.5px solid var(--tutor)" : "1.5px solid #D6D3F0",
                    background: isPdfViewerOpen ? "var(--tutor)" : "#EDE9FE",
                    color: isPdfViewerOpen ? "#FFFFFF" : "var(--tutor)",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    cursor: isPdfLoading ? "default" : "pointer",
                    whiteSpace: "nowrap",
                    opacity: isPdfLoading ? 0.7 : 1,
                  }}
                >
                  {isPdfLoading ? (
                    <span style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      border: `2px solid ${isPdfViewerOpen ? "rgba(255,255,255,0.4)" : "#C4B8F5"}`,
                      borderTopColor: isPdfViewerOpen ? "#fff" : "var(--tutor)",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }} />
                  ) : (
                    <BookOpen size={12} />
                  )}
                  Textbook
                </button>
                {chapterPdfError && (
                  <button
                    onClick={clearPdfError}
                    style={{ fontSize: 10, color: "#EF4444", background: "none", border: "none", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                  >
                    {chapterPdfError} ✕
                  </button>
                )}
              </div>
            )}
            <AnimatePresence>
              <AudioStatusPill key="audio-pill" state={playbackState} onStop={stopPlayback} />
            </AnimatePresence>

            {/* ── Segmented mode toggle ── */}
            <motion.div
              className="flex items-center flex-shrink-0"
              onClick={() => setChatQueryMode(chatQueryMode === "doubt" ? "study" : "doubt", true)}
              whileTap={{ scale: 0.97 }}
              style={{
                background: "#E8E8EC",
                borderRadius: 999,
                padding: 3,
                gap: 0,
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {/* Doubt segment */}
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, zIndex: 1 }}>
                {chatQueryMode === "doubt" && (
                  <motion.div
                    layoutId="mode-active-pill"
                    style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--tutor)", boxShadow: "0 2px 8px rgba(91,77,199,0.4)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <motion.span
                  animate={{ color: chatQueryMode === "doubt" ? "#FFFFFF" : "#9CA3AF" }}
                  transition={{ duration: 0.18 }}
                  style={{ position: "relative", zIndex: 1, display: "flex" }}
                >
                  <HelpCircle size={11} />
                </motion.span>
                <motion.span
                  animate={{ color: chatQueryMode === "doubt" ? "#FFFFFF" : "#9CA3AF" }}
                  transition={{ duration: 0.18 }}
                  style={{ position: "relative", zIndex: 1, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  Doubt
                </motion.span>
              </div>

              {/* Teaching segment */}
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, zIndex: 1 }}>
                {chatQueryMode === "study" && (
                  <motion.div
                    layoutId="mode-active-pill"
                    style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#00B894", boxShadow: "0 2px 8px rgba(0,184,148,0.4)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <motion.span
                  animate={{ color: chatQueryMode === "study" ? "#FFFFFF" : "#9CA3AF" }}
                  transition={{ duration: 0.18 }}
                  style={{ position: "relative", zIndex: 1, display: "flex" }}
                >
                  <GraduationCap size={11} />
                </motion.span>
                <motion.span
                  animate={{ color: chatQueryMode === "study" ? "#FFFFFF" : "#9CA3AF" }}
                  transition={{ duration: 0.18 }}
                  style={{ position: "relative", zIndex: 1, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  Teaching
                </motion.span>
              </div>
            </motion.div>

            {/* ── Static status: active dot + grade ── */}
            <div className="flex items-center gap-1.5 flex-shrink-0" style={{ fontFamily: "var(--font-body)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00B894", flexShrink: 0 }} className="animate-pulse" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#00B894", letterSpacing: "0.04em" }}>Active</span>
              {activeChat.grade && (
                <>
                  <span style={{ color: "#CBD5E1", fontSize: 10 }}>·</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", whiteSpace: "nowrap" }}>{activeChat.grade}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Full-width progress bar at header bottom */}
        {chapterPct !== null && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: `${subjectAccent}20` }}>
            <div style={{ width: `${chapterPct}%`, height: "100%", background: subjectAccent, transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)", borderRadius: "0 3px 3px 0", boxShadow: `0 0 6px ${subjectAccent}80` }} />
          </div>
        )}
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
                <Loader2 className="animate-spin" style={{ width: 36, height: 36, color: "#5B4DC720" }} />
                <p style={{ fontSize: 13, color: "#94A3B8", fontWeight: 700, letterSpacing: "0.05em" }}>Retrieving history...</p>
              </motion.div>
            ) : isNewChat ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 max-w-5xl mx-auto w-full"
              >
                <div style={{ width: "clamp(64px, 16vw, 96px)", height: "clamp(64px, 16vw, 96px)", borderRadius: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 32, boxShadow: "0 2px 12px rgba(91,77,199,0.08)" }}>
                  <Image
                    src="/Favicon1.jpg"
                    alt="Agent Icon"
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="text-center space-y-3 mb-12">
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, color: "#1A202C", lineHeight: 1.2 }}>
                    New session: {activeChat.title}
                  </h1>
                  <p style={{ fontSize: 16, color: "#4A5568", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                    Ask anything about {activeChat.title}. {studentProfile?.ai_name || "Your Socratic guide"} is ready.
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
                <div className="flex-1 px-3 sm:px-6 md:px-12 py-8 space-y-8 max-w-5xl mx-auto w-full">
                  {messages
                    .filter((msg, idx) => !(idx === 0 && msg.sender === "user"))
                    .map((msg) => (
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
                  playDirectiveTts(activeSkillDirective.directive_id);
                }
              }}
              onDismissPrompt={dismissRecordingPrompt}
            />
          )}
        </AnimatePresence>

        {/* Dedicated Bottom Input Area (Outside Scroll) */}
        {!isNewChat && !isHistoryLoading && (
          <div style={{ flexShrink: 0, padding: "12px 24px 28px", background: "#FFFFFF", borderTop: "1px solid #E2E8F0" }}>
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
