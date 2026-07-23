"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useStudentStore } from "../store/useStudentStore";
import { StudentChatSidebar } from "./StudentChatSidebar";
import { StudentChatMain } from "./StudentChatMain";
import { StudentChatHub } from "./StudentChatHub";
import { AgentPickerModal } from "./AgentPickerModal";
import { ResizableSplitPane } from "./ResizableSplitPane";
import dynamic from "next/dynamic";

// Lazy-loaded: pulls in pdfjs-dist, which is heavy. Keep it out of the
// initial chat-view bundle and only fetch it when a chapter PDF is opened.
const ChapterPdfViewer = dynamic(
  () => import("./ChapterPdfViewer").then((m) => m.ChapterPdfViewer),
  { ssr: false }
);

/**
 * StudentChatView acts as a container for the modular chat layout.
 * It now uses URL parameters to stay persistent across refreshes.
 */
export function StudentChatView() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionIdRaw = params?.sessionId;
  const sessionId = Array.isArray(sessionIdRaw)
    ? sessionIdRaw[0]
    : (sessionIdRaw as string | undefined);
  const agentId = searchParams.get("agentId");

  const {
    activeChat,
    messages,
    isAITyping,
    openChatById,
    studentProfile,
    isSessionsLoading,
    closeChat,
    isAgentPickerOpen,
    sendMessage,
    isPdfViewerOpen,
    chapterPdfUrl,
    closePdfViewer,
  } = useStudentStore();

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    [],
  );

  // Handle responsive auto-hide
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize(); // Init
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Guard & Hydration: if user lands on /student/chat/[id] but state is empty (refresh).
  useEffect(() => {
    if (!studentProfile) return; // wait for auth hydration

    if (sessionId) {
      if (!activeChat || activeChat.id !== sessionId) {
        // Either fresh landing or switched tabs - try to hydrate from ID
        openChatById(sessionId, agentId || undefined);
      }
    }
  }, [sessionId, openChatById, router, studentProfile, agentId]);

  // URL sync logic...
  useEffect(() => {
    const isNewPath =
      !sessionId || sessionId === "new" || sessionId === "new-focused";
    const hasRealId =
      activeChat && activeChat.id !== "new" && activeChat.id !== "new-focused";

    if (isNewPath && hasRealId) {
      router.replace(`/student/chat/${activeChat.id}`);
    }
  }, [activeChat?.id, sessionId, router]);

  // 3. Auto-start logic for new chats
  useEffect(() => {
    // Only trigger if we have an active "new" chat with no messages and AI isn't already typing
    if (
      activeChat &&
      (activeChat.id === "new" || activeChat.id === "new-focused") &&
      messages.length === 0 &&
      !isAITyping
    ) {
      // Small delay to ensure UI transition is smooth
      const timer = setTimeout(() => {
        sendMessage("Hello");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeChat?.id, messages.length, isAITyping, sendMessage]);

  // 4. Determine if we are in the "Hub" state (Discovery) or "Chat" state (Active)
  const isHubState =
    !sessionId && !activeChat && messages.length === 0 && !isAITyping;

  // 4. Safety Guard: If we have a sessionId but no activeChat yet (history loading), show loading
  if (sessionId && !activeChat) {
    return (
      <div className="h-screen flex items-center justify-center font-sans" style={{ background: "#F7F8FC" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: "#E2E8F0", borderTopColor: "var(--tutor)" }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading Chat...</p>
        </div>
      </div>
    );
  }

  if (isSessionsLoading && !studentProfile) {
    return (
      <div className="h-screen flex items-center justify-center font-sans" style={{ background: "#F7F8FC" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: "#E2E8F0", borderTopColor: "var(--tutor)" }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.15em", textTransform: "uppercase" }}>Initializing Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex font-sans overflow-hidden" style={{ background: "#F7F8FC" }}>
      {/* -- LEFT SIDEBAR (Always present for consistency) ---------------- */}
      <StudentChatSidebar
        activeChatId={activeChat?.id || "none"}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Area: Hub vs Chat (with optional PDF split pane) */}
      <div className="flex-1 flex overflow-hidden relative">
        {isHubState ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <StudentChatHub toggleSidebar={toggleSidebar} />
          </div>
        ) : isPdfViewerOpen && chapterPdfUrl && activeChat ? (
          isMobile ? (
            <>
              <div className="flex-1 flex flex-col overflow-hidden">
                <StudentChatMain
                  activeChat={activeChat}
                  messages={messages}
                  isAITyping={isAITyping}
                  isSidebarOpen={isSidebarOpen}
                  toggleSidebar={toggleSidebar}
                />
              </div>
              {/* Full-screen textbook overlay on mobile */}
              <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "#F7F8FC" }}>
                <ChapterPdfViewer
                  pdfUrl={chapterPdfUrl}
                  chapterName={activeChat.chapter_name || activeChat.title}
                  onClose={closePdfViewer}
                />
              </div>
            </>
          ) : (
            <ResizableSplitPane
              left={
                <StudentChatMain
                  activeChat={activeChat}
                  messages={messages}
                  isAITyping={isAITyping}
                  isSidebarOpen={isSidebarOpen}
                  toggleSidebar={toggleSidebar}
                />
              }
              right={
                <ChapterPdfViewer
                  pdfUrl={chapterPdfUrl}
                  chapterName={activeChat.chapter_name || activeChat.title}
                  onClose={closePdfViewer}
                />
              }
              defaultLeftPercent={55}
              minLeftPx={300}
              minRightPx={240}
              storageKey="pdf_split_chat"
            />
          )
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <StudentChatMain
              activeChat={activeChat!}
              messages={messages}
              isAITyping={isAITyping}
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
            />
          </div>
        )}
      </div>

      {isAgentPickerOpen && <AgentPickerModal />}
    </div>
  );
}
