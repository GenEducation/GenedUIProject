"use client";

import { useStudentStore } from "../store/useStudentStore";

/**
 * Full-screen overlay shown while a brand-new chat session is being created.
 * We stay on the current page until the backend streams back the real
 * session_id (see startNewChatSession in useStudentStore), so this covers the
 * short wait before navigating to /student/chat/{sessionId}.
 */
export function SessionStartingOverlay() {
  const isStartingSession = useStudentStore((s) => s.isStartingSession);

  if (!isStartingSession) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: "#E2E8F0", borderTopColor: "#5B4DC7" }}
        />
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#94A3B8",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Starting Session...
        </p>
      </div>
    </div>
  );
}
