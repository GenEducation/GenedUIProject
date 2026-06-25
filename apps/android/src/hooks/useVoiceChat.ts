/**
 * Voice chat hook — manages real-time voice session state.
 *
 * Wraps voiceService and maps WebSocket events to React state
 * for the voice-chat screen to consume.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { voiceService, type VoiceEvent } from "../services/voiceService";
import { useAuth } from "../store/useAuthStore";
import { audioStore } from "../store/useAudioStore";
import { pdfStore } from "../store/usePdfStore";
import { prefsStore } from "../store/usePrefsStore";
import type { ChatMessage, ChatElement } from "../types/api";

export type VoiceStatus = "idle" | "connecting" | "active" | "error";
export type ConnectionQuality = "good" | "poor" | "reconnecting";

export interface UseVoiceChatOptions {
  subject: string;
  grade: number;
  sessionId?: string;
  agentId?: string;
  voice?: string;
  documentTitle?: string;
}

export interface UseVoiceChatResult {
  messages: ChatMessage[];
  sessionId: string | null;
  voiceStatus: VoiceStatus;
  connectionQuality: ConnectionQuality;
  isMuted: boolean;
  pttHeld: boolean;
  isAISpeaking: boolean;
  /** AI is processing the turn but hasn't produced any transcript text yet. */
  isThinking: boolean;
  startSession: () => Promise<void>;
  stopSession: () => void;
  toggleMute: () => void;
  beginPtt: () => void;
  endPtt: () => void;
}

export function useVoiceChat(options: UseVoiceChatOptions): UseVoiceChatResult {
  const { state } = useAuth();
  const userId = state.status === "authenticated" ? state.profile.user_id : "";
  const preferredVoice = state.status === "authenticated" ? state.profile.preferred_voice : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(options.sessionId ?? null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("good");
  const [isMuted, setIsMuted] = useState(true);
  const [pttHeld, setPttHeld] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Track assistant text accumulation for incremental reveal
  const assistantTextRef = useRef("");
  const currentAiMsgIdRef = useRef<string | null>(null);

  const appendVoiceElement = useCallback((element: ChatElement) => {
    setIsThinking(false);
    setIsAISpeaking(true);

    if (!currentAiMsgIdRef.current) {
      const id = `ai-${Date.now()}`;
      currentAiMsgIdRef.current = id;
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "",
          id,
          elements: [element],
          isStreaming: true,
        },
      ]);
    } else {
      const msgId = currentAiMsgIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, elements: m.elements ? [...m.elements, element] : [element] }
            : m
        )
      );
    }
  }, []);

  const handleEvent = useCallback((event: VoiceEvent) => {
    switch (event.type) {
      case "connected":
        setVoiceStatus("active");
        break;

      case "disconnected":
        setVoiceStatus("idle");
        setIsThinking(false);
        break;

      case "session_id":
        if (event.session_id) {
          setSessionId(event.session_id);
          audioStore.setContext(event.session_id, options.grade);
        }
        break;

      case "tts_start":
        if (event.directive_id) audioStore.markReady(event.directive_id);
        break;

      case "skill_action":
        audioStore.setActiveSkill(event.payload || { type: event.mode, directive_id: event.directive_id });
        break;

      case "recording_open":
        if (event.directive_id) audioStore.openRecording(event.directive_id, event.expected_duration_ms);
        break;

      case "recording_closed":
        audioStore.closeRecording();
        break;

      case "pointer":
        pdfStore.setPointer(event as any);
        break;

      case "pointer_clear":
        pdfStore.clearPointer();
        break;

      case "transcript":
        // User transcripts are handled via onTextReveal; this catches any extras
        break;

      case "planning":
        // Backend is working but no transcript yet — show the single thinking indicator.
        setIsAISpeaking(true);
        setIsThinking(true);
        break;

      case "turn_complete":
        setIsAISpeaking(false);
        setIsThinking(false);
        // Finalize the current assistant message. If it never received text, drop it
        // entirely so no empty "Processing…" bubble is left behind.
        if (currentAiMsgIdRef.current) {
          const msgId = currentAiMsgIdRef.current;
          const hasText = assistantTextRef.current.trim().length > 0;
          setMessages((prev) =>
            hasText
              ? prev.map((m) =>
                  m.id === msgId ? { ...m, isStreaming: false, statusText: undefined } : m
                )
              : prev.filter((m) => m.id !== msgId)
          );
          currentAiMsgIdRef.current = null;
          assistantTextRef.current = "";
        }
        break;

      case "error": {
        setVoiceStatus("error");
        setIsThinking(false);
        setIsAISpeaking(false);
        const errMsg =
          typeof event.message === "string" ? event.message
          : typeof event.error === "string" ? event.error
          : "Voice connection error. Please try again.";
        // Replace any existing error bubble rather than appending a new one
        setMessages((prev) => {
          const withoutPrevErr = prev.filter((m) => !m.id?.startsWith("err-"));
          return [...withoutPrevErr, { from: "ai", text: errMsg, id: `err-${Date.now()}` }];
        });
        break;
      }

      case "visual_block": {
        const engine = event.engine || event.meta?.engine || "p5sketch";
        appendVoiceElement({
          id: `visual-${Date.now()}`,
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
        break;
      }

      case "visual_error": {
        appendVoiceElement({
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
        break;
      }

      case "math_widget": {
        appendVoiceElement({
          id: `widget-${Date.now()}`,
          type: "widget",
          content: event.expression || "",
          meta: { error: false, message: event.message }
        });
        break;
      }

      case "math_widget_error": {
        appendVoiceElement({
          id: `widget-${Date.now()}`,
          type: "widget",
          content: event.fallback_text || "[Math Widget Error]",
          meta: { error: true, message: event.message }
        });
        break;
      }

      case "interactive_block": {
        appendVoiceElement({
          id: `interactive-${Date.now()}`,
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
          }
        });
        break;
      }

      case "interactive_block_error": {
        appendVoiceElement({
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
          }
        });
        break;
      }
    }
  }, []);

  const handleTextReveal = useCallback((text: string, role: "user" | "assistant") => {
    if (role === "user") {
      setMessages((prev) => [
        ...prev,
        {
          from: "me",
          text,
          id: `user-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      // User finished speaking → AI will respond next; show the thinking indicator
      // until the first assistant text arrives.
      setIsThinking(true);
    } else {
      // Accumulate, but only ever materialise a bubble once there's real text — this
      // prevents an empty "Processing…" bubble from being created and left stuck.
      assistantTextRef.current += text;
      const accumulated = assistantTextRef.current;
      if (!accumulated.trim()) return;

      setIsAISpeaking(true);
      setIsThinking(false); // real text is now streaming; hide the standalone indicator

      if (!currentAiMsgIdRef.current) {
        const id = `ai-${Date.now()}`;
        currentAiMsgIdRef.current = id;
        setMessages((prev) => [
          ...prev,
          { from: "ai", text: accumulated, id, isStreaming: true },
        ]);
      } else {
        const msgId = currentAiMsgIdRef.current;
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: accumulated } : m))
        );
      }
    }
  }, []);

  const handleConnectionQuality = useCallback((q: ConnectionQuality) => {
    setConnectionQuality(q);
  }, []);

  const startSession = useCallback(async () => {
    if (!userId) return;
    setVoiceStatus("connecting");
    // Continuous mode = always listening (unmuted); PTT = start muted, hold to talk.
    const initialMuted = prefsStore.get().listenMode === "ptt";
    setIsMuted(initialMuted);
    setPttHeld(false);

    try {
      await voiceService.startSession(
        userId,
        handleEvent,
        handleTextReveal,
        sessionId ?? undefined,
        options.subject,
        options.voice ?? preferredVoice,
        options.documentTitle,
        options.agentId,
        options.grade,
        handleConnectionQuality,
      );
      // voiceService.startSession() initializes the mic muted. Without syncing it here,
      // continuous mode stays silently muted at the service level (UI shows "listening"
      // but no audio is sent) until the user manually toggles mute. The half-duplex echo
      // guard still prevents the AI from hearing itself while it speaks.
      await voiceService.setMuted(initialMuted);
    } catch (err) {
      setVoiceStatus("error");
      setMessages((prev) => {
        const withoutPrevErr = prev.filter((m) => !m.id?.startsWith("err-"));
        return [...withoutPrevErr, { from: "ai", text: "Could not start voice session. Please try again.", id: `err-${Date.now()}` }];
      });
    }
  }, [userId, sessionId, options, preferredVoice, handleEvent, handleTextReveal, handleConnectionQuality]);

  const stopSession = useCallback(() => {
    voiceService.stopSession();
    setVoiceStatus("idle");
    setIsAISpeaking(false);
    setIsThinking(false);
    setPttHeld(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      void voiceService.setMuted(next);
      if (next) setPttHeld(false);
      return next;
    });
  }, []);

  const beginPtt = useCallback(() => {
    setPttHeld(true);
    voiceService.setMuted(false);
  }, []);

  const endPtt = useCallback(() => {
    setPttHeld(false);
    voiceService.setMuted(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceService.stopSession();
    };
  }, []);

  return {
    messages,
    sessionId,
    voiceStatus,
    connectionQuality,
    isMuted,
    pttHeld,
    isAISpeaking,
    isThinking,
    startSession,
    stopSession,
    toggleMute,
    beginPtt,
    endPtt,
  };
}
