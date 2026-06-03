/**
 * Voice chat hook — manages real-time voice session state.
 *
 * Wraps voiceService and maps WebSocket events to React state
 * for the voice-chat screen to consume.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { voiceService, type VoiceEvent } from "../services/voiceService";
import { useAuth } from "../store/useAuthStore";
import type { ChatMessage } from "../types/api";

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

  // Track assistant text accumulation for incremental reveal
  const assistantTextRef = useRef("");
  const currentAiMsgIdRef = useRef<string | null>(null);

  const handleEvent = useCallback((event: VoiceEvent) => {
    switch (event.type) {
      case "connected":
        setVoiceStatus("active");
        break;

      case "disconnected":
        setVoiceStatus("idle");
        break;

      case "session_id":
        if (event.session_id) setSessionId(event.session_id);
        break;

      case "transcript":
        // User transcripts are handled via onTextReveal; this catches any extras
        break;

      case "planning":
        setIsAISpeaking(true);
        break;

      case "turn_complete":
        setIsAISpeaking(false);
        // Finalize current assistant message
        if (currentAiMsgIdRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentAiMsgIdRef.current
                ? { ...m, isStreaming: false, statusText: undefined }
                : m
            )
          );
          currentAiMsgIdRef.current = null;
          assistantTextRef.current = "";
        }
        break;

      case "error": {
        setVoiceStatus("error");
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
    } else {
      // Append to current assistant message or create new one
      assistantTextRef.current += text;
      setIsAISpeaking(true);

      if (!currentAiMsgIdRef.current) {
        const id = `ai-${Date.now()}`;
        currentAiMsgIdRef.current = id;
        setMessages((prev) => [
          ...prev,
          { from: "ai", text: assistantTextRef.current, id, isStreaming: true },
        ]);
      } else {
        const msgId = currentAiMsgIdRef.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, text: assistantTextRef.current } : m
          )
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
    setIsMuted(true);
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
    startSession,
    stopSession,
    toggleMute,
    beginPtt,
    endPtt,
  };
}
