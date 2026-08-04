"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Mic, Sparkles, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { useSidebarStore } from "../store/useSidebarStore";
import { VoiceStage } from "./VoiceStage";
import { VoiceTranscript } from "./VoiceTranscript";
import { VoiceControls } from "./VoiceControls";
import { RateLimitPrompt } from "@/features/billing/components/RateLimitPrompt";
import { ResizableSplitPane } from "./ResizableSplitPane";
import dynamic from "next/dynamic";
import { ConnectionQualityBanner } from "./ConnectionQualityBanner";

// Lazy-loaded: pulls in pdfjs-dist, which is heavy. Only fetched when a
// chapter PDF is actually opened.
const ChapterPdfViewer = dynamic(
  () => import("./ChapterPdfViewer").then((m) => m.ChapterPdfViewer),
  { ssr: false }
);
import { StudentChatSidebar } from "./StudentChatSidebar";
import { titleCase } from "../utils/displayName";

// "idle" has no entry: the fresh-idle screen shows VoiceStage's own "Tap to
// start" pill instead of a caption (see the ternary in VoiceStage.tsx) — a
// string here would never actually render.
const STATUS_CAPTION: Record<string, string> = {
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
    sessionNotice,
    startVoiceSession,
    stopVoiceSession,
    isMuted,
    toggleMute,
    beginPttUtterance,
    endPttUtterance,
    voicePrefs,
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

  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  const [isMobile, setIsMobile] = useState(false);
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  /* responsive sidebar */
  useEffect(() => {
    const handle = () => {
      applyResponsive(window.innerWidth >= 1024);
      setIsMobile(window.innerWidth < 768);
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Stop voice session on unmount.
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hold-to-speak when mic is muted, using whichever key the student
  // configured in Profile → Voice Settings (PttHotkeyConfig). This used to
  // hardcode "Space" regardless of that setting, so a custom hotkey was
  // silently ignored.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== voicePrefs.pttHotkey || e.repeat) return;
      if (voiceSessionStatus !== "active") return;
      const { isMuted } = useStudentStore.getState();
      if (!isMuted) return;
      e.preventDefault();
      beginPttUtterance();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== voicePrefs.pttHotkey) return;
      if (voiceSessionStatus !== "active") return;
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
  }, [voiceSessionStatus, beginPttUtterance, endPttUtterance, voicePrefs.pttHotkey]);

  const handleEnd = () => {
    // Only confirm when there's a live call to lose — leaving a fresh/idle
    // screen has nothing to confirm. Previously every path (back arrow, End
    // button, "Back to subjects" link) ended the session with no confirmation.
    if (voiceSessionStatus === "active" && !window.confirm("End this voice session?")) {
      return;
    }
    stopVoiceSession();
    router.push("/student");
  };

  // ── Resume / completion state ──────────────────────────────────────────────
  // A reopened voice session arrives with transcript history but an idle pipeline.
  // We must NOT auto-listen — the student resumes explicitly (spec requirement).
  const hasHistory = messages.length > 0;
  const isIdle = voiceSessionStatus === "idle";
  // Treat a non-rate-limit error as "needs retry" (e.g. network failure mid-resume).
  const isError = voiceSessionStatus === "error" && !isRateLimitHit;
  const isCompleted = !!activeChat?.is_complete;
  // Show an explicit Resume CTA when a session with history hasn't been (re)started
  // this visit, or when a (re)connection attempt failed. Never for completed sessions.
  const awaitingResume = (isIdle || isError) && hasHistory && !isCompleted;
  // Completed sessions get a terminal CTA instead of Resume.
  const showCompleted = isCompleted && (isIdle || isError);

  const isVoiceMetadataMissing =
    activeChat &&
    (activeChat.source === "voice" || activeChat.source === "device") &&
    !activeChat.orchestrator_state;

  // Ambient tap-to-start is only for a brand-new session (no history, not completed).
  // Reopened/completed/errored sessions use explicit buttons so we don't surprise-start the mic.
  const ambientStart = isIdle && !hasHistory && !isCompleted ? startVoiceSession : undefined;

  const handleResume = () => {
    setRateLimitHit(false);
    startVoiceSession();
  };

  const handleStartNew = () => {
    stopVoiceSession();
    router.push(
      activeChat?.agent_id ? `/student/voice?agent=${activeChat.agent_id}` : "/student",
    );
  };

  // Orb tap: only starts session when idle AND this is a fresh (no-history) session.
  const handleOrbTap = ambientStart;

  // Orb press-and-hold: PTT when mic is muted during an active session
  const handleOrbPressStart = voiceSessionStatus === "active" && isMuted ? beginPttUtterance : undefined;
  const handleOrbPressEnd = voiceSessionStatus === "active" && isMuted ? endPttUtterance : undefined;

  const reactive = voiceSessionStatus === "active" && !isMuted;

  // Show the orb landing stage only for a fresh session before the conversation starts.
  // Reopened sessions (history) and completed sessions show the transcript + a CTA instead.
  const showOrb =
    !hasHistory && !isCompleted && !(voiceSessionStatus === "active" && messages.length > 0);

  const caption = isRateLimitHit
    ? (rateLimitMessage || "Daily limit reached. Upgrade to Pro for more.")
    : isMuted && voiceSessionStatus === "active"
      ? ""
      : STATUS_CAPTION[voiceSessionStatus] || "—";

  const aiName = titleCase(studentProfile?.ai_name || "Nia");
  const agentName = aiName;
  const subjectLabel = activeChat?.subject ? activeChat.subject : "Voice Session";
  const gradeLabel = activeChat?.grade ? ` · ${activeChat.grade}` : "";

  // Fine SVG noise over the existing radial mesh, so the landing screen has some
  // texture instead of reading as a flat off-white slab.
  const NOISE_URL =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")";

  const bgStyle = {
    background: [
      NOISE_URL,
      "radial-gradient(circle at 20% 0%, rgba(91,77,199,0.10), transparent 40%)",
      "radial-gradient(circle at 80% 100%, rgba(74,144,217,0.10), transparent 40%)",
      "#F7F8FC",
    ].join(", "),
  };

  const textbookPill = activeChat?.chapter_name ? (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={openChapterPdf}
        disabled={isPdfLoading}
        className="flex items-center gap-1.5 transition-all"
        style={{
          padding: "5px 14px",
          borderRadius: 20,
          border: isPdfViewerOpen ? "1.5px solid var(--tutor)" : "1.5px solid #D6D3F0",
          background: isPdfViewerOpen ? "var(--tutor)" : "#EDE9FE",
          color: isPdfViewerOpen ? "#FFFFFF" : "var(--tutor)",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "var(--font-body)",
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
            borderTopColor: isPdfViewerOpen ? "#fff" : "var(--tutor)",
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
  ) : null;

  const voiceContent = (
    <div className="h-full flex flex-col font-sans overflow-hidden" style={bgStyle}>
      {/* Header — solid background + boxed 32px buttons, matching the chat
          header (StudentChatMain.tsx) instead of its own translucent style
          with a hamburger floating outside the header. */}
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex items-center justify-between" style={{ padding: "10px 12px" }}>
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={openSidebar}
                title="Open sidebar"
                className="transition-all flex-shrink-0"
                style={{ width: 32, height: 32, borderRadius: 10, background: "#F7F8FC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A5568", cursor: "pointer" }}
              >
                <Menu size={15} strokeWidth={1.75} />
              </button>
            )}
            <button
              onClick={handleEnd}
              title="Back to subjects"
              className="transition-all flex-shrink-0"
              style={{ width: 32, height: 32, borderRadius: 10, background: "#F7F8FC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A5568", cursor: "pointer" }}
            >
              <ArrowLeft size={15} />
            </button>
          </div>
          <div className="text-[13px] font-bold text-[var(--primary-ink)] text-right">
            <span className="capitalize">{subjectLabel}</span>
            <span className="text-[var(--primary-ink)]/40 font-medium">{gradeLabel}</span>
          </div>
        </div>
      </header>

      {/* Connection quality alert — slides in below header */}
      <ConnectionQualityBanner quality={connectionQuality} notice={sessionNotice} />

      {/* Top — Avatar / orb (landing state only; hidden once the conversation is underway) */}
      {showOrb && (
        <section className="flex flex-col items-center justify-center pt-6 pb-2">
          <VoiceStage
            caption={caption}
            reactive={reactive}
            onTap={handleOrbTap}
            onPressStart={handleOrbPressStart}
            onPressEnd={handleOrbPressEnd}
            agentName={agentName}
          />
        </section>
      )}

      {/* Textbook pill — between orb and transcript */}
      {textbookPill && <div className="flex justify-center pb-3">{textbookPill}</div>}

      {/* Middle — Conversation feed (fills remaining space; full height once orb is hidden) */}
      <section className="flex-1 min-h-[140px] px-3 sm:px-6 overflow-hidden">
        <VoiceTranscript messages={messages} agentName={agentName} />
      </section>

      {/* Bottom — Controls (live), Resume CTA (reopened), or Completed CTA */}
      <section className="relative px-3 sm:px-6 pt-5 pb-7 flex flex-col items-center gap-5">
        <RateLimitPrompt
          isVisible={isRateLimitHit}
          onClose={() => setRateLimitHit(false)}
        />

        {showCompleted ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[13px] font-bold uppercase tracking-widest text-[var(--primary-ink)]/50">
              Session Completed
            </p>
            <button
              onClick={handleStartNew}
              className="flex items-center gap-2 px-6 h-12 rounded-full font-bold text-[14px] text-white transition-all shadow-lg"
              style={{ background: "linear-gradient(135deg, var(--tutor), var(--tutor-soft))" }}
            >
              <Sparkles size={16} />
              Start New Session
            </button>
          </div>
        ) : awaitingResume ? (
          <div className="flex flex-col items-center gap-3">
            {isError && (
              <p className="text-[12px] font-semibold text-[#E8635A] text-center max-w-[280px]">
                Couldn’t reconnect the voice session. Your transcript is safe — try again.
              </p>
            )}
            {isVoiceMetadataMissing && (
              <p className="text-[12px] font-semibold text-[#D4820A] text-center max-w-[280px]">
                Voice session state is missing. You can view the transcript below or restart the voice session.
              </p>
            )}
            <button
              onClick={handleResume}
              className="flex items-center gap-2.5 px-7 h-13 sm:h-14 rounded-full font-bold text-[15px] text-white transition-all select-none"
              style={{
                background: "linear-gradient(135deg, var(--tutor), var(--tutor-soft))",
                boxShadow: "0 8px 24px rgba(91,77,199,0.40)",
                paddingTop: 14,
                paddingBottom: 14,
              }}
            >
              <Mic size={18} />
              {isVoiceMetadataMissing ? "Restart Voice Session" : isError ? "Reconnect Voice Session" : "Resume Voice Session"}
            </button>
            <button
              onClick={handleEnd}
              className="text-[12px] font-semibold text-[var(--primary-ink)]/40 hover:text-[var(--primary-ink)]/70 transition-colors"
            >
              Back to subjects
            </button>
          </div>
        ) : ambientStart ? (
          // Fresh session, nothing started yet. VoiceControls would be a
          // disabled mic plus a destructive "End" for a call that hasn't
          // begun — show neither; the orb's "Tap to start" pill is the
          // single start affordance.
          null
        ) : (
          <VoiceControls onEnd={handleEnd} />
        )}
      </section>
    </div>
  );

  const mainArea = (
    // No whole-pane onClick here — the orb + its "Tap to start" pill
    // (VoiceStage.tsx) are the single, visible start affordance. A second,
    // invisible full-pane click target duplicated it and could fire from an
    // accidental tap anywhere on the screen.
    <div className="flex-1 min-w-0 h-full overflow-hidden relative">
      {isPdfViewerOpen && chapterPdfUrl ? (
        isMobile ? (
          <>
            {voiceContent}
            {/* Full-screen textbook overlay on mobile */}
            <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "#F7F8FC" }} onClick={(e) => e.stopPropagation()}>
              <ChapterPdfViewer
                pdfUrl={chapterPdfUrl}
                chapterName={activeChat?.chapter_name || ""}
                onClose={closePdfViewer}
              />
            </div>
          </>
        ) : (
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
        )
      ) : (
        voiceContent
      )}
    </div>
  );

  return (
    <div className="h-screen flex font-sans overflow-hidden relative">
      <StudentChatSidebar
        activeChatId={activeChat?.id || "none"}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        sessionType="voice"
      />
      {/* The sidebar-open toggle now lives in the voice header itself
          (matches the chat header) instead of floating outside it. */}
      {mainArea}
    </div>
  );
}
