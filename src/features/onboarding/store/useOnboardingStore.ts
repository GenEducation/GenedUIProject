import { create } from "zustand";
import { onboardingService } from "../services/onboardingService";
import { studentService } from "@/features/student/services/studentService";
import {
  requireExactSubject,
  loadSubjectCatalog,
  type ExactSubject,
} from "@/features/subjects/subjectCatalog";
import {
  selectEffectiveLearningPartner,
  useStudentStore,
} from "@/features/student/store/useStudentStore";

export interface OnboardingMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface OnboardingState {
  type: "general" | "subject" | null;
  subject: ExactSubject | null;
  grade: number | null;
  dnaStatus: "PENDING" | "GENERAL_COMPLETED" | "COMPLETED" | string | null;
  
  messages: OnboardingMessage[];
  isAITyping: boolean;
  isComplete: boolean;
  isVoiceOnly: boolean;
  streamingMessageId: string | null;
  error: string | null;

  checkDNAStatus: (studentId: string) => Promise<void>;
  startOnboarding: (
    studentId: string, 
    type: "general" | "subject", 
    subject?: string, 
    grade?: number
  ) => Promise<void>;
  sendMessage: (studentId: string, text: string) => Promise<void>;
  sendVoiceMessage: (studentId: string, audioData: string, mimeType: string) => Promise<void>;
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
  error: null,

  checkDNAStatus: async (studentId: string) => {
    try {
      const data = await onboardingService.checkDNAStatus(studentId);
      set({ dnaStatus: data.status });
    } catch (error) {
      console.error("Failed to check DNA status:", error);
    }
  },

  startOnboarding: async (studentId, type, subject, grade) => {
    try {
      set({ error: null });
      let data;
      if (type === "general") {
        set({ type, subject: null, grade: null, messages: [], isComplete: false, isVoiceOnly: false });
        data = await onboardingService.startGeneralOnboarding(studentId);
      } else {
        const studentStore = useStudentStore.getState();
        let partnerBoard = studentStore.availablePartners.find((partner) => partner.is_effective)?.board;
        if (!partnerBoard && studentStore.enrolledPartners.length === 1) {
          partnerBoard = studentStore.enrolledPartners[0].board;
        }
        if (!partnerBoard) {
          // If the student hasn't visited the Profile page yet, enrolledPartners might be empty
          const data = await studentService.fetchAvailableAgents(studentId);
          partnerBoard = selectEffectiveLearningPartner(data.partners || [])?.board;
        }
        if (!partnerBoard) throw new Error("Could not determine your school's education board.");
        const catalog = await loadSubjectCatalog(partnerBoard);
        const exactSubject = requireExactSubject(subject, grade, catalog);

        set({ type, subject: exactSubject, grade: grade!, messages: [], isComplete: false, isVoiceOnly: false, error: null });
        data = await onboardingService.startSubjectOnboarding(studentId, exactSubject, grade!);
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
    } catch (error: any) {
      console.error("Failed to start onboarding:", error);
      set({ error: error?.message || "Subject onboarding could not be started. Please try again." });
    }
  },

  sendMessage: async (studentId: string, text: string) => {
    const { type, subject, messages } = get();
    if (!type) return;

    // Reset voice lock if user manually typed
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

  sendVoiceMessage: async (studentId: string, audioData: string, mimeType: string) => {
    const { type, subject, messages } = get();
    if (!type) return;

    // Reset voice lock for the next turn
    set({ isVoiceOnly: false });

    const userMsgId = `voice-user-${Date.now()}`;
    const userMsg: OnboardingMessage = {
      id: userMsgId,
      sender: "user",
      text: "🎤 [Voice Message]", 
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
        data = await onboardingService.sendGeneralChatMessage({ 
          student_id: studentId, 
          message: "", 
          audio_data: audioData, 
          audio_mime_type: mimeType 
        });
      } else {
        data = await onboardingService.sendSubjectChatMessage({ 
          student_id: studentId, 
          subject: subject!, 
          message: "", 
          audio_data: audioData, 
          audio_mime_type: mimeType 
        });
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
      console.error("Failed to send voice message:", error);
      set((state) => ({
        messages: state.messages.map(m => 
          m.id === streamingMsgId ? { ...m, text: "Sorry, I encountered an error processing your voice. Please try again." } : m
        ),
        isAITyping: false,
        streamingMessageId: null
      }));
    }
  },

  clearSession: () => {
    set({
      type: null, subject: null, grade: null, messages: [], 
      isAITyping: false, isComplete: false, isVoiceOnly: false,
      streamingMessageId: null, error: null
    });
  }
}));
