"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { VoiceStage } from "./VoiceStage";
import { VoiceTranscript } from "./VoiceTranscript";
import { VoiceControls } from "./VoiceControls";
import { RateLimitPrompt } from "@/features/billing/components/RateLimitPrompt";

const STATUS_CAPTION: Record<string, string> = {
  idle: "Tap to start",
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
      ? "Muted"
      : STATUS_CAPTION[voiceSessionStatus] || "—";

  const agentName = activeChat?.title || "April";
  const subjectLabel = activeChat?.subject ? activeChat.subject : "Voice Session";
  const gradeLabel = activeChat?.grade ? ` · ${activeChat.grade}` : "";

  return (
    <div
      className="h-screen flex flex-col font-sans overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, rgba(91,77,199,0.10), transparent 40%), radial-gradient(circle at 80% 100%, rgba(74,144,217,0.10), transparent 40%), #F7F8FC",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#042E5C]/8 bg-white/50 backdrop-blur-sm">
        <button
          onClick={handleEnd}
          className="flex items-center gap-2 text-[13px] font-bold text-[#042E5C]/60 hover:text-[#042E5C] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to subjects
        </button>
        <div className="text-[13px] font-bold text-[#042E5C]">
          <span className="capitalize">{subjectLabel}</span>
          <span className="text-[#042E5C]/40 font-medium">{gradeLabel}</span>
        </div>
        <div className="w-[140px]" />
      </header>

      {/* Top — Avatar / orb */}
      <section className="flex flex-col items-center justify-center pt-10 pb-6">
        <VoiceStage
          caption={caption}
          reactive={reactive}
          onTap={handleOrbTap}
          onPressStart={handleOrbPressStart}
          onPressEnd={handleOrbPressEnd}
        />
      </section>

      {/* Middle — Transcript (fills remaining space) */}
      <section className="flex-1 px-6 overflow-hidden">
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
}
