import { create } from "zustand";
import { studentService } from "../services/studentService";
import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

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

export interface ChatElement {
  id: string;
  type: "text" | "svg" | "widget";
  content: string;
  meta?: any;
}

export interface ChatMessage {
  id: string;
  text: string;
  elements?: ChatElement[];
  sender: "user" | "ai";
  timestamp: string;
  options?: string[];
  statusText?: string;
  toolStatus?: string;
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
  chatMode?: "text" | "voice";
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

// ── Visual Tag Parser ────────────────────────────────────────────────────────

const SCHOLARLY_BLUEPRINT = `
<svg width="400" height="200" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="200" rx="12" fill="#F8FBF9"/>
  <path d="M0 20H400M0 40H400M0 60H400M0 80H400M0 100H400M0 120H400M0 140H400M0 160H400M0 180H400" stroke="#1A3A2A" stroke-opacity="0.03"/>
  <path d="M20 0V200M40 0V200M60 0V200M80 0V200M100 0V200M120 0V200M140 0V200M160 0V200M180 0V200M200 0V200M220 0V200M240 0V200M260 0V200M280 0V200M300 0V200M320 0V200M340 0V200M360 0V200M380 0V200" stroke="#1A3A2A" stroke-opacity="0.03"/>
  <rect x="100" y="50" width="200" height="100" rx="8" stroke="#1A3A2A" stroke-opacity="0.1" stroke-dasharray="4 4"/>
  <text x="200" y="105" text-anchor="middle" fill="#1A3A2A" fill-opacity="0.3" font-family="sans-serif" font-size="12" font-weight="bold" style="text-transform: uppercase; letter-spacing: 0.1em;">Scholarly Blueprint</text>
  <text x="200" y="125" text-anchor="middle" fill="#1A3A2A" fill-opacity="0.2" font-family="sans-serif" font-size="10">Visualization Ready</text>
</svg>
`;

function generateHistoricalSVG(type: string, params: any): string {
  const width = 400;
  const height = 280;
  
  let shapeMarkup = "";
  
  // Design Constants
  const brandGreen = "#059669";
  const darkInk = "#1A3A2A";
  const gridColor = "#1A3A2A";
  
  if (type === "rectangle") {
    const wVal = params.width || 5;
    const hVal = params.height || 3;
    const w = Math.min(wVal * 40, width - 120);
    const h = Math.min(hVal * 40, height - 120);
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    
    shapeMarkup = `
      <!-- Gradient Definition -->
      <defs>
        <linearGradient id="shapeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${brandGreen}" stop-opacity="0.08" />
          <stop offset="100%" stop-color="${brandGreen}" stop-opacity="0.15" />
        </linearGradient>
      </defs>

      <!-- Main Shape -->
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#shapeGradient)" stroke="${brandGreen}" stroke-width="2" />
      
      <!-- Width Dimension Line -->
      <g opacity="0.6">
        <line x1="${x}" y1="${y - 20}" x2="${x + w}" y2="${y - 20}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x}" y1="${y - 25}" x2="${x}" y2="${y - 15}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x + w}" y1="${y - 25}" x2="${x + w}" y2="${y - 15}" stroke="${darkInk}" stroke-width="1" />
        <text x="${x + w/2}" y="${y - 32}" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="0.05em">${wVal} UNITS</text>
      </g>

      <!-- Height Dimension Line -->
      <g opacity="0.6">
        <line x1="${x + w + 20}" y1="${y}" x2="${x + w + 20}" y2="${y + h}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x + w + 15}" y1="${y}" x2="${x + w + 25}" y2="${y}" stroke="${darkInk}" stroke-width="1" />
        <line x1="${x + w + 15}" y1="${y + h}" x2="${x + w + 25}" y2="${y + h}" stroke="${darkInk}" stroke-width="1" />
        <text x="${x + w + 35}" y="${y + h/2}" dominant-baseline="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="0.05em" transform="rotate(90, ${x + w + 35}, ${y + h/2})">${hVal} UNITS</text>
      </g>
    `;
  } else if (type === "circle") {
    const rVal = params.radius || 2;
    const r = Math.min(rVal * 40, 100);
    const cx = width / 2;
    const cy = height / 2;
    
    shapeMarkup = `
      <defs>
        <radialGradient id="circleGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="${brandGreen}" stop-opacity="0.15" />
          <stop offset="100%" stop-color="${brandGreen}" stop-opacity="0.05" />
        </radialGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#circleGradient)" stroke="${brandGreen}" stroke-width="2" />
      
      <!-- Radius Line -->
      <g opacity="0.6">
        <line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${darkInk}" stroke-width="1.5" stroke-dasharray="4 2" />
        <circle cx="${cx}" cy="${cy}" r="2.5" fill="${darkInk}" />
        <text x="${cx + r/2}" y="${cy - 12}" text-anchor="middle" fill="${darkInk}" font-family="Inter, sans-serif" font-size="11" font-weight="700" letter-spacing="0.05em">R = ${rVal}</text>
      </g>
    `;
  } else {
    return SCHOLARLY_BLUEPRINT;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="24" fill="#FBFBFA"/>
  
  <!-- Subtle Blueprint Grid -->
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridColor}" stroke-width="0.5" stroke-opacity="0.04"/>
  </pattern>
  <rect width="100%" height="100%" fill="url(#grid)" rx="24" />
  
  ${shapeMarkup}
  
  ${params.label ? `
    <rect x="${width/2 - 60}" y="${height - 35}" width="120" height="20" rx="10" fill="${darkInk}" fill-opacity="0.03" />
    <text x="${width/2}" y="${height - 21}" text-anchor="middle" fill="${darkInk}" fill-opacity="0.4" font-family="Inter, sans-serif" font-size="10" font-weight="800" style="text-transform: uppercase; letter-spacing: 0.15em;">${params.label}</text>
  ` : ""}
</svg>`;
}

function parseContent(content: string): ChatElement[] {
  if (!content) return [];
  const elements: ChatElement[] = [];
  const regex = /<<(MATH_DRAW|MATH_WIDGET)\s+([^>]+)>>/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      elements.push({
        id: Math.random().toString(36).substring(2, 11),
        type: "text",
        content: textBefore.trim(),
      });
    }

    const type = match[1];
    const attrsRaw = match[2];
    
    if (type === "MATH_DRAW") {
      const typeMatch = attrsRaw.match(/type="([^"]+)"/);
      const paramsMatch = attrsRaw.match(/params=({[^}]+})/);
      
      let params: any = {};
      if (paramsMatch) {
        try {
          const jsonStr = paramsMatch[1].replace(/'/g, '"');
          params = JSON.parse(jsonStr);
        } catch (e) {
          console.warn("Failed to parse params for MATH_DRAW", paramsMatch[1]);
        }
      }

      const shapeType = typeMatch ? typeMatch[1] : "diagram";
      elements.push({
        id: Math.random().toString(36).substring(2, 11),
        type: "svg",
        content: generateHistoricalSVG(shapeType, params),
        meta: { 
          shape: shapeType,
          params,
          is_historical: true 
        },
      });
    } else if (type === "MATH_WIDGET") {
      const exprMatch = attrsRaw.match(/expression="([^"]+)"/);
      elements.push({
        id: Math.random().toString(36).substring(2, 11),
        type: "widget",
        content: exprMatch ? exprMatch[1] : "",
      });
    }

    lastIndex = regex.lastIndex;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText.trim() || elements.length === 0) {
    elements.push({
      id: Math.random().toString(36).substring(2, 11),
      type: "text",
      content: remainingText.trim() || content,
    });
  }

  return elements;
}

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
  historyAbortController: AbortController | null;
  availableAgents: AgentItem[];
  isAgentsLoading: boolean;
  availablePartners: PartnerItem[];
  enrolledPartners: PartnerItem[];
  isEnrolledPartnersLoading: boolean;
  partnerRequestStatus: "idle" | "loading" | "success" | "error";
  partnerRequestMessage: string;
  isPartnerModalOpen: boolean;
  streamingMessageId: string | null;
  voiceSessionStatus: "idle" | "connecting" | "active" | "error";
  
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
  linkParent: (parentEmailOrPhone: string) => Promise<void>;
  startVoiceSession: () => Promise<void>;
  stopVoiceSession: () => void;
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
  historyAbortController: null,
  availableAgents: [],
  isAgentsLoading: false,
  availablePartners: [],
  enrolledPartners: [],
  isEnrolledPartnersLoading: false,
  partnerRequestStatus: "idle",
  partnerRequestMessage: "",
  isPartnerModalOpen: false,
  streamingMessageId: null,
  voiceSessionStatus: "idle",

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

  linkParent: async (parentEmailOrPhone: string) => {
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
      await studentService.linkParent(studentProfile.user_id, parentEmailOrPhone);
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
    const { studentProfile, historyAbortController } = get();
    if (!studentProfile) return;

    // Abort any existing history request
    if (historyAbortController) {
      historyAbortController.abort();
    }

    const controller = new AbortController();
    set({ isHistoryLoading: true, historyAbortController: controller });

    try {
      const response = await authFetch(`${API_BASE_URL}/get-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: studentProfile.user_id,
          session_id: sessionId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      
      const mappedMessages: ChatMessage[] = (data.history || []).map((h: any, i: number) => {
        const content = h.content || "";
        const elements = parseContent(content);
        
        return {
          id: `h-${i}-${Date.now()}`,
          text: content,
          elements: elements.length > 1 || (elements.length === 1 && elements[0].type !== "text") ? elements : undefined,
          sender: h.role === "user" ? "user" : "ai",
          timestamp: h.created_at ? new Date(h.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        };
      });

      set((state) => {
        const isActive = state.activeChat?.id === sessionId;
        return { 
          messages: isActive ? mappedMessages : state.messages,
          chatMessagesCache: { ...state.chatMessagesCache, [sessionId]: mappedMessages },
          isHistoryLoading: false,
          historyAbortController: null
        };
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.debug("History fetch aborted for session:", sessionId);
      } else {
        console.error("Fetch History Error:", error);
      }
      set({ isHistoryLoading: false, historyAbortController: null });
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
    const { recentChats, fetchSessions, fetchChatHistory, openNewChat, startFocusedSession } = get();
    
    // Handle transient 'new' state on refresh
    if (sessionId === "new") {
      fetchSessions(); // Load history in background
      openNewChat({ name: "Socratic Tutor", agent_id: "eng-grade-4", subject: "General", grade: 10 });
      return;
    }

    // Handle transient 'new-focused' state on refresh by recovering context from sessionStorage
    if (sessionId === "new-focused") {
      fetchSessions(); // Load history in background
      const savedContext = sessionStorage.getItem("pending_focused_session");
      if (savedContext) {
        try {
          const { subject, documentTitle } = JSON.parse(savedContext);
          startFocusedSession(subject, documentTitle);
          return;
        } catch (e) {
          console.error("Failed to recover focused session context");
        }
      }
      // If no context, we can't recover - redirect to home
      window.location.href = "/student";
      return;
    }

    // 1. Try to find in existing list
    let chat = recentChats.find(c => c.id === sessionId);
    
    // 2. If not found, it might be a refresh - fetch sessions
    if (!chat) {
      await fetchSessions();
      chat = get().recentChats.find(c => c.id === sessionId);
    }
    
    // 3. If found now, open it and trigger history
    if (chat) {
      set((state) => ({
        activeChat: chat,
        isChatOpen: true,
        isAITyping: state.typingChatIds.includes(sessionId),
        messages: state.chatMessagesCache[sessionId] || [],
      }));

      // Trigger history fetch if not cached
      if (!get().chatMessagesCache[sessionId]) {
        await fetchChatHistory(sessionId);
      }
    } else {
      console.error("Chat not found even after fetching sessions:", sessionId);
      // Fallback: redirect home if session is invalid
      window.location.href = "/student";
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

    const tempId = "new-focused";
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

    // Save context for refresh recovery
    sessionStorage.setItem("pending_focused_session", JSON.stringify({ subject, documentTitle }));

    set((state) => ({
      activeChat: newSession,
      isChatOpen: true,
      messages: [],
      chatMessagesCache: { ...state.chatMessagesCache, [tempId]: [] },
      isAITyping: false
    }));

    return tempId;
  },

  closeChat: () => {
    const { historyAbortController } = get();
    if (historyAbortController) {
      historyAbortController.abort();
    }
    set({ 
      isChatOpen: false, 
      activeChat: null, 
      messages: [], 
      isAITyping: false,
      isHistoryLoading: false,
      historyAbortController: null
    });
  },

  startVoiceSession: async () => {
    const { activeChat, studentProfile } = get();
    if (!activeChat || !studentProfile) return;

    // Enforce text mode restriction
    if (activeChat.chatMode === "text") return;

    set({ voiceSessionStatus: "connecting" });
    
    // Set chat mode to voice if not already set
    if (!activeChat.chatMode) {
      set((state) => ({
        activeChat: state.activeChat ? { ...state.activeChat, chatMode: "voice" } : null
      }));
    }

    try {
      // Lazy load voice service to avoid SSR issues
      const { voiceService } = await import("@/features/student/services/voiceService");
      
      const sessionId = activeChat.session_id || (activeChat.id !== "new" && activeChat.id !== "new-focused" ? activeChat.id : undefined);

      await voiceService.startSession(studentProfile.user_id, (event: any) => {
        if (event.type === "connected") {
          set({ voiceSessionStatus: "active" });
        } else if (event.type === "disconnected") {
          set({ voiceSessionStatus: "idle" });
        } else if (event.type === "error") {
          set({ voiceSessionStatus: "error" });
        } else if (event.type === "session_id") {
          // Update activeChat with the real session_id from backend
          const { activeChat } = get();
          if (activeChat && (activeChat.id === "new" || activeChat.id === "new-focused")) {
            set((state) => ({
              activeChat: state.activeChat ? { ...state.activeChat, session_id: event.session_id } : null
            }));
          }
        } else if (event.type === "entry_resolved") {
          // Update chat metadata when entry phase completes
          set((state) => ({
            activeChat: state.activeChat ? { 
              ...state.activeChat, 
              subject: event.subject,
              lastTopic: event.chapter
            } : null
          }));
        } else if (event.type === "transcription") {
          // Handle transcription if needed, e.g., show as optimistic user message
          console.debug("Transcription:", event.text);
        }
      });
    } catch (error) {
      console.error("Failed to start voice session:", error);
      set({ voiceSessionStatus: "error" });
    }
  },

  stopVoiceSession: async () => {
    try {
      const { voiceService } = await import("@/features/student/services/voiceService");
      voiceService.stopSession();
    } catch (error) {
      console.error("Failed to stop voice session:", error);
    }
    set({ voiceSessionStatus: "idle" });
  },

  sendMessage: async (text: string) => {
    const { studentProfile, activeChat } = get();
    if (!studentProfile || !activeChat) return;

    // Capture the ID of the chat where the message was sent
    const chatSentFromId = activeChat.id;

    // Enforce voice mode restriction
    if (activeChat.chatMode === "voice") return;

    // Set chat mode to text if not already set
    if (!activeChat.chatMode) {
      set((state) => ({
        activeChat: state.activeChat ? { ...state.activeChat, chatMode: "text" } : null
      }));
    }

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
      const sessionIdToSend = activeChat.session_id || activeChat.id || undefined;
      const isNewSession = !sessionIdToSend || sessionIdToSend === "new" || sessionIdToSend.startsWith("new-") || sessionIdToSend.startsWith("focused-");
      
      console.debug("[Chat] Sending message", {
        session_id: isNewSession ? undefined : sessionIdToSend,
        isFocused: activeChat.isFocused,
        text,
      });

      const isNewFocused = activeChat.isFocused && isNewSession;

      const response = await studentService.sendChatMessage({
        text,
        user_id: studentProfile.user_id,
        // Omit session_id entirely for new focused sessions to match Swagger
        ...(isNewFocused ? {} : { session_id: isNewSession ? undefined : sessionIdToSend }),
        // Omit agent_id for focused sessions to match Swagger
        ...(!activeChat.isFocused && { agent_id: activeChat.agent_id || "eng-grade-4" }),
        subject: activeChat.subject || "English",
        grade: studentProfile.grade || 10,
        // Include focused-only metadata if applicable
        ...(activeChat.isFocused && {
          document_title: activeChat.document_title || "General",
          intent: ""
        })
      });

      if (!response.body) throw new Error("No response body for streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalSessionId: string | undefined;
      let finalOptions: string[] = [];

      // ── Phase 1: Read the ENTIRE stream silently ──────────────────────────
      const planningStatuses: string[] = [];
      const elements: ChatElement[] = [];
      let bufferedText = ""; // Full text for legacy/fallback
      let currentTextBuffer = "";
      let currentToolStatus: string | undefined;

      const pushTextElement = () => {
        if (currentTextBuffer) {
          // Strip any raw tags that might be embedded in the text stream 
          // to prevent them from showing up as raw text in the UI.
          const sanitized = currentTextBuffer.replace(/<<(MATH_DRAW|MATH_WIDGET)\s+[^>]+>>/g, "").trim();
          if (sanitized) {
            elements.push({
              id: Math.random().toString(36).substring(2, 11),
              type: "text",
              content: sanitized,
            });
          }
          currentTextBuffer = "";
        }
      };

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
          } else if (event.type === "tool_status") {
            currentToolStatus = event.message || "Drawing...";
          } else if (event.type === "visual_block" || event.type === "visual_error") {
            pushTextElement();
            const svgContent = event.type === "visual_block" 
              ? event.svg 
              : (event.fallback?.content || event.fallback_text || "[Visual Error]");
            
            elements.push({
              id: Math.random().toString(36).substring(2, 11),
              type: "svg",
              content: svgContent,
              meta: event.meta
            });
            currentToolStatus = undefined;
          } else if (event.type === "math_widget" || event.type === "math_widget_error") {
            pushTextElement();
            elements.push({
              id: Math.random().toString(36).substring(2, 11),
              type: "widget",
              content: event.expression || "",
              meta: { 
                error: event.type === "math_widget_error", 
                message: event.message 
              }
            });
            currentToolStatus = undefined;
          } else if ((event.type === "chunk" || event.type === "chunks") && typeof event.text === "string") {
            currentTextBuffer += event.text;
            bufferedText += event.text;
          } else if (event.type === "done") {
            finalSessionId = event.session_id;
            finalOptions = Array.isArray(event.options) ? event.options : [];
            // If no chunks were received, fall back to the full response text provided in the 'done' event
            if (!bufferedText && typeof event.response === "string" && event.response.trim()) {
              currentTextBuffer = event.response;
              bufferedText = event.response;
            }
          }
        }
      }
      pushTextElement();

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

      // Clear status and reveal the full structured content
      set((state) => {
        const patch = (msgs: ChatMessage[]) =>
          msgs.map(m => m.id === streamingMsgId ? { 
            ...m, 
            statusText: undefined, 
            text: bufferedText.replace(/<<(MATH_DRAW|MATH_WIDGET)\s+[^>]+>>/g, "").trim(),
            elements: elements,
            toolStatus: currentToolStatus
          } : m);
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
          elements: elements,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          options: finalOptions.length > 0 ? finalOptions : undefined,
          statusText: undefined,
          toolStatus: undefined,
        };

        const patchMsg = (msgs: ChatMessage[]) =>
          msgs.map((m) => (m.id === streamingMsgId ? finalisedMsg : m));

        // Update the session in recentChats
        const isPromotingNewChat = chatSentFromId === "new" || chatSentFromId === "new-focused";
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
