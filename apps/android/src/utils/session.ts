/**
 * Session modality helpers — mirror the web app's isVoiceSession/sessionRoutePath
 * (src/features/student/store/useStudentStore.ts on the `dev` branch).
 *
 * The backend persists a session's origin in `chat_sessions.source`:
 * "voice"/"device" sessions reopen in the voice UI; everything else in chat.
 * `chat_mode` is the client-side mirror of that field.
 */
import type { ChatSession } from "../types/api";

/** Voice-origin sessions reopen in the voice UI; everything else is chat. */
export function isVoiceSession(s?: Partial<ChatSession> | null): boolean {
  if (!s) return false;
  return s.source === "voice" || s.source === "device" || s.chat_mode === "voice";
}

export interface SessionRoute {
  pathname: "/voice-chat" | "/chat";
  params: {
    sessionId?: string;
    subject: string;
    grade: string;
    agentId?: string;
  };
}

/**
 * Build the navigation target for reopening an existing session, routed by its
 * persisted modality. Falls back to the provided subject/grade when the session
 * object is missing them.
 */
export function buildSessionRoute(
  s: Partial<ChatSession>,
  fallbackSubject = "mathematics",
  fallbackGrade: number | string = 9
): SessionRoute {
  return {
    pathname: isVoiceSession(s) ? "/voice-chat" : "/chat",
    params: {
      sessionId: s.session_id,
      subject: s.subject || fallbackSubject,
      grade: String(s.grade ?? fallbackGrade),
      ...(s.agent_id ? { agentId: s.agent_id } : {}),
    },
  };
}
