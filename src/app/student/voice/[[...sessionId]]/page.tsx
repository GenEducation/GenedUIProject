"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { StudentVoiceView } from "@/features/student/components/StudentVoiceView";

export default function StudentVoiceUnifiedPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId?: string[] }>;
  searchParams: Promise<{ agent?: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);

  const sessionIdFromUrl = resolvedParams.sessionId?.[0];
  const agentFromUrl = resolvedSearchParams.agent;

  const {
    activeChat,
    initNewVoiceSession,
    openChatById,
    availableAgents,
    fetchAvailableAgents,
    fetchSessions,
    isSessionsLoading,
    studentProfile,
  } = useStudentStore();

  useEffect(() => {
    if (!studentProfile) return;

    const { hasFetchedSessions } = useStudentStore.getState();
    if (!hasFetchedSessions && !isSessionsLoading) {
      fetchSessions();
    }

    // Reopening an existing voice session by id: hydrate metadata + transcript
    // history (does NOT start the mic — the user resumes explicitly from the UI).
    if (sessionIdFromUrl) {
      if (!activeChat || activeChat.id !== sessionIdFromUrl) {
        openChatById(sessionIdFromUrl, agentFromUrl || undefined);
      }
    } else if (agentFromUrl && !sessionIdFromUrl) {
      if (availableAgents.length === 0) {
        fetchAvailableAgents();
      }
      const isCorrectAgent = activeChat?.agent_id === agentFromUrl;
      const isAlreadyActive =
        activeChat?.id === "new" ||
        (activeChat && activeChat.id !== "new" && isCorrectAgent);

      if (!isAlreadyActive) {
        initNewVoiceSession(agentFromUrl);
      }
    } else if (!sessionIdFromUrl && !activeChat && !agentFromUrl) {
      const timeout = setTimeout(() => router.replace("/student"), 500);
      return () => clearTimeout(timeout);
    }
  }, [
    agentFromUrl,
    sessionIdFromUrl,
    activeChat,
    initNewVoiceSession,
    openChatById,
    router,
    availableAgents.length,
    studentProfile,
    fetchAvailableAgents,
    fetchSessions,
    isSessionsLoading,
  ]);

  // Redirect to Chat Page if this session should be in chat mode
  useEffect(() => {
    if (activeChat && activeChat.id === sessionIdFromUrl && activeChat.source !== "voice" && activeChat.source !== "device") {
      router.replace(`/student/chat/${activeChat.id}`);
    }
  }, [activeChat, sessionIdFromUrl, router]);

  const isLoading = !activeChat && (agentFromUrl || sessionIdFromUrl);

  if (isLoading) {
    return (
      <AuthGuard requiredRole="student">
        <div className="h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[#5B4DC7]/10 border-t-[#5B4DC7] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[#5B4DC7]/40 uppercase tracking-widest">
              Preparing Voice…
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="student">
      <div className="h-screen overflow-hidden">
        <StudentVoiceView />
      </div>
    </AuthGuard>
  );
}
