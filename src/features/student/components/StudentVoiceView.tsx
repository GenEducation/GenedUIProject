"use client";

import { useEffect } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { VoiceStage } from "./VoiceStage";
import { VoiceTranscript } from "./VoiceTranscript";
import { VoiceControls } from "./VoiceControls";
import { RateLimitPrompt } from "@/features/billing/components/RateLimitPrompt";
import { ResizableSplitPane } from "./ResizableSplitPane";
import { ChapterPdfViewer } from "./ChapterPdfViewer";
import { ConnectionQualityBanner } from "./ConnectionQualityBanner";

const STATUS_CAPTION: Record<string, string> = {
  idle: "Tap anywhere on the screen to start",
  connecting: "Connecting…",
  active: "Listening…",
  error: "Connection error",
};

export function StudentVoiceView() {
  const router = useRouter();
  const {
    activeChat,
    messages,
    voiceSessionStatus,
    connectionQuality,
    startVoiceSession,
    stopVoiceSession,
    isMuted,
    toggleMute,
    beginPttUtterance,
    endPttUtterance,
    studentProfile,
    isRateLimitHit,
    rateLimitMessage,
    setRateLimitHit,
    openChapterPdf,
    closePdfViewer,
    isPdfViewerOpen,
    isPdfLoading,
    chapterPdfUrl,
    chapterPdfError,
    clearPdfError,
  } = useStudentStore();

  // Stop voice session on unmount.
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Space bar hold-to-speak when mic is muted.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (voiceSessionStatus !== "active") return;
      const { isMuted } = useStudentStore.getState();
      if (!isMuted) return;
      e.preventDefault();
      beginPttUtterance();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (voiceSessionStatus !== "active") return;
      const { isMuted } = useStudentStore.getState();
      // end PTT if we were holding (pttHeld will be true)
      const { pttHeld } = useStudentStore.getState();
      if (!pttHeld) return;
      e.preventDefault();
      endPttUtterance();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [voiceSessionStatus, beginPttUtterance, endPttUtterance]);

  const handleEnd = () => {
    stopVoiceSession();
    router.push("/student");
  };

  // Orb tap: only starts session when idle
  const handleOrbTap = voiceSessionStatus === "idle" ? startVoiceSession : undefined;

  // Orb press-and-hold: PTT when mic is muted during an active session
  const handleOrbPressStart = voiceSessionStatus === "active" && isMuted ? beginPttUtterance : undefined;
  const handleOrbPressEnd = voiceSessionStatus === "active" && isMuted ? endPttUtterance : undefined;

  const reactive = voiceSessionStatus === "active" && !isMuted;

  const caption = isRateLimitHit
    ? (rateLimitMessage || "Daily limit reached. Upgrade to Pro for more.")
    : isMuted && voiceSessionStatus === "active"
      ? ""
      : STATUS_CAPTION[voiceSessionStatus] || "—";

  const aiName = studentProfile?.ai_name || "Nia";
  const agentName = aiName;
  const subjectLabel = activeChat?.subject ? activeChat.subject : "Voice Session";
  const gradeLabel = activeChat?.grade ? ` · ${activeChat.grade}` : "";

  const bgStyle = {
    background:
      "radial-gradient(circle at 20% 0%, rgba(91,77,199,0.10), transparent 40%), radial-gradient(circle at 80% 100%, rgba(74,144,217,0.10), transparent 40%), #F7F8FC",
  };

  const voiceContent = (
    <div className="h-full flex flex-col font-sans overflow-hidden" style={bgStyle}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-[#042E5C]/8 bg-white/50 backdrop-blur-sm">
        <button
          onClick={handleEnd}
          className="flex items-center gap-2 text-[13px] font-bold text-[#042E5C]/60 hover:text-[#042E5C] transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
          Back to subjects
        </button>
        <div className="text-[13px] font-bold text-[#042E5C] text-right">
          <span className="capitalize">{subjectLabel}</span>
          <span className="text-[#042E5C]/40 font-medium">{gradeLabel}</span>
        </div>
      </header>

      {/* Connection quality alert — slides in below header */}
      <ConnectionQualityBanner quality={connectionQuality} />

      {/* Top — Avatar / orb */}
      <section className="flex flex-col items-center justify-center pt-6 pb-2">
        <VoiceStage
          caption={caption}
          reactive={reactive}
          onTap={handleOrbTap}
          onPressStart={handleOrbPressStart}
          onPressEnd={handleOrbPressEnd}
        />
      </section>

      {/* Textbook pill — between orb and transcript */}
      {activeChat?.chapter_name && (
        <div className="flex flex-col items-center gap-1.5 pb-3">
          <button
            onClick={openChapterPdf}
            disabled={isPdfLoading}
            className="flex items-center gap-1.5 transition-all"
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: isPdfViewerOpen ? "1.5px solid #5B4DC7" : "1.5px solid #D6D3F0",
              background: isPdfViewerOpen ? "#5B4DC7" : "#EDE9FE",
              color: isPdfViewerOpen ? "#FFFFFF" : "#5B4DC7",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              cursor: isPdfLoading ? "default" : "pointer",
              opacity: isPdfLoading ? 0.7 : 1,
            }}
          >
            {isPdfLoading ? (
              <span style={{
                display: "inline-block",
                width: 11,
                height: 11,
                border: `2px solid ${isPdfViewerOpen ? "rgba(255,255,255,0.4)" : "#C4B8F5"}`,
                borderTopColor: isPdfViewerOpen ? "#fff" : "#5B4DC7",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }} />
            ) : (
              <BookOpen size={13} />
            )}
            View textbook
          </button>
          {chapterPdfError && (
            <button
              onClick={clearPdfError}
              style={{
                fontSize: 11,
                color: "#EF4444",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {chapterPdfError} ✕
            </button>
          )}
        </div>
      )}

      {/* Middle — Transcript (fills remaining space) */}
      <section className="flex-1 min-h-[140px] px-6 overflow-hidden">
        <VoiceTranscript messages={messages} agentName={agentName} />
      </section>

      {/* Bottom — Controls */}
      <section className="relative px-6 pt-5 pb-7 flex flex-col items-center gap-5">
        <RateLimitPrompt
          isVisible={isRateLimitHit}
          onClose={() => setRateLimitHit(false)}
        />
        <VoiceControls onEnd={handleEnd} />
      </section>
    </div>
  );

  if (isPdfViewerOpen && chapterPdfUrl) {
    return (
      <div className="h-screen flex font-sans overflow-hidden">
        <ResizableSplitPane
          left={voiceContent}
          right={
            <ChapterPdfViewer
              pdfUrl={chapterPdfUrl}
              chapterName={activeChat?.chapter_name || ""}
              onClose={closePdfViewer}
            />
          }
          defaultLeftPercent={50}
          minLeftPx={280}
          minRightPx={240}
          storageKey="pdf_split_voice"
        />
      </div>
    );
  }

  return (
    <div
      className="h-screen font-sans overflow-hidden"
      onClick={voiceSessionStatus === "idle" ? startVoiceSession : undefined}
      style={{ cursor: voiceSessionStatus === "idle" ? "pointer" : "default" }}
    >
      {voiceContent}
    </div>
  );
}
