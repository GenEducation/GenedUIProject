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
import type { ChatMessage, ChatElement } from "../types/api";
import type { SSEEvent } from "../services/sseParser";
import { parseContent } from "../utils/parseContent";
import { audioStore } from "../store/useAudioStore";
import { pdfStore } from "../store/usePdfStore";

interface UseChatOptions {
  subject: string;
  grade: number;
  sessionId?: string;
  agentId?: string;
}

export interface UseChatResult {
  messages: ChatMessage[];
  sessionId: string | null;
  chapterName: string | null;
  sending: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  /** Switch the active session and reload its history in place (no remount). */
  switchSession: (sessionId: string | null) => void;
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
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [chapterName, setChapterName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const greetedRef = useRef(false);
  const sendRef = useRef<(text: string, silent?: boolean) => Promise<void>>(() => Promise.resolve());

  // Shared history loader — reused by mount + switchSession.
  const loadHistory = useCallback(
    (sid: string, cancelledRef?: { current: boolean }) => {
      if (!sid || !userId) return;
      studentService
        .fetchChatHistory(userId, sid)
        .then((history) => {
          if (cancelledRef?.current) return;
          const mapped: ChatMessage[] = (history.messages ?? []).map((m) => {
            if (m.role === "user") {
              return {
                from: "me",
                text: m.content,
                timestamp: m.timestamp,
              };
            }
            const elements = parseContent(m.content);
            return {
              from: "ai",
              text: m.content.replace(/(?:<<|<)(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE|SPEAK_PARA|DIFFICULT_WORD|READ_ALOUD|LISTEN_COMPREHENSION|SHOW_FIGURE_DESCRIBE|KARAOKE)[\s\S]*?(?:>>|>)/g, "").replace(/<svg[\s\S]*?<\/svg>/g, "").trim(),
              elements: elements.length > 1 || (elements.length === 1 && elements[0].type !== "text") ? elements : undefined,
              timestamp: m.timestamp,
            };
          });
          setMessages(mapped);
          setSessionId(sid);
        })
        .catch(() => {
          // History fetch fail — start fresh, don't block user
        });
    },
    [userId]
  );

  // Load history when sessionId provided on mount
  useEffect(() => {
    if (!initialSessionId || !userId) return;
    const cancelledRef = { current: false };
    loadHistory(initialSessionId, cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [initialSessionId, userId, loadHistory]);

  /**
   * Switch to another session (or start a fresh chat with null). Aborts any
   * in-flight stream, clears the current thread, and reloads history in place.
   */
  const switchSession = useCallback(
    (sid: string | null) => {
      abortRef.current?.abort();
      setSending(false);
      setError(null);
      setChapterName(null);
      setMessages([]);
      setSessionId(sid);
      if (sid) {
        loadHistory(sid);
      } else {
        // New chat — re-trigger the auto greeting
        greetedRef.current = true;
        setTimeout(() => sendRef.current("hello", true), 400);
      }
    },
    [loadHistory]
  );

  const send = useCallback(
    async (text: string, silent = false) => {
      if (!text.trim() || !userId) return;

      // Keep the audio store's session/grade context current for skill directives
      audioStore.setContext(sessionId, grade);

      // ── 1. Append user message immediately (skip if silent greeting) ─────
      if (!silent) {
        const userMsg: ChatMessage = {
          from: "me",
          text: text.trim(),
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
      }
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
      const extraElements: ChatElement[] = [];
      let isPlanningUIPresented = false;
      let streamDone = false;
      let bufferedText = "";
      let currentSessionId = sessionId;

      const getMergedElements = (text: string) => {
        const parsed = parseContent(text);
        const merged = [...parsed];
        extraElements.forEach((extra) => {
          const isDuplicate = merged.some((el) => 
            el.id === extra.id || 
            (el.type === extra.type && el.meta?.directive_id === extra.meta?.directive_id)
          );
          if (!isDuplicate) {
            merged.push(extra);
          }
        });
        return merged.length > 0 ? merged : undefined;
      };

      /** Patch the AI bubble in state */
      const updateAiBubble = (patch: Partial<ChatMessage>) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, ...patch } : m
          )
        );
      };

      const stripDirectives = (t: string) =>
        t
          .replace(/(?:<<|<)(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE|SPEAK_PARA|DIFFICULT_WORD|READ_ALOUD|LISTEN_COMPREHENSION|SHOW_FIGURE_DESCRIBE|KARAOKE)[\s\S]*?(?:>>|>)/g, "")
          .replace(/<svg[\s\S]*?<\/svg>/g, "")
          .trim();

      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // How much of the raw stream the typewriter has revealed so far. The AI
      // bubble renders parsed *elements* (not the raw text), so to stream we
      // parse a progressively larger SLICE of bufferedText each tick.
      let rawRevealed = 0;

      /**
       * Typewriter reveal: renders bufferedText.slice(0, rawRevealed) each tick,
       * advancing until it catches up to whatever has streamed in. Element events
       * (visual/skill/interactive) are merged in via extraElements regardless of
       * the slice, so they appear promptly. Runs until streamDone, then finalises.
       */
      const startReveal = async () => {
        const TICK_MS = 16;
        while (true) {
          const remaining = bufferedText.length - rawRevealed;
          if (remaining > 0) {
            // Adaptive step so long messages don't crawl
            const step = Math.max(3, Math.ceil(remaining / 40));
            rawRevealed = Math.min(bufferedText.length, rawRevealed + step);
            updateAiBubble({
              elements: getMergedElements(bufferedText.slice(0, rawRevealed)),
              statusText: undefined,
              phase: undefined,
            });
            await delay(TICK_MS);
          } else {
            // Caught up — render current elements (covers event-only content) and poll
            updateAiBubble({
              elements: getMergedElements(bufferedText.slice(0, rawRevealed)),
              statusText: undefined,
              phase: undefined,
            });
            if (streamDone) break;
            await delay(40);
          }
        }
        // Final full render
        const finalText = stripDirectives(bufferedText);
        const finalElements = getMergedElements(bufferedText);
        if (!finalText && (!finalElements || finalElements.length === 0)) {
          setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
        } else {
          updateAiBubble({
            text: finalText,
            elements: finalElements,
            statusText: undefined,
            phase: undefined,
            isStreaming: false,
          });
        }
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
          audioStore.setContext(event.session_id, grade);
        } else if (event.type === "tts_start") {
          // Backend finished generating TTS — enable the Play button for this directive.
          if (event.directive_id) audioStore.markReady(event.directive_id);
        } else if (event.type === "skill_action") {
          const payload = event.payload || { directive_id: event.directive_id, source_text: event.source_text, mode: event.mode };
          const mode = (payload.mode || event.mode || "").toUpperCase();
          audioStore.setActiveSkill({ type: mode, ...payload });
          // The backend converts <<SPEAK_PARA/KARAOKE/READ_ALOUD>> into this event (not a
          // text chunk), so build the renderable element here from the payload.
          if (["SPEAK_PARA", "KARAOKE", "READ_ALOUD"].includes(mode) && payload.directive_id) {
            extraElements.push({
              id: `sv-${payload.directive_id}`,
              type: "english_skill_view",
              content: payload.source_text || "",
              meta: { directive_id: payload.directive_id, mode },
            });
          }
        } else if (event.type === "recording_open") {
          if (event.directive_id) audioStore.openRecording(event.directive_id, event.expected_duration_ms);
        } else if (event.type === "recording_closed") {
          audioStore.closeRecording();
        } else if (event.type === "pointer") {
          pdfStore.setPointer(event as any);
        } else if (event.type === "pointer_clear") {
          pdfStore.clearPointer();
        } else if (
          (event.type === "chunk" || event.type === "chunks") &&
          typeof event.text === "string"
        ) {
          // Just accumulate — the typewriter reveal loop renders progressively.
          bufferedText += event.text;
        } else if (event.type === "tool_status") {
          if (isPlanningUIPresented) {
            updateAiBubble({ statusText: event.message || "Drawing…" });
          }
        } else if (event.type === "visual_block") {
          const engine = event.engine || event.meta?.engine || "p5sketch";
          extraElements.push({
            id: `visual-${Date.now()}-${extraElements.length}`,
            type: "visual",
            content: engine,
            meta: {
              engine,
              label: event.label || "Visual",
              code: event.code,
              commands: event.commands,
              image: event.image,
              options: event.options,
              meta: event.meta
            }
          });
        } else if (event.type === "visual_error") {
          extraElements.push({
            id: `visual-error-${Date.now()}`,
            type: "visual",
            content: "error",
            meta: {
              engine: event.engine || "unknown",
              label: event.label || "Visual",
              message: event.message,
              fallback_text: event.fallback_text || "[Visual Error]"
            }
          });
        } else if (event.type === "math_widget") {
          extraElements.push({
            id: `widget-${Date.now()}-${extraElements.length}`,
            type: "widget",
            content: event.expression || "",
            meta: { error: false, message: event.message },
          });
        } else if (event.type === "math_widget_error") {
          extraElements.push({
            id: `widget-${Date.now()}-${extraElements.length}`,
            type: "widget",
            content: event.fallback_text || "[Math Widget Error]",
            meta: { error: true, message: event.message },
          });
        } else if (event.type === "interactive_block") {
          extraElements.push({
            id: `interactive-${Date.now()}-${extraElements.length}`,
            type: "interactive",
            content: event.interactive_type || "interactive",
            meta: {
              directive_id: event.directive_id,
              interactive_type: event.interactive_type,
              label: event.label,
              question: event.prompt,
              render: event.render,
              interaction: event.interaction,
              validation: event.validation,
              anchor: event.anchor,
              interaction_type: event.meta?.interaction_type,
              ...(event.meta || {}),
            },
          });
        } else if (event.type === "interactive_block_error") {
          extraElements.push({
            id: `interactive-error-${Date.now()}`,
            type: "interactive",
            content: "error",
            meta: {
              interactive_type: event.interactive_type || "unknown",
              directive_id: event.directive_id,
              label: event.label || "Activity",
              message: event.message,
              fallback_text: event.fallback_text || "[Interactive Block Error]",
              is_fallback: true,
            },
          });
        } else if (event.type === "error") {
          const errMsg = event.message || "Something went wrong.";
          bufferedText = bufferedText || errMsg;
          // Reveal loop will pick up the accumulated text.
        } else if (event.type === "done") {
          if (event.session_id && !currentSessionId) {
            currentSessionId = event.session_id;
            setSessionId(event.session_id);
          }
          if (event.chapter_name) {
            setChapterName(event.chapter_name);
          }
          if (Array.isArray(event.options) && event.options.length > 0) {
            // Patch options onto the AI bubble so MessageBubble renders chapter chips
            updateAiBubble({ options: event.options });
          }
          // Finalisation handled by startReveal once streamDone flips true.
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

        // Flip flag and flush buffered content events (builds bufferedText + elements)
        isPlanningUIPresented = true;
        while (bufferedEvents.length > 0) {
          handleEvent(bufferedEvents.shift()!);
        }
        // Typewriter-reveal the response progressively instead of dumping it as
        // one block. Runs until streamDone, then finalises the bubble.
        await startReveal();
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
    [userId, sessionId, subject, grade, agentId]
  );

  // Keep sendRef current so the greeting effect below can call it
  sendRef.current = send;

  // Auto-send greeting on new chat (no existing session)
  useEffect(() => {
    if (initialSessionId || !userId || greetedRef.current) return;
    greetedRef.current = true;
    const t = setTimeout(() => sendRef.current("hello", true), 400);
    return () => clearTimeout(t);
  }, [userId]);

  // Abort on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    messages,
    sessionId,
    chapterName,
    sending,
    error,
    send,
    switchSession,
    clearError: () => setError(null),
  };
}
