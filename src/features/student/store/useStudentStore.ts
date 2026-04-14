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
  suggestions?: string[];
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
  isChatOpen: boolean;
  isProfileOpen: boolean;
  isAgentPickerOpen: boolean;
  isAITyping: boolean;
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
  isAnalyticsOpen: boolean;
  
  // Analytics State
  analyticsSubjects: string[];
  selectedAnalyticsSubject: string;
  skillSummary: { 
    overall_score: number; 
    skill_index: number;
    session_count?: number;
  } | null;
  cgScores: Array<{ cg_id: string; cg_name: string; avg_mastery: number }>;
  skillTree: any[];
  analyticsChapterMastery: any[];
  isAnalyticsLoading: boolean;

  // Actions
  setStudentProfile: (profile: StudentProfile) => void;
  setAnalyticsOpen: (open: boolean) => void;
  setSelectedAnalyticsSubject: (subject: string) => void;
  fetchAnalyticsData: (subject?: string, studentIdOverride?: string) => Promise<void>;
  fetchSessions: () => Promise<void>;
  fetchAvailableAgents: () => Promise<void>;
  fetchAvailablePartners: () => Promise<void>;
  fetchEnrolledPartners: () => Promise<void>;
  fetchChatHistory: (sessionId: string) => Promise<void>;
  openExistingChat: (chat: ChatSession) => void;
  openNewChat: (subject: any, agent_id?: string) => void;
  startFocusedSession: (documentTitle: string) => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  setProfileOpen: (open: boolean) => void;
  setAgentPickerOpen: (open: boolean) => void;
  setPartnerModalOpen: (open: boolean) => void;
  sendPartnerRequest: (partnerId: string) => Promise<void>;
  logoutStudent: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStudentStore = create<StudentState>((set, get) => ({
  studentProfile: null,
  recentChats: [],
  activeChat: null,
  messages: [],
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
  isAnalyticsOpen: false,
  analyticsSubjects: [],
  selectedAnalyticsSubject: "",
  skillSummary: null,
  cgScores: [],
  skillTree: [],
  analyticsChapterMastery: [],
  isAnalyticsLoading: false,

  setStudentProfile: (profile) => set({ studentProfile: profile }),
  setAnalyticsOpen: (open) => set({ isAnalyticsOpen: open }),
  setSelectedAnalyticsSubject: (subject) => set({ selectedAnalyticsSubject: subject }),

  fetchAnalyticsData: async (subject, studentIdOverride) => {
    const { studentProfile, selectedAnalyticsSubject } = get();
    const effectiveStudentId = studentIdOverride || studentProfile?.user_id;
    if (!effectiveStudentId) return;

    const targetSubject = subject || selectedAnalyticsSubject;
    if (!targetSubject && !subject) {
      // First, fetch subjects if none selected
      try {
        const subData = await studentService.fetchAnalyticsSubjects(effectiveStudentId);
        const subjects = subData.subjects || [];
        set({ analyticsSubjects: subjects });
        if (subjects.length > 0) {
          get().fetchAnalyticsData(subjects[0], studentIdOverride);
        }
      } catch (error) {
        console.error("Fetch Analytics Subjects Error:", error);
      }
      return;
    }

    if (subject) set({ selectedAnalyticsSubject: subject });

    set({ isAnalyticsLoading: true });
    try {
      const [summary, scores, tree, mastery] = await Promise.all([
        studentService.fetchSkillSummary(effectiveStudentId, targetSubject),
        studentService.fetchCGScores(effectiveStudentId, targetSubject),
        studentService.fetchSkillTree(effectiveStudentId, targetSubject),
        studentService.fetchChapterMastery(effectiveStudentId, targetSubject),
      ]);

      set({
        skillSummary: summary,
        cgScores: scores,
        skillTree: tree,
        analyticsChapterMastery: mastery,
        isAnalyticsLoading: false
      });
    } catch (error) {
      console.error("Fetch Analytics Data Error:", error);
      set({ isAnalyticsLoading: false });
    }
  },

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
    } catch (error) {
      console.error("Partner Request Error:", error);
      set({ 
        partnerRequestStatus: "error", 
        partnerRequestMessage: "Failed to send partner request. Please try again." 
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

      set({ messages: mappedMessages, isHistoryLoading: false });
    } catch (error) {
      console.error("Fetch History Error:", error);
      set({ isHistoryLoading: false });
    }
  },

  openExistingChat: async (chat) => {
    // Open UI immediately
    set({
      activeChat: chat,
      isChatOpen: true,
      isAgentPickerOpen: false,
      isAITyping: false, // Reset loading state when switching context
      messages: [], // Clear old messages first
    });

    // Fetch real history
    await get().fetchChatHistory(chat.id);
  },

  openNewChat: (subject, agent_id) => {
    const tempId = `new-${Date.now()}`;
    const newSession: ChatSession = {
      id: tempId,
      title: subject.name,
      agentType: "Socratic Tutor",
      agentIcon: subject.icon,
      lastActive: "Just now",
      lastTopic: "New Session",
      grade: subject.grade,
      agent_id: agent_id || subject.id, // Prefer explicit agent_id, fallback to subject.id
    };

    set((state) => ({
      activeChat: newSession,
      recentChats: [newSession, ...state.recentChats], // Optimistically add to list immediately
      messages: [],
      isChatOpen: true,
      isAgentPickerOpen: false,
      isAITyping: false, // Reset loading state
    }));
  },

  startFocusedSession: (documentTitle) => {
    const { selectedAnalyticsSubject, availableAgents, studentProfile } = get();
    
    // Find matching agent for the subject
    const matchingAgent = availableAgents.find(a => 
      a.subject.toLowerCase() === selectedAnalyticsSubject.toLowerCase()
    );

    const tempId = `focused-${Date.now()}`;
    const newSession: ChatSession = {
      id: tempId,
      session_id: "", // First message requires empty session_id
      title: documentTitle,
      agentType: "Focused Tutor",
      agentIcon: "🎯",
      lastActive: "Just now",
      lastTopic: selectedAnalyticsSubject,
      grade: studentProfile?.grade ? `Grade ${studentProfile.grade}` : "General",
      agent_id: matchingAgent?.agent_id || "eng-grade-4", // Fallback
      isFocused: true,
      document_title: documentTitle,
      subject: selectedAnalyticsSubject
    };

    set({
      activeChat: newSession,
      isChatOpen: true,
      isAnalyticsOpen: false, // Close analytics to show chat
      messages: [],
      isAITyping: false
    });

    // We don't optimistically add to recentChats here? 
    // Usually focused sessions are temporary experimental ones, 
    // but the user might want them saved. I'll add it just like openNewChat.
    set((state) => ({
      recentChats: [newSession, ...state.recentChats]
    }));
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

    set((state) => ({
      messages: [...state.messages, userMsg],
      isAITyping: true,
    }));

    try {
      let data;
      if (activeChat.isFocused) {
        data = await studentService.sendFocusedChatMessage({
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
        data = await studentService.sendChatMessage({
          text,
          user_id: studentProfile.user_id,
          session_id: activeChat.session_id || undefined,
          agent_id: activeChat.agent_id || "eng-grade-4",
          subject: (activeChat as any).name || "English",
          grade: studentProfile.grade || 10,
        });
      }

      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: data.response,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestions: ["Explain more", "Give an example"],
      };

      set((state) => {
        // Find if this session is already in recentChats (either as temp ID or real ID)
        const chatInList = state.recentChats.find(c => c.id === chatSentFromId);
        
        let newRecentChats = state.recentChats;
        let finalActiveChat = state.activeChat;

        if (chatInList) {
          const updatedChat: ChatSession = {
            ...chatInList,
            id: data.session_id || chatInList.id,
            session_id: data.session_id || chatInList.session_id,
          };

          newRecentChats = state.recentChats.map(c => 
            c.id === chatSentFromId ? updatedChat : c
          );

          // Update activeChat if we are still on that same conversation
          if (state.activeChat?.id === chatSentFromId) {
            finalActiveChat = updatedChat;
          }
        }

        // Only add message and clear typing state if we are still viewing this chat
        const isStillViewingChat = state.activeChat?.id === chatSentFromId;
        
        return {
          activeChat: finalActiveChat,
          recentChats: newRecentChats,
          messages: isStillViewingChat ? [...state.messages, aiReply] : state.messages,
          isAITyping: isStillViewingChat ? false : state.isAITyping,
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
      
      set((state) => ({
        messages: state.activeChat?.id === chatSentFromId ? [...state.messages, errorMsg] : state.messages,
        isAITyping: state.activeChat?.id === chatSentFromId ? false : state.isAITyping,
      }));
    }
  },

  setAgentPickerOpen: (open) => set({ isAgentPickerOpen: open }),
  setPartnerModalOpen: (open) => set({ isPartnerModalOpen: open, partnerRequestStatus: open ? get().partnerRequestStatus : "idle" }),
  
  setProfileOpen: (open) => set({ isProfileOpen: open }),

  logoutStudent: () => {
    localStorage.removeItem("gened_user_role");
    localStorage.removeItem("gened_partner_id");
    set({
      studentProfile: null,
      activeChat: null,
      messages: [],
      isChatOpen: false,
      isProfileOpen: false,
      isAgentPickerOpen: false,
      isPartnerModalOpen: false,
      isAITyping: false,
    });
    window.location.href = "/";
  },
}));
