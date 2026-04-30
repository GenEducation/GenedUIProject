import { create } from "zustand";
import { onboardingService } from "../services/onboardingService";
import { getAuthToken } from "@/utils/authFetch";
import { voiceService } from "@/features/student/services/voiceService";

export interface OnboardingMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface OnboardingState {
  type: "general" | "subject" | null;
  subject: string | null;
  grade: number | null;
  dnaStatus: "PENDING" | "GENERAL_COMPLETED" | null;
  
  messages: OnboardingMessage[];
  isAITyping: boolean;
  isComplete: boolean;
  isVoiceOnly: boolean;
  streamingMessageId: string | null;
  voiceSessionStatus: "idle" | "connecting" | "active" | "error";

  checkDNAStatus: (studentId: string) => Promise<void>;
  startOnboarding: (
    studentId: string, 
    type: "general" | "subject", 
    subject?: string, 
    grade?: number
  ) => Promise<void>;
  sendMessage: (studentId: string, text: string) => Promise<void>;
  
  startVoiceSession: (studentId: string) => Promise<void>;
  stopVoiceSession: () => Promise<void>;
  clearSession: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  type: null,
  subject: null,
  grade: null,
  dnaStatus: null,
  
  messages: [],
  isAITyping: false,
  isComplete: false,
  isVoiceOnly: false,
  streamingMessageId: null,
  voiceSessionStatus: "idle",

  checkDNAStatus: async (studentId: string) => {
    try {
      const data = await onboardingService.checkDNAStatus(studentId);
      set({ dnaStatus: data.status });
    } catch (error) {
      console.error("Failed to check DNA status:", error);
    }
  },

  startOnboarding: async (studentId, type, subject, grade) => {
    set({ type, subject: subject || null, grade: grade || null, messages: [], isComplete: false, isVoiceOnly: false });
    try {
      let data;
      if (type === "general") {
        data = await onboardingService.startGeneralOnboarding(studentId);
      } else {
        if (!subject || !grade) throw new Error("Subject and grade required for subject onboarding");
        data = await onboardingService.startSubjectOnboarding(studentId, subject, grade);
      }

      let responseText = data.response || "";
      let voiceOnly = false;
      if (responseText.includes("<<VOICE_ONLY>>")) {
        voiceOnly = true;
        responseText = responseText.replace("<<VOICE_ONLY>>", "").trim();
      }

      set({
        messages: [{
          id: Date.now().toString(),
          sender: "ai",
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }],
        isComplete: data.is_complete || false,
        isVoiceOnly: voiceOnly
      });
    } catch (error) {
      console.error("Failed to start onboarding:", error);
    }
  },

  sendMessage: async (studentId: string, text: string) => {
    const { type, subject, messages } = get();
    if (!type) return;

    // Remove voice lock if user manually typed (or sent a voice message which acts the same here)
    set({ isVoiceOnly: false });

    const userMsgId = Date.now().toString();
    const userMsg: OnboardingMessage = {
      id: userMsgId,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const streamingMsgId = `stream-${Date.now()}`;
    const initialAIMsg: OnboardingMessage = {
      id: streamingMsgId,
      sender: "ai",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    set({ 
      messages: [...messages, userMsg, initialAIMsg],
      isAITyping: true,
      streamingMessageId: streamingMsgId
    });

    try {
      let data;
      if (type === "general") {
        data = await onboardingService.sendGeneralChatMessage({ student_id: studentId, message: text });
      } else {
        data = await onboardingService.sendSubjectChatMessage({ student_id: studentId, subject: subject!, message: text });
      }

      let responseText = data.response || "";
      let isCompleteFlag = data.is_complete || false;
      let voiceOnly = false;
      
      if (responseText.includes("<<VOICE_ONLY>>")) {
        voiceOnly = true;
        responseText = responseText.replace(/<<VOICE_ONLY>>/g, "").trim();
      }

      set((state) => ({
        messages: state.messages.map(m => 
          m.id === streamingMsgId ? { ...m, text: responseText } : m
        ),
        isAITyping: false,
        streamingMessageId: null,
        isComplete: isCompleteFlag,
        isVoiceOnly: voiceOnly
      }));
    } catch (error) {
      console.error("Failed to send message:", error);
      set((state) => ({
        messages: state.messages.map(m => 
          m.id === streamingMsgId ? { ...m, text: "Sorry, I encountered an error. Please try again." } : m
        ),
        isAITyping: false,
        streamingMessageId: null
      }));
    }
  },

  startVoiceSession: async (studentId: string) => {
    const { type, subject } = get();
    set({ voiceSessionStatus: "connecting" });
    try {
      const wsEndpoint = type === "general" ? "/ws/onboarding/general" : "/ws/onboarding/subject";
      
      await voiceService.startSession(
        studentId,
        (event) => {
          if (event.type === "connected") set({ voiceSessionStatus: "active" });
          else if (event.type === "disconnected" || event.type === "error") set({ voiceSessionStatus: "error" });
        },
        (content, role) => {
          set((state) => {
            const lastMsg = state.messages[state.messages.length - 1];
            const sender = role === "user" ? "user" : "ai";
            const isContinuing = lastMsg && lastMsg.sender === sender && state.streamingMessageId === lastMsg.id;
            
            let updatedMessages = [...state.messages];
            let newId = state.streamingMessageId;

            let textToDisplay = isContinuing ? lastMsg.text + (role === "user" ? " " : "") + content : content;
            let voiceOnly = state.isVoiceOnly;

            if (role === "assistant" && textToDisplay.includes("<<VOICE_ONLY>>")) {
              voiceOnly = true;
              textToDisplay = textToDisplay.replace(/<<VOICE_ONLY>>/g, "").trim();
            }

            if (isContinuing) {
              updatedMessages[updatedMessages.length - 1] = { ...lastMsg, text: textToDisplay };
            } else {
              newId = `voice-${Date.now()}`;
              updatedMessages.push({
                id: newId,
                text: textToDisplay,
                sender,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              });
            }

            return {
              messages: updatedMessages,
              streamingMessageId: newId,
              isAITyping: role === "assistant",
              isVoiceOnly: voiceOnly
            };
          });
        },
        undefined,
        subject || undefined,
        wsEndpoint
      );
    } catch (error) {
      console.error("Voice session failed:", error);
      set({ voiceSessionStatus: "error" });
    }
  },

  stopVoiceSession: async () => {
    voiceService.stopSession();
    set({ voiceSessionStatus: "idle", isAITyping: false, streamingMessageId: null });
  },

  clearSession: () => {
    set({
      type: null, subject: null, grade: null, messages: [], 
      isAITyping: false, isComplete: false, isVoiceOnly: false,
      streamingMessageId: null, voiceSessionStatus: "idle"
    });
  }
}));
