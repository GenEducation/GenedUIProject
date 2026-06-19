/**
 * Onboarding hook — simple request/response conversation (NOT SSE).
 *
 * Mirrors the web onboardingService flow: start → chat → chat … until the
 * backend returns is_complete=true. Much simpler than useChat (no streaming,
 * planning phases, or element parsing — onboarding is plain text Q&A).
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { studentService } from "../services/studentService";
import { useAuth } from "../store/useAuthStore";
import type { ChatMessage } from "../types/api";

interface UseOnboardingOptions {
  subject: string;
  grade: number;
}

export interface UseOnboardingResult {
  messages: ChatMessage[];
  isAITyping: boolean;
  isComplete: boolean;
  sending: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
}

/** Strip the desktop-only voice-only marker from AI replies. */
const clean = (t: string) => (t ?? "").replace(/<<VOICE_ONLY>>/g, "").trim();

export function useOnboarding({ subject, grade }: UseOnboardingOptions): UseOnboardingResult {
  const { state } = useAuth();
  const userId = state.status === "authenticated" ? state.profile.user_id : "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Kick off the conversation once on mount
  useEffect(() => {
    if (startedRef.current || !userId) return;
    startedRef.current = true;
    let cancelled = false;

    setIsAITyping(true);
    studentService
      .startOnboarding(userId, subject, grade)
      .then((res) => {
        if (cancelled) return;
        const text = clean(res.response);
        if (text) {
          setMessages([{ from: "ai", text, timestamp: new Date().toISOString() }]);
        }
        if (res.is_complete) setIsComplete(true);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't start onboarding. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsAITyping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, subject, grade]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !userId || sending || isComplete) return;

      setMessages((prev) => [
        ...prev,
        { from: "me", text: trimmed, timestamp: new Date().toISOString() },
      ]);
      setSending(true);
      setIsAITyping(true);
      setError(null);

      try {
        const res = await studentService.sendOnboardingMessage(userId, subject, trimmed);
        const reply = clean(res.response);
        if (reply) {
          setMessages((prev) => [
            ...prev,
            { from: "ai", text: reply, timestamp: new Date().toISOString() },
          ]);
        }
        if (res.is_complete) setIsComplete(true);
      } catch {
        setError("Couldn't send. Please try again.");
      } finally {
        setSending(false);
        setIsAITyping(false);
      }
    },
    [userId, subject, sending, isComplete]
  );

  return { messages, isAITyping, isComplete, sending, error, send };
}
