"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { VoiceStage } from "./VoiceStage";
import { VoiceTranscript } from "./VoiceTranscript";
import { VoiceControls } from "./VoiceControls";
import { PushToTalkButton } from "./PushToTalkButton";
import { PttHotkeyConfig } from "./PttHotkeyConfig";
import { RateLimitPrompt } from "@/features/billing/components/RateLimitPrompt";

const STATUS_CAPTION: Record<string, string> = {
  idle: "Tap to start",
  connecting: "Connecting…",
  active: "Listening…",
  error: "Connection error",
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function StudentVoiceView() {
  const router = useRouter();
  const {
    activeChat,
    messages,
    voiceSessionStatus,
    startVoiceSession,
    stopVoiceSession,
    voicePrefs,
    pttHeld,
    beginPttUtterance,
    endPttUtterance,
    studentProfile,
    isRateLimitHit,
    rateLimitMessage,
    setRateLimitHit,
  } = useStudentStore();

  // Auto-start voice session. Relies on voiceSessionStatus ("idle" → start).
  // No ref guard: stopVoiceSession() resets status to "idle" on cleanup, so
  // React Strict Mode's double-mount naturally retries without getting stuck.
  useEffect(() => {
    if (!studentProfile || !activeChat) return;
    if (voiceSessionStatus !== "idle") return;
    startVoiceSession();
  }, [studentProfile, activeChat, voiceSessionStatus, startVoiceSession]);

  // Stop voice session on unmount.
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PTT global hotkey: keydown/keyup scoped to voice view + ptt mode.
  useEffect(() => {
    if (voicePrefs.listenMode !== "ptt") return;
    const targetCode = voicePrefs.pttHotkey;
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code !== targetCode) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      beginPttUtterance();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== targetCode) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      endPttUtterance();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [voicePrefs.listenMode, voicePrefs.pttHotkey, beginPttUtterance, endPttUtterance]);

  const handleEnd = () => {
    stopVoiceSession();
    router.push("/student");
  };

  const isPtt = voicePrefs.listenMode === "ptt";
  const reactive = isPtt ? pttHeld : voiceSessionStatus === "active";
  const caption = isRateLimitHit
    ? (rateLimitMessage || "Daily limit reached. Upgrade to Pro for more.")
    : isPtt
      ? pttHeld
        ? "Listening…"
        : voiceSessionStatus === "active"
          ? "Hold to talk"
          : STATUS_CAPTION[voiceSessionStatus] || "—"
      : STATUS_CAPTION[voiceSessionStatus] || "—";

  const agentName = activeChat?.title || "April";
  const subjectLabel = activeChat?.subject ? activeChat.subject : "Voice Session";
  const gradeLabel = activeChat?.grade ? ` · ${activeChat.grade}` : "";

  console.log("🎙️ [StudentVoiceView] Rendering state:", {
    voiceSessionStatus,
    isRateLimitHit,
    rateLimitMessage,
    caption,
  });

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
        <VoiceStage caption={caption} reactive={reactive} />
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
        {isPtt && (
          <>
            <PushToTalkButton />
            <PttHotkeyConfig />
          </>
        )}
        <VoiceControls onEnd={handleEnd} />
      </section>
    </div>
  );
}
