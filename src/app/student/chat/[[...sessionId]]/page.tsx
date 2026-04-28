"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { StudentChatView } from "@/features/student/components/StudentChatView";
import { PartnerRequestModal } from "@/features/student/components/PartnerRequestModal";

/**
 * Unified Chat Page using Optional Catch-all routes.
 * Handles both root /student/chat (new) and /student/chat/[sessionId] (existing).
 * This consolidation ensures flicker-free URL upgrades since the component tree stays mounted.
 */
export default function StudentChatUnifiedPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ sessionId?: string[] }>,
  searchParams: Promise<{ agent?: string }>
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  
  const sessionIdFromUrl = resolvedParams.sessionId?.[0];
  const agentFromUrl = resolvedSearchParams.agent;

  const { 
    initNewChat, 
    activeChat, 
    recentChats,
    isSessionsLoading,
    availableAgents, 
    fetchAvailableAgents, 
    fetchSessions,
    studentProfile 
  } = useStudentStore();

  useEffect(() => {
    if (!studentProfile) return;

    // Ensure sessions are loaded for the sidebar
    if (recentChats.length === 0 && !isSessionsLoading) {
      fetchSessions();
    }

    // 1. Handle New Chat Initialization (?agent=...)
    if (agentFromUrl && !sessionIdFromUrl) {
      if (availableAgents.length === 0) {
        fetchAvailableAgents();
      }
      
      // Only init if we don't have an active chat for this agent, 
      // or if the active one hasn't been promoted yet.
      const isCorrectAgent = activeChat?.agent_id === agentFromUrl;
      const isAlreadyActive = activeChat?.id === "new" || (activeChat && activeChat.id !== "new" && isCorrectAgent);

      if (!isAlreadyActive) {
        initNewChat(agentFromUrl);
      }
    } 
    // 2. Handle invalid landing on base /chat
    else if (!sessionIdFromUrl && !activeChat && !agentFromUrl) {
      const timeout = setTimeout(() => router.replace("/student"), 500);
      return () => clearTimeout(timeout);
    }
  }, [agentFromUrl, sessionIdFromUrl, activeChat, initNewChat, router, availableAgents.length, studentProfile, fetchAvailableAgents, fetchSessions, recentChats.length, isSessionsLoading]);

  // Show a local "preparing" spinner only if we have NO chat state and are trying to load one
  const isLoading = !activeChat && (agentFromUrl || sessionIdFromUrl);

  if (isLoading) {
    return (
      <AuthGuard requiredRole="student">
        <div className="h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[#1a3a2a]/10 border-t-[#1a3a2a] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[#1a3a2a]/30 uppercase tracking-widest">Preparing Chat...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="student">
      <div className="h-screen overflow-hidden">
        <StudentChatView />
        <PartnerRequestModal />
      </div>
    </AuthGuard>
  );
}
