"use client";

import { useState, useCallback, useEffect } from "react";
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
  
  const { activeChat, messages, isAITyping, openChatById, studentProfile, isSessionsLoading } = useStudentStore();

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);

  // Handle responsive auto-hide
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Guard & Hydration: if user lands on /student/chat/[id] but state is empty (refresh).
  useEffect(() => {
    if (!studentProfile) return; // wait for auth hydration

    if (sessionId) {
      if (!activeChat || activeChat.id !== sessionId) {
        // Either fresh landing or switched tabs - try to hydrate from ID
        openChatById(sessionId);
      }
    }
  }, [sessionId, openChatById, router, studentProfile, isSessionsLoading]);

  // URL sync logic...
  useEffect(() => {
    const isNewPath = !sessionId || sessionId === "new" || sessionId === "new-focused";
    const hasRealId = activeChat && activeChat.id !== "new" && activeChat.id !== "new-focused";

    if (isNewPath && hasRealId) {
      router.replace(`/student/chat/${activeChat.id}`);
    }
  }, [activeChat?.id, sessionId, router]);

  if (!activeChat) {
    return (
      <div className="h-screen flex items-center justify-center bg-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#042E5C]/10 border-t-[#042E5C] rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#042E5C]/40 tracking-widest uppercase">Initializing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white font-sans overflow-hidden">
      {/* -- LEFT SIDEBAR ------------------------------------------ */}
      <StudentChatSidebar 
        activeChatId={activeChat.id} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <StudentChatMain
        activeChat={activeChat}
        messages={messages}
        isAITyping={isAITyping}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />
    </div>
  );
}
