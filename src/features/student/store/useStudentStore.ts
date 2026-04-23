import { create } from "zustand";
import { studentService } from "../services/studentService";

// ── Types ────────────────────────────────────────────────────────────────────

export interface StudentProfile {
  user_id: string;
  username: string;
  email?: string;
  role: string;
  age?: number;
  grade?: number;
  school_board?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: string;
  options?: string[];
  statusText?: string;
}

export interface ChatSession {
  id: string;
  session_id?: string;
  title: string;
  agentType: string;
  agentIcon: string;
  lastActive: string;
  lastTopic: string;
  grade?: string;
  agent_id?: string;
  isFocused?: boolean;
  document_title?: string;
  subject?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  grade: string;
  icon: string;
  chaptersCount: number;
}

export interface AgentItem {
  agent_id: string;
  name: string;
  subject: string;
  grade: number;
}

export interface PartnerItem {
  id: string;
  partner_id?: string;
  organization: string;
}

export const AVAILABLE_SUBJECTS: SubjectItem[] = [
  { id: "sub-1", name: "Quantum Physics", grade: "Grade 12", icon: "⚛", chaptersCount: 12 },
  { id: "sub-2", name: "Medieval History", grade: "Grade 10", icon: "🏰", chaptersCount: 8 },
  { id: "sub-3", name: "Advanced Calculus", grade: "Grade 12", icon: "∑", chaptersCount: 15 },
  { id: "sub-4", name: "Essay Writing", grade: "Grade 9–12", icon: "✍️", chaptersCount: 6 },
  { id: "sub-5", name: "Research Methods", grade: "Grade 11", icon: "🔍", chaptersCount: 5 },
  { id: "sub-6", name: "Computer Science", grade: "Grade 10", icon: "💻", chaptersCount: 10 },
  { id: "sub-7", name: "Biology", grade: "Grade 11", icon: "🧬", chaptersCount: 14 },
  { id: "sub-8", name: "Economics", grade: "Grade 12", icon: "📊", chaptersCount: 9 },
  { id: "sub-9", name: "Chemistry", grade: "Grade 11", icon: "⚗️", chaptersCount: 11 },
  { id: "sub-10", name: "Literature", grade: "Grade 10", icon: "📖", chaptersCount: 7 },
];

// ── Store interface ───────────────────────────────────────────────────────────

interface StudentState {
  studentProfile: StudentProfile | null;
  recentChats: ChatSession[];
  activeChat: ChatSession | null;
  messages: ChatMessage[];
  chatMessagesCache: Record<string, ChatMessage[]>;
  isChatOpen: boolean;
  isProfileOpen: boolean;
  isAgentPickerOpen: boolean;
  isAITyping: boolean;
  typingChatIds: string[];
  isSessionsLoading: boolean;
  isHistoryLoading: boolean;
  availableAgents: AgentItem[];
  isAgentsLoading: boolean;
  availablePartners: PartnerItem[];
  enrolledPartners: PartnerItem[];
  isEnrolledPartnersLoading: boolean;
  partnerRequestStatus: "idle" | "loading" | "success" | "error";
  partnerRequestMessage: string;
  isPartnerModalOpen: boolean;
  streamingMessageId: string | null;
  
  // Actions
  setStudentProfile: (profile: StudentProfile) => void;
  fetchSessions: () => Promise<void>;
  fetchAvailableAgents: () => Promise<void>;
  fetchAvailablePartners: () => Promise<void>;
  fetchEnrolledPartners: () => Promise<void>;
  fetchChatHistory: (sessionId: string) => Promise<void>;
  openExistingChat: (chat: ChatSession) => void;
  openChatById: (sessionId: string) => Promise<void>;
  openNewChat: (agent: AgentItem) => string;
  initNewChat: (agentId: string) => void;
  startFocusedSession: (documentTitle: string, subject: string) => string;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  setProfileOpen: (open: boolean) => void;
  setAgentPickerOpen: (open: boolean) => void;
  setPartnerModalOpen: (open: boolean) => void;
  sendPartnerRequest: (partnerId: string) => Promise<void>;
  linkParent: (parentId: string) => Promise<void>;
  logoutStudent: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStudentStore = create<StudentState>((set, get) => ({
  studentProfile: null,
  recentChats: [],
  activeChat: null,
  messages: [],
  chatMessagesCache: {},
  typingChatIds: [],
  isChatOpen: false,
  isProfileOpen: false,
  isAgentPickerOpen: false,
  isAITyping: false,
  isSessionsLoading: false,
  isHistoryLoading: false,
  availableAgents: [],
  isAgentsLoading: false,
  availablePartners: [],
  enrolledPartners: [],
  isEnrolledPartnersLoading: false,
  partnerRequestStatus: "idle",
  partnerRequestMessage: "",
  isPartnerModalOpen: false,
  streamingMessageId: null,

  setStudentProfile: (profile) => set({ studentProfile: profile }),

  fetchSessions: async () => {
    const { studentProfile } = get();
    if (!studentProfile) return;

    set({ isSessionsLoading: true });
    try {
      const data = await studentService.fetchSessions(studentProfile.user_id);
      
      const mappedChats: ChatSession[] = data.sessions.map((s: any) => ({
        id: s.session_id,
        session_id: s.session_id,
        title: s.title || s.agent_name || "Scholarly Session",
        agentType: "English Assistant",
        agentIcon: "📖",
        lastActive: s.updated_at ? new Date(s.updated_at).toLocaleDateString() : "Recently",
        lastTopic: "Continued Learning",
        grade: "", // Grade is handled via student profile
        agent_id: s.subject_agent, // Mapping backend agent field
      }));

      set({ recentChats: mappedChats, isSessionsLoading: false });
    } catch (error) {
      console.error("Fetch Sessions Error:", error);
      set({ isSessionsLoading: false });
    }
  },

  fetchAvailableAgents: async () => {
    const { studentProfile } = get();
    if (!studentProfile) return;

    set({ isAgentsLoading: true });
    try {
      const data = await studentService.fetchAvailableAgents(studentProfile.user_id);
      
      // Flatten the nested structure: data.partners[].subjects[].agents[]
      const agents: AgentItem[] = [];
      if (data.partners && Array.isArray(data.partners)) {
        data.partners.forEach((partner: any) => {
          if (partner.subjects && Array.isArray(partner.subjects)) {
            partner.subjects.forEach((subject: any) => {
              if (subject.agents && Array.isArray(subject.agents)) {
                agents.push(...subject.agents);
              }
            });
          }
        });
      }
      
      set({ availableAgents: agents, isAgentsLoading: false });
    } catch (error) {
      console.error("Fetch Agents Error:", error);
      set({ availableAgents: [], isAgentsLoading: false });
    }
  },

  fetchAvailablePartners: async () => {
    try {
      const data: PartnerItem[] = await studentService.fetchAvailablePartners();
      set({ availablePartners: data });
    } catch (error) {
      console.error("Fetch Partners Error:", error);
    }
  },

  fetchEnrolledPartners: async () => {
    const { studentProfile } = get();
    if (!studentProfile) return;

    set({ isEnrolledPartnersLoading: true });
    try {
      const data = await studentService.fetchEnrolledPartners(studentProfile.user_id);
      set({ enrolledPartners: data.partners || [], isEnrolledPartnersLoading: false });
    } catch (error) {
      console.error("Fetch Enrolled Partners Error:", error);
      set({ isEnrolledPartnersLoading: false });
    }
  },

  sendPartnerRequest: async (partnerId: string) => {
    const { studentProfile } = get();
    if (!studentProfile?.user_id) {
      set({ 
        isPartnerModalOpen: true, 
        partnerRequestStatus: "error", 
        partnerRequestMessage: "Student profile not found." 
      });
      return;
    }

    set({ 
      isPartnerModalOpen: true, 
      partnerRequestStatus: "loading",
      partnerRequestMessage: "Sending request..." 
    });

    try {
      const data = await studentService.sendPartnerRequest(studentProfile.user_id, partnerId);
      const message = data.message || data.organization || "Successfully enrolled in partner module.";

      set({ 
        partnerRequestStatus: "success", 
        partnerRequestMessage: String(message) 
      });
    } catch (error: any) {
      console.error("Partner Request Error:", error);
      let errorMessage = error?.message || "Failed to send partner request. Please try again.";
      if (typeof errorMessage !== "string") {
        errorMessage = JSON.stringify(errorMessage);
      }
      set({ 
        partnerRequestStatus: "error", 
        partnerRequestMessage: errorMessage 
      });
    }
  },

  linkParent: async (parentId: string) => {
    const { studentProfile } = get();
    if (!studentProfile?.user_id) {
      set({ 
        isPartnerModalOpen: true, 
        partnerRequestStatus: "error", 
        partnerRequestMessage: "Student profile not found." 
      });
      return;
    }

    set({ 
      isPartnerModalOpen: true, 
      partnerRequestStatus: "loading",
      partnerRequestMessage: "Linking parent profile..." 
    });

    try {
      await studentService.linkParent(studentProfile.user_id, parentId);
      set({ 
        partnerRequestStatus: "success", 
        partnerRequestMessage: "Parent successfully linked to your profile." 
      });
    } catch (error: any) {
      console.error("Link Parent Error:", error);
      let errorMessage = error?.message || "Failed to link parent. Please check the ID and try again.";
      if (typeof errorMessage !== "string") {
        errorMessage = JSON.stringify(errorMessage);
      }
      
      set({ 
        partnerRequestStatus: "error", 
        partnerRequestMessage: errorMessage 
      });
    }
  },

  fetchChatHistory: async (sessionId: string) => {
    const { studentProfile } = get();
    if (!studentProfile) return;

    set({ isHistoryLoading: true });
    try {
      const data = await studentService.fetchChatHistory(studentProfile.user_id, sessionId);
      
      const mappedMessages: ChatMessage[] = data.history.map((h: any, i: number) => ({
        id: `h-${i}-${Date.now()}`,
        text: h.content,
        sender: h.role === "user" ? "user" : "ai",
        timestamp: h.created_at ? new Date(h.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      }));

      set((state) => ({ 
        messages: state.activeChat?.id === sessionId ? mappedMessages : state.messages,
        chatMessagesCache: { ...state.chatMessagesCache, [sessionId]: mappedMessages },
        isHistoryLoading: false 
      }));
    } catch (error) {
      console.error("Fetch History Error:", error);
      set({ isHistoryLoading: false });
    }
  },

  openExistingChat: async (chat) => {
    // Open UI immediately
    set((state) => ({
      activeChat: chat,
      isChatOpen: true,
      isAgentPickerOpen: false,
      isAITyping: state.typingChatIds.includes(chat.id),
      messages: state.chatMessagesCache[chat.id] || [], // Use cached messages if available
    }));

    // Fetch real history only if we are not currently waiting for an AI response
    // to prevent overwriting the optimistic latest message
    if (!get().typingChatIds.includes(chat.id)) {
      await get().fetchChatHistory(chat.id);
    }
  },

  openChatById: async (sessionId) => {
    const { recentChats, fetchSessions, fetchChatHistory } = get();
    
    // 1. Try to find in existing list
    let chat = recentChats.find(c => c.id === sessionId);
    
    // 2. If not found, it might be a refresh - fetch sessions first
    if (!chat) {
      await fetchSessions();
      chat = get().recentChats.find(c => c.id === sessionId);
    }
    
    // 3. If found now, open it
    if (chat) {
      set((state) => ({
        activeChat: chat,
        isChatOpen: true,
        isAITyping: state.typingChatIds.includes(sessionId),
        messages: state.chatMessagesCache[sessionId] || [],
      }));
      
      if (!get().typingChatIds.includes(sessionId)) {
        await fetchChatHistory(sessionId);
      }
    } else {
      console.error("Chat not found even after fetching sessions:", sessionId);
      // Fallback: stay on home or clear state
    }
  },

  openNewChat: (agent: AgentItem) => {
    const newSession: ChatSession = {
      id: "new",
      title: agent.name,
      subject: agent.subject,
      agentType: "Socratic Tutor",
      agentIcon: "🤖",
      lastActive: "Just now",
      lastTopic: "New Session",
      grade: `Grade ${agent.grade}`,
      agent_id: agent.agent_id,
    };

    set((state) => ({
      activeChat: newSession,
      messages: [],
      chatMessagesCache: { ...state.chatMessagesCache, ["new"]: [] },
      isChatOpen: true,
      isAgentPickerOpen: false,
      isAITyping: false,
    }));

    return "new";
  },

  initNewChat: (agentId: string) => {
    const { availableAgents } = get();
    // If agents aren't loaded yet, we can't fully init, but fetchAvailableAgents 
    // is called on StudentHome mount. Here we try to find the agent.
    const agent = availableAgents.find(a => a.agent_id === agentId);
    
    if (agent) {
      const newSession: ChatSession = {
        id: "new",
        title: agent.name,
        subject: agent.subject,
        agentType: "Socratic Tutor",
        agentIcon: "🤖",
        lastActive: "Just now",
        lastTopic: "New Session",
        grade: `Grade ${agent.grade}`,
        agent_id: agent.agent_id,
      };
      set({ activeChat: newSession, isChatOpen: true });
    }
  },

  startFocusedSession: (documentTitle, subject) => {
    const { availableAgents, studentProfile } = get();
    
    // Find matching agent for the subject
    const matchingAgent = availableAgents.find(a => 
      a.subject.toLowerCase() === subject.toLowerCase()
    );

    const tempId = `focused-${Date.now()}`;
    const newSession: ChatSession = {
      id: tempId,
      session_id: "", // First message requires empty session_id
      title: documentTitle,
      agentType: "Focused Tutor",
      agentIcon: "🎯",
      lastActive: "Just now",
      lastTopic: subject,
      grade: studentProfile?.grade ? `Grade ${studentProfile.grade}` : "General",
      agent_id: matchingAgent?.agent_id || "eng-grade-4", // Fallback
      isFocused: true,
      document_title: documentTitle,
      subject: subject
    };

    // Navigation to /student/chat is handled by the calling component via router.push

    set((state) => ({
      activeChat: newSession,
      isChatOpen: true,
      messages: [],
      chatMessagesCache: { ...state.chatMessagesCache, [tempId]: [] },
      isAITyping: false
    }));

    // We don't optimistically add to recentChats here? 
    // Usually focused sessions are temporary experimental ones, 
    // but the user might want them saved. I'll add it just like openNewChat.
    set((state) => ({
      recentChats: [newSession, ...state.recentChats]
    }));

    return tempId;
  },

  closeChat: () =>
    set({ isChatOpen: false, activeChat: null, messages: [], isAITyping: false }),

  sendMessage: async (text: string) => {
    const { studentProfile, activeChat } = get();
    if (!studentProfile || !activeChat) return;

    // Capture the ID of the chat where the message was sent
    const chatSentFromId = activeChat.id;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Insert user message + streaming AI placeholder immediately
    const streamingMsgId = `streaming-${Date.now()}`;
    const streamingPlaceholder: ChatMessage = {
      id: streamingMsgId,
      text: "",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    set((state) => {
      const currentMessages = state.chatMessagesCache[chatSentFromId] || state.messages;
      const newMessages = [...currentMessages, userMsg, streamingPlaceholder];

      return {
        messages: state.activeChat?.id === chatSentFromId ? newMessages : state.messages,
        chatMessagesCache: { ...state.chatMessagesCache, [chatSentFromId]: newMessages },
        typingChatIds: [...state.typingChatIds, chatSentFromId],
        isAITyping: state.activeChat?.id === chatSentFromId ? true : state.isAITyping,
        streamingMessageId: streamingMsgId,
      };
    });

    try {
      let response: Response;
      if (activeChat.isFocused) {
        response = await studentService.sendFocusedChatMessage({
          text,
          user_id: studentProfile.user_id,
          session_id: activeChat.session_id || "",
          agent_id: activeChat.agent_id || "eng-grade-4",
          subject: activeChat.subject || "English",
          intent: "",
          document_title: activeChat.document_title || "General",
          grade: studentProfile.grade || 10,
        });
      } else {
        // Use session_id if set, otherwise fall back to activeChat.id (both are the real
        // session UUID after the first response — this guarantees continuity on follow-up messages)
        const sessionIdToSend = activeChat.session_id || activeChat.id || undefined;
        const isNewSession = !sessionIdToSend || sessionIdToSend === "new" || sessionIdToSend.startsWith("new-") || sessionIdToSend.startsWith("focused-");
        console.debug("[Chat] Sending message", {
          session_id: isNewSession ? undefined : sessionIdToSend,
          text,
        });
        response = await studentService.sendChatMessage({
          text,
          user_id: studentProfile.user_id,
          session_id: isNewSession ? undefined : sessionIdToSend,
          agent_id: activeChat.agent_id || "eng-grade-4",
          subject: activeChat.subject || "English",
          grade: studentProfile.grade || 10,
        });
      }

      if (!response.body) throw new Error("No response body for streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalSessionId: string | undefined;
      let finalOptions: string[] = [];

      // ── Phase 1: Read the ENTIRE stream silently ──────────────────────────
      // Collect all planning statuses and all text chunks before touching the UI.
      // This eliminates every race-condition from the concurrent approach.
      const planningStatuses: string[] = [];
      let bufferedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          let event: any;
          try { event = JSON.parse(jsonStr); } catch { continue; }

          if (event.type === "planning") {
            const status = event.text || event.message || "";
            if (status && !planningStatuses.includes(status)) {
              planningStatuses.push(status);
            }
          } else if ((event.type === "chunk" || event.type === "chunks") && typeof event.text === "string") {
            bufferedText += event.text;
          } else if (event.type === "done") {
            finalSessionId = event.session_id;
            finalOptions = Array.isArray(event.options) ? event.options : [];
          }
        }
      }

      // ── Phase 2: Play back planning statuses with delays, then reveal text ─
      const statusesToShow = planningStatuses.length > 0 ? planningStatuses : ["Processing..."];

      const patchStatus = (statusText: string | undefined) => {
        set((state) => {
          const patch = (msgs: ChatMessage[]) =>
            msgs.map(m => m.id === streamingMsgId ? { ...m, statusText, text: "" } : m);
          return {
            messages: state.activeChat?.id === chatSentFromId ? patch(state.messages) : state.messages,
            chatMessagesCache: { ...state.chatMessagesCache, [chatSentFromId]: patch(state.chatMessagesCache[chatSentFromId] || []) },
          };
        });
      };

      for (const status of statusesToShow) {
        patchStatus(status);
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // Clear status and reveal the full buffered text
      set((state) => {
        const patch = (msgs: ChatMessage[]) =>
          msgs.map(m => m.id === streamingMsgId ? { ...m, statusText: undefined, text: bufferedText } : m);
        return {
          messages: state.activeChat?.id === chatSentFromId ? patch(state.messages) : state.messages,
          chatMessagesCache: { ...state.chatMessagesCache, [chatSentFromId]: patch(state.chatMessagesCache[chatSentFromId] || []) },
        };
      });

      // Finalise: replace streaming placeholder with finished message + options
      set((state) => {
        const finalisedMsg: ChatMessage = {
          id: streamingMsgId,
          text: bufferedText,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          options: finalOptions.length > 0 ? finalOptions : undefined,
          statusText: undefined,
        };

        const patchMsg = (msgs: ChatMessage[]) =>
          msgs.map((m) => (m.id === streamingMsgId ? finalisedMsg : m));

        // Update the session in recentChats
        const isPromotingNewChat = chatSentFromId === "new";
        const chatInList = state.recentChats.find((c) => c.id === chatSentFromId);
        let newRecentChats = state.recentChats;
        let finalActiveChat = state.activeChat;
        const realId = finalSessionId || chatSentFromId;

        if (isPromotingNewChat && finalSessionId) {
          // Promote "new" chat to a real session in the list
          const updatedChat: ChatSession = {
            ...state.activeChat!,
            id: finalSessionId,
            session_id: finalSessionId,
          };
          // Filter out existing in case fetchSessions picked it up while streaming
          const deduplicatedChats = state.recentChats.filter(
            (c) => c.id !== finalSessionId && c.session_id !== finalSessionId
          );
          newRecentChats = [updatedChat, ...deduplicatedChats];
          if (state.activeChat?.id === "new") {
            finalActiveChat = updatedChat;
          }
        } else if (chatInList) {
          const updatedChat: ChatSession = {
            ...chatInList,
            id: realId,
            session_id: finalSessionId || chatInList.session_id,
          };
          // Replace the temp entry and remove any duplicate with the same realId
          newRecentChats = state.recentChats
            .map((c) => (c.id === chatSentFromId ? updatedChat : c))
            .filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);
          if (state.activeChat?.id === chatSentFromId) {
            finalActiveChat = updatedChat;
          }
        }

        // Migrate cache key from tempId to realId
        const currentCached = state.chatMessagesCache[chatSentFromId] || [];
        const finalisedMessages = patchMsg(currentCached);
        const newCache = { ...state.chatMessagesCache, [realId]: finalisedMessages };
        if (realId !== chatSentFromId) {
          delete newCache[chatSentFromId];
        }

        const newTypingIds = state.typingChatIds.filter((id) => id !== chatSentFromId);
        const isStillViewing = state.activeChat?.id === chatSentFromId;

        return {
          activeChat: finalActiveChat,
          recentChats: newRecentChats,
          chatMessagesCache: newCache,
          messages: isStillViewing ? finalisedMessages : state.messages,
          typingChatIds: newTypingIds,
          isAITyping: isStillViewing ? false : state.isAITyping,
          streamingMessageId: null,
        };
      });
    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        text: "Sorry, I encountered an error connecting to the knowledge base. Please try again.",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      set((state) => {
        // Replace streaming placeholder with error message
        const replaceOrAppend = (msgs: ChatMessage[]) => {
          const withoutStreaming = msgs.filter((m) => m.id !== streamingMsgId);
          return [...withoutStreaming, errorMsg];
        };

        const cached = state.chatMessagesCache[chatSentFromId] || [];
        const finishedMessages = replaceOrAppend(cached);
        const newTypingIds = state.typingChatIds.filter((id) => id !== chatSentFromId);

        return {
          chatMessagesCache: { ...state.chatMessagesCache, [chatSentFromId]: finishedMessages },
          messages:
            state.activeChat?.id === chatSentFromId ? finishedMessages : state.messages,
          typingChatIds: newTypingIds,
          isAITyping:
            state.activeChat?.id === chatSentFromId ? false : state.isAITyping,
          streamingMessageId: null,
        };
      });
    }
  },

  setAgentPickerOpen: (open) => set({ isAgentPickerOpen: open }),
  setPartnerModalOpen: (open) => set({ isPartnerModalOpen: open, partnerRequestStatus: open ? get().partnerRequestStatus : "idle" }),
  
  setProfileOpen: (open) => set({ isProfileOpen: open }),

  logoutStudent: () => {
    localStorage.removeItem("gened_user_role");
    localStorage.removeItem("gened_auth_token");
    localStorage.removeItem("gened_user_profile");
    localStorage.removeItem("gened_partner_id");
    set({
      studentProfile: null,
      activeChat: null,
      messages: [],
      chatMessagesCache: {},
      isChatOpen: false,
      isProfileOpen: false,
      isAgentPickerOpen: false,
      isPartnerModalOpen: false,
      isAITyping: false,
      typingChatIds: [],
    });
    window.location.href = "/";
  },
}));
