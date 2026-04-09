import { create } from "zustand";

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
}

export interface SubjectItem {
  id: string;
  name: string;
  grade: string;
  icon: string;
  chaptersCount: number;
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
  isAgentPickerOpen: boolean;
  isAITyping: boolean;
  isSessionsLoading: boolean;
  isHistoryLoading: boolean;

  // Actions
  setStudentProfile: (profile: StudentProfile) => void;
  fetchSessions: () => Promise<void>;
  fetchChatHistory: (sessionId: string) => Promise<void>;
  openExistingChat: (chat: ChatSession) => void;
  openNewChat: (subject: SubjectItem) => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  setAgentPickerOpen: (open: boolean) => void;
  logoutStudent: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.10:8000").replace(/\/$/, "");

export const useStudentStore = create<StudentState>((set, get) => ({
  studentProfile: null,
  recentChats: [],
  activeChat: null,
  messages: [],
  isChatOpen: false,
  isAgentPickerOpen: false,
  isAITyping: false,
  isSessionsLoading: false,
  isHistoryLoading: false,

  setStudentProfile: (profile) => set({ studentProfile: profile }),

  fetchSessions: async () => {
    const { studentProfile } = get();
    if (!studentProfile) return;

    set({ isSessionsLoading: true });
    try {
      const response = await fetch(`${API_BASE_URL}/get-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: studentProfile.user_id }),
      });

      if (!response.ok) throw new Error("Failed to fetch sessions");

      const data = await response.json();
      // data: { status, student_id, sessions: [ { session_id, title, created_at } ] }

      const mappedChats: ChatSession[] = data.sessions.map((s: any) => ({
        id: s.session_id,
        session_id: s.session_id,
        title: s.title || "Scholarly Session",
        agentType: "English Assistant",
        agentIcon: "📖",
        lastActive: s.created_at ? new Date(s.created_at).toLocaleDateString() : "Recently",
        lastTopic: "Continued Learning",
        grade: "", // Grade is handled via student profile
      }));

      set({ recentChats: mappedChats, isSessionsLoading: false });
    } catch (error) {
      console.error("Fetch Sessions Error:", error);
      set({ isSessionsLoading: false });
    }
  },

  fetchChatHistory: async (sessionId: string) => {
    const { studentProfile } = get();
    if (!studentProfile) return;

    set({ isHistoryLoading: true });
    try {
      const response = await fetch(`${API_BASE_URL}/get-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: studentProfile.user_id,
          session_id: sessionId,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch history");

      const data = await response.json();
      // data: { status, student_id, session_id, history: [ { role, content, created_at } ] }

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

  openNewChat: (subject) => {
    const tempId = `new-${Date.now()}`;
    const newSession: ChatSession = {
      id: tempId,
      title: subject.name,
      agentType: "Socratic Tutor",
      agentIcon: subject.icon,
      lastActive: "Just now",
      lastTopic: "New Session",
      grade: subject.grade,
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
      const response = await fetch(`${API_BASE_URL}/april-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          user_id: studentProfile.user_id,
          session_id: activeChat.session_id || undefined,
          subject: "English",
          grade: studentProfile.grade || 10,
        }),
      });

      if (!response.ok) throw new Error("API request failed");

      const data = await response.json();

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

  logoutStudent: () => {
    localStorage.removeItem("gened_user_role");
    localStorage.removeItem("gened_partner_id");
    set({
      studentProfile: null,
      activeChat: null,
      messages: [],
      isChatOpen: false,
      isAgentPickerOpen: false,
      isAITyping: false,
    });
    window.location.href = "/";
  },
}));
