/**
 * Chat hook — orchestrated SSE streaming with planning phase support.
 *
 * Mirrors the web's useStudentStore sendMessage logic
 * (src/features/student/store/useStudentStore.ts lines 1918–2432).
 *
 * Three phases:
 *   A) Planning  — `planning` events shown as pulsing statusText (1200ms each)
 *   B) Streaming — `chunk`/`chunks` events append text to the AI bubble
 *   C) Done      — `done` event finalises, clears statusText
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { studentService } from "../services/studentService";
import { parseSSEEvents } from "../services/sseParser";
import { useAuth } from "../store/useAuthStore";
import type { ChatMessage } from "../types/api";
import type { SSEEvent } from "../services/sseParser";

interface UseChatOptions {
  subject: string;
  grade: number;
  sessionId?: string;
  agentId?: string;
}

export interface UseChatResult {
  messages: ChatMessage[];
  sessionId: string | null;
  sending: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clearError: () => void;
}

export function useChat({
  subject,
  grade,
  sessionId: initialSessionId,
  agentId,
}: UseChatOptions): UseChatResult {
  const { state } = useAuth();
  const userId =
    state.status === "authenticated" ? state.profile.user_id : "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId ?? null
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history when sessionId provided on mount
  useEffect(() => {
    if (!initialSessionId || !userId) return;
    let cancelled = false;

    studentService
      .fetchChatHistory(userId, initialSessionId)
      .then((history) => {
        if (cancelled) return;
        const mapped: ChatMessage[] = (history.messages ?? []).map((m) => ({
          from: m.role === "user" ? "me" : "ai",
          text: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(mapped);
        setSessionId(initialSessionId);
      })
      .catch(() => {
        // History fetch fail — start fresh, don't block user
      });

    return () => {
      cancelled = true;
    };
  }, [initialSessionId, userId]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || !userId) return;

      // ── 1. Append user message immediately ──────────────────────────────
      const userMsg: ChatMessage = {
        from: "me",
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setSending(true);
      setError(null);

      // ── 2. Add streaming AI placeholder ─────────────────────────────────
      const aiMsgId = `ai-${Date.now()}`;
      const aiPlaceholder: ChatMessage = {
        id: aiMsgId,
        from: "ai",
        text: "",
        statusText: "Processing…",
        phase: "thinking",
        isStreaming: true,
      };
      setMessages((prev) => [...prev, aiPlaceholder]);

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      // ── 3. Mutable streaming state (mirrors web store) ───────────────────
      const planningQueue: Array<{ text: string; phase?: string }> = [];
      const bufferedEvents: SSEEvent[] = [];
      let isPlanningUIPresented = false;
      let streamDone = false;
      let bufferedText = "";
      let currentSessionId = sessionId;

      /** Patch the AI bubble in state */
      const updateAiBubble = (patch: Partial<ChatMessage>) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, ...patch } : m
          )
        );
      };

      /** Handle a single parsed SSE event */
      const handleEvent = (event: SSEEvent) => {
        if (event.type === "planning") {
          const status = event.text || event.message || "";
          const phase = event.phase || "thinking";
          if (status && !planningQueue.some((q) => q.text === status)) {
            planningQueue.push({ text: status, phase });
          }
        } else if (event.type === "session_id" && event.session_id) {
          currentSessionId = event.session_id;
          setSessionId(event.session_id);
        } else if (
          (event.type === "chunk" || event.type === "chunks") &&
          typeof event.text === "string"
        ) {
          bufferedText += event.text;
          if (isPlanningUIPresented) {
            updateAiBubble({ text: bufferedText, statusText: undefined });
          }
        } else if (event.type === "tool_status") {
          if (isPlanningUIPresented) {
            updateAiBubble({ statusText: event.message || "Drawing…" });
          }
        } else if (event.type === "error") {
          const errMsg = event.message || "Something went wrong.";
          bufferedText = bufferedText || errMsg;
          if (isPlanningUIPresented) {
            updateAiBubble({ text: bufferedText, statusText: undefined, isStreaming: false });
          }
        } else if (event.type === "done") {
          if (event.session_id && !currentSessionId) {
            currentSessionId = event.session_id;
            setSessionId(event.session_id);
          }
          // Finalise — clear statusText, mark not streaming
          updateAiBubble({
            text: bufferedText,
            statusText: undefined,
            phase: undefined,
            isStreaming: false,
          });
        }
      };

      // ── 4. Orchestrator — mirrors web's orchestrateUI() ──────────────────
      const orchestrateUI = async () => {
        let shownStatuses = 0;

        while (!streamDone || planningQueue.length > shownStatuses) {
          if (planningQueue.length > shownStatuses) {
            const item = planningQueue[shownStatuses];
            shownStatuses++;
            updateAiBubble({ statusText: item.text, phase: item.phase });
            await new Promise((r) => setTimeout(r, 1200));
          } else if (streamDone) {
            break;
          } else {
            // Chunks arriving but no more planning statuses — proceed
            if (bufferedEvents.length > 0 || shownStatuses > 0) break;
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        // Flip flag and flush buffered content events
        isPlanningUIPresented = true;
        while (bufferedEvents.length > 0) {
          handleEvent(bufferedEvents.shift()!);
        }
        // Show accumulated text (clear planning status)
        updateAiBubble({
          text: bufferedText,
          statusText: undefined,
          phase: undefined,
        });
      };

      // ── 5. Stream reader + orchestrator running in parallel ──────────────
      try {
        const response = await studentService.sendChatMessage(
          {
            text: text.trim(),
            user_id: userId,
            session_id: currentSessionId ?? undefined,
            subject,
            grade,
            ...(agentId ? { agent_id: agentId } : {}),
          },
          signal
        );

        const uiPromise = orchestrateUI();

        await parseSSEEvents(
          response,
          (event) => {
            // session_id is always handled immediately
            if (event.type === "session_id" && event.session_id) {
              handleEvent(event);
              return;
            }

            if (!isPlanningUIPresented) {
              // Buffer content events during planning phase
              if (event.type === "planning") {
                handleEvent(event); // planning always goes to queue immediately
              } else {
                bufferedEvents.push(event);
              }
            } else {
              handleEvent(event);
            }
          },
          signal
        );

        streamDone = true;
        await uiPromise;

        // Final safety: ensure isStreaming cleared
        updateAiBubble({ isStreaming: false, statusText: undefined });
      } catch (err: any) {
        if (err?.name === "AbortError") return;

        // Remove empty AI placeholder on hard error
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.id === aiMsgId && !last.text) updated.pop();
          return updated;
        });
        setError("Couldn't send message. Please try again.");
      } finally {
        setSending(false);
      }
    },
    [userId, sessionId, subject, grade]
  );

  // Abort on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    messages,
    sessionId,
    sending,
    error,
    send,
    clearError: () => setError(null),
  };
}
