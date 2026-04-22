"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { StudentChatSidebar } from "./StudentChatSidebar";
import { StudentChatMain } from "./StudentChatMain";

/**
 * StudentChatView acts as a container for the modular chat layout.
 * It now uses URL parameters to stay persistent across refreshes.
 */
export function StudentChatView() {
  const router = useRouter();
  const params = useParams();
  const sessionIdRaw = params?.sessionId;
  const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : (sessionIdRaw as string | undefined);
  
  const { activeChat, messages, isAITyping, openChatById, studentProfile } = useStudentStore();

  // Guard & Hydration: if user lands on /student/chat/[id] but state is empty (refresh).
  useEffect(() => {
    if (!studentProfile) return; // wait for auth hydration

    if (sessionId) {
      if (!activeChat || activeChat.id !== sessionId) {
        // Either fresh landing or switched tabs - try to hydrate from ID
        openChatById(sessionId);
      }
    }
    // Note: base /student/chat is handled by StudentChatBasePage
  }, [sessionId, activeChat, openChatById, router, studentProfile]);

  // URL sync: once the backend returns a real session_id (promoting the 'new' state),
  // update the browser URL so page refresh works correctly.
  useEffect(() => {
    // Only upgrade if we are currently on a "new" chat or the base /chat path
    // AND the activeChat has just received a real UUID from the backend.
    const isNewPath = !sessionId || sessionId === "new";
    const hasRealId = activeChat && activeChat.id !== "new";

    if (isNewPath && hasRealId) {
      console.debug("[Chat] Upgrading URL to saved session:", activeChat.id);
      router.replace(`/student/chat/${activeChat.id}`);
    }
  }, [activeChat?.id, sessionId, router]);

  if (!activeChat) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#1a3a2a]/10 border-t-[#1a3a2a] rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#1a3a2a]/40 tracking-widest uppercase">Initializing Session...</p>
        </div>
      </div>
    );
  }

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
