"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { StudentChatSidebar } from "./StudentChatSidebar";
import { StudentChatMain } from "./StudentChatMain";

/**
 * StudentChatView acts as a container for the modular chat layout.
 * If no active chat is found (e.g. user refreshed /student/chat directly),
 * it redirects back to the student home.
 */
export function StudentChatView() {
  const router = useRouter();
  const { activeChat, messages, isAITyping } = useStudentStore();

  // Guard: if user lands on /student/chat with no active session, send them home
  useEffect(() => {
    if (!activeChat) {
      router.replace("/student");
    }
  }, [activeChat, router]);

  if (!activeChat) return null;

  return (
    <div className="h-screen flex bg-white font-sans overflow-hidden">
      {/* ── LEFT SIDEBAR ────────────────────────────────────────── */}
      <StudentChatSidebar activeChatId={activeChat.id} />

      {/* ── MAIN CHAT AREA ─────────────────────────────────────── */}
      <StudentChatMain
        activeChat={activeChat}
        messages={messages}
        isAITyping={isAITyping}
      />
    </div>
  );
}
