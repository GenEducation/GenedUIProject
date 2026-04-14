"use client";

import { useStudentStore } from "../store/useStudentStore";
import { StudentChatSidebar } from "./StudentChatSidebar";
import { StudentChatMain } from "./StudentChatMain";
import { StudentAnalyticsDashboard } from "@/components/analytics/StudentAnalyticsDashboard";

/**
 * StudentChatView acts as a container for the modular chat layout.
 * It coordinates the sidebar and main chat area, passing necessary
 * state while allowing the sidebar to be memoized for performance.
 */
export function StudentChatView() {
  const {
    activeChat,
    messages,
    isAITyping,
    isAnalyticsOpen,
  } = useStudentStore();

  if (isAnalyticsOpen) {
    return <StudentAnalyticsDashboard />;
  }

  if (!activeChat) return null;

  return (
    <div className="h-screen flex bg-white font-sans overflow-hidden">
      {/* ── LEFT SIDEBAR (Memoized) ────────────────────────────────────────── */}
      <StudentChatSidebar 
        activeChatId={activeChat.id} 
      />

      {/* ── MAIN CHAT AREA ─────────────────────────────────────────────────── */}
      <StudentChatMain 
        activeChat={activeChat} 
        messages={messages} 
        isAITyping={isAITyping} 
      />
    </div>
  );
}
