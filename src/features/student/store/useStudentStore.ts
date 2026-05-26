import { create } from "zustand";
import { studentService } from "../services/studentService";
import { authFetch, ApiRequestError } from "@/utils/authFetch";
import { parseContent, generateHistoricalSVG, normalizeSvg } from "../utils/parseContent";
import { voiceService } from "../services/voiceService";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

// -- Types --------------------------------------------------------------------

export interface StudentProfile {
  user_id: string;
  username: string;
  email?: string;
  role: string;
  name?: string;
  age?: number;
  grade?: number;
  school_board?: string;
  ai_name?: string;
  preferred_voice?: string;
  plan?: "FREE" | "PRO";
  plan_expires_at?: string | null;
}

export interface ChatElement {
  id: string;
  type: "text" | "svg" | "widget" | "image" | "visual" | "comprehension_widget" | "english_skill_view";
  content: string;
  meta?: {
    // existing visual meta
    engine?: string;
    label?: string;
    code?: string;
    commands?: any[];
    options?: any;
    image?: string;
    figure_id?: string;
    shape?: string;
    params?: any;
    is_historical?: boolean;
    isRawBackendSvg?: boolean;
    error?: boolean;
    message?: string;
    fallback_text?: string;
    // comprehension widget meta (Wave 2 §10)
    widget_type?: "mcq" | "fill_blank" | "retell" | "free_response";
    question?: string;
    choices?: Array<{ id: string; label: string }>;
    allow_retry?: boolean;
    directive_id?: string;
    // difficult word meta
    word?: string;
    syllables?: string[];
    phonetic?: string;
    slow_available?: boolean;
    [key: string]: any;
  };
}

export interface ActivityAction {
  type: "teacher_speak" | "request_reading" | "request_listening" | "request_spelling" | "request_repeat";
  activity_id: string;
  content: string;
  lo_id?: string;
  question?: string;
  words?: string[];
}

export interface ChatMessage {
  id: string;
  text: string;
  elements?: ChatElement[];
  sender: "user" | "ai";
  timestamp: string;
  isPlanning?: boolean;
  options?: string[];
  statusText?: string;
  toolStatus?: string;
  phase?: string;
  actions?: ActivityAction[];
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
  chapter_completion_percentage?: number;
  chapter_name?: string;
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
  is_onboarding_complete?: boolean;
  subject_coverage_percentage?: number;
}

export interface PartnerItem {
  id: string;
  partner_id?: string;
  organization: string;
}

export const AVAILABLE_SUBJECTS: SubjectItem[] = [
  {
    id: "sub-1",
    name: "Quantum Physics",
    grade: "Grade 12",
    icon: "⚛",
    chaptersCount: 12,
  },
  {
    id: "sub-2",
    name: "Medieval History",
    grade: "Grade 10",
    icon: "🏰",
    chaptersCount: 8,
  },
  {
    id: "sub-3",
    name: "Advanced Calculus",
    grade: "Grade 12",
    icon: "∑",
    chaptersCount: 15,
  },
  {
    id: "sub-4",
    name: "Essay Writing",
    grade: "Grade 9–12",
    icon: "✍️",
    chaptersCount: 6,
  },
  {
    id: "sub-5",
    name: "Research Methods",
    grade: "Grade 11",
    icon: "🔍",
    chaptersCount: 5,
  },
  {
    id: "sub-6",
    name: "Computer Science",
    grade: "Grade 10",
    icon: "💻",
    chaptersCount: 10,
  },
  {
    id: "sub-7",
    name: "Biology",
    grade: "Grade 11",
    icon: "🧬",
    chaptersCount: 14,
  },
  {
    id: "sub-8",
    name: "Economics",
    grade: "Grade 12",
    icon: "📊",
    chaptersCount: 9,
  },
  {
    id: "sub-9",
    name: "Chemistry",
    grade: "Grade 11",
    icon: "⚗️",
    chaptersCount: 11,
  },
  {
    id: "sub-10",
    name: "Literature",
    grade: "Grade 10",
    icon: "📖",
    chaptersCount: 7,
  },
];

// parseContent, generateHistoricalSVG, normalizeSvg are imported from ../utils/parseContent

const MAX_CACHED_SESSIONS = 10;

/**
 * Ensures the chat cache doesn't grow indefinitely by evicting the oldest sessions
 */
const manageCacheEviction = (cache: Record<string, ChatMessage[]>, newSessionId: string, newMessages: ChatMessage[]) => {
  const updatedCache = { ...cache, [newSessionId]: newMessages };
  const sessionIds = Object.keys(updatedCache);
  
  if (sessionIds.length > MAX_CACHED_SESSIONS) {
    // Simple FIFO eviction: remove the first key (oldest)
    const oldestSessionId = sessionIds[0];
    // Don't evict the current session we just added
    if (oldestSessionId !== newSessionId) {
      delete updatedCache[oldestSessionId];
    } else if (sessionIds.length > 1) {
      delete updatedCache[sessionIds[1]];
    }
  }
  
  return updatedCache;
};

// -- Store interface ----------------------------------------------------------─

export interface OnboardingSubject {
  subject: string;
  status: "PENDING" | "COMPLETED";
}

export interface OnboardingStatus {
  subjects: OnboardingSubject[];
}

export interface StudentState {
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
  chatAbortController: AbortController | null;
  voiceSessionStatus: "idle" | "connecting" | "active" | "error";
  hasFetchedSessions: boolean;
  hasFetchedAgents: boolean;
  isMuted: boolean;
  isRateLimitHit: boolean;
  rateLimitMessage: string | null;
  activeActivity: ActivityAction | null;
  onboardingStatus: OnboardingStatus | null;
  isOnboardingLoading: boolean;
  studentStats: { currentStreak: number; longestStreak: number; totalSessions: number } | null;
  isStatsLoading: boolean;
  sessionMode: "chat" | "voice" | null;
  voicePrefs: { listenMode: "continuous" | "ptt"; pttHotkey: string; };
  pttHeld: boolean;

  // ── English Skill Mode State (Wave 1–4) ─────────────────────────────────────
  playbackState: "idle" | "loading" | "buffering" | "playing" | "paused" | "stopped" | "completed" | "error";
  recordingState: "idle" | "permission_request" | "ready" | "recording" | "uploading" | "processing" | "completed" | "error";
  /** null = no prompt, 'silence' = auto-stop confirm dialog, 'cap' = duration nudge */
  recordingPrompt: "silence" | "cap" | null;
  recordingError: string | null;
  activeDirectiveId: string | null;
   highlightedWordIndex: number;
  activeSkillDirective: any | null; 
  oralAnalysisResult: any | null;
  comprehensionResults: Record<string, { is_correct: boolean; answer: string }>;

  // Actions
  setStudentProfile: (profile: StudentProfile) => void;
  fetchSessions: () => Promise<void>;
  fetchAvailableAgents: () => Promise<void>;
  fetchStudentStats: () => Promise<void>;
  fetchAvailablePartners: () => Promise<void>;
  fetchEnrolledPartners: () => Promise<void>;
  fetchChatHistory: (sessionId: string) => Promise<void>;
  fetchOnboardingStatus: () => Promise<void>;
  openExistingChat: (chat: ChatSession) => void;
  openChatById: (sessionId: string, agentId?: string) => Promise<void>;
  openNewChat: (agent: AgentItem) => string;
  initNewChat: (agentId: string) => void;
  startFocusedSession: (documentTitle: string, subject: string) => string;
  closeChat: () => void;
  setProfileOpen: (open: boolean) => void;
  setAgentPickerOpen: (open: boolean) => void;
  setRateLimitHit: (hit: boolean) => void;
  setRateLimitMessage: (message: string | null) => void;
  setPartnerModalOpen: (open: boolean) => void;
  stopMessageGeneration: () => void;
  submitActivityResult: (activityId: string, activityType: string, transcript: string) => Promise<void>;
  sendMessage: (text?: string, activityInput?: any) => Promise<void>;
  sendPartnerRequest: (partnerId: string) => Promise<void>;
  linkParent: (parentEmailOrPhone: string) => Promise<void>;
  startVoiceSession: () => Promise<void>;
  stopVoiceSession: () => void;
  toggleMute: () => void;
  logoutStudent: () => void;
  beginPttUtterance: () => void;
  endPttUtterance: () => void;
  openNewSession: (agent: AgentItem, mode: "chat" | "voice") => void;
  initNewVoiceSession: (agentId: string) => void;
  setListenMode: (mode: "continuous" | "ptt") => void;
  setPttHotkey: (key: string) => void;

  // ── English Skill Mode Actions (Wave 1–4) ────────────────────────────────────
  playDirectiveTts: (directiveId: string, timepoints: any[]) => void;
  stopPlayback: () => void;
  startSkillRecording: (directiveId: string, expectedDurationMs?: number) => void;
  stopSkillRecording: () => void;
  dismissRecordingPrompt: () => void;
  confirmStartRecording: () => void;
  reportConversationAction: (type: string, directiveId: string) => Promise<void>;
  submitOralResult: (directiveId: string, gcsUri: string) => Promise<void>;
  submitComprehensionAnswer: (
    directiveId: string,
    interactionType: string,
    answer: string
  ) => Promise<{ is_correct: boolean; id?: string; directive_id?: string; student_response?: string } | null>;
  clearComprehensionResult: (directiveId: string) => void;
  setHighlightedWordIndex: (index: number) => void;
}

// -- Store --------------------------------------------------------------------─

const getInitialVoicePrefs = () => {
  if (typeof window === "undefined") {
    return { listenMode: "continuous" as const, pttHotkey: "Space" };
  }
  try {
    const saved = localStorage.getItem("voice_prefs");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        listenMode: parsed.listenMode === "ptt" ? ("ptt" as const) : ("continuous" as const),
        pttHotkey: parsed.pttHotkey || "Space",
      };
    }
  } catch (e) {
    console.error("Failed to load voice prefs", e);
  }
  return { listenMode: "continuous" as const, pttHotkey: "Space" };
};

export const useStudentStore = create<StudentState>()((set, get) => ({
  studentProfile: null,
  recentChats: [],
  activeChat: null,
  messages: [],
  chatMessagesCache: {},
  typingChatIds: [],
  isChatOpen: false,
  isProfileOpen: false,
  isAgentPickerOpen: false,
  isRateLimitHit: false,
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
  chatAbortController: null,
  voiceSessionStatus: "idle",
  hasFetchedSessions: false,
  hasFetchedAgents: false,
  isMuted: false,
  rateLimitMessage: null,
  onboardingStatus: null,
  isOnboardingLoading: false,
  studentStats: null,
  isStatsLoading: false,
  sessionMode: null,
  voicePrefs: getInitialVoicePrefs(),
  pttHeld: false,
  // English skill mode initial state
  playbackState: "idle",
  recordingState: "idle",
  recordingPrompt: null,
  recordingError: null,
  activeDirectiveId: null,
  highlightedWordIndex: -1,
  activeSkillDirective: null,
  oralAnalysisResult: null,
  comprehensionResults: {},
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
      hasFetchedSessions: false,
      hasFetchedAgents: false,
      sessionMode: null,
      pttHeld: false,
      onboardingStatus: null,
      isRateLimitHit: false,
      rateLimitMessage: null,
      comprehensionResults: {},
    });
    window.location.href = "/";
  },
  activeActivity: null,
  setProfileOpen: (open) => set({ isProfileOpen: open }),
  setAgentPickerOpen: (open) => set({ isAgentPickerOpen: open }),
  setRateLimitHit: (hit) => set({ isRateLimitHit: hit, ...(!hit && { rateLimitMessage: null }) }),
  setRateLimitMessage: (message) => set({ rateLimitMessage: message }),
  setPartnerModalOpen: (open) =>
    set({
      isPartnerModalOpen: open,
      partnerRequestStatus: open ? get().partnerRequestStatus : "idle",
    }),
  stopMessageGeneration: () => {
    const { chatAbortController } = get();
    if (chatAbortController) {
      chatAbortController.abort();
    }
    set({
      chatAbortController: null,
      isAITyping: false,
      streamingMessageId: null,
    });
  },

  fetchOnboardingStatus: async () => {
    const { studentProfile, isOnboardingLoading } = get();
    if (!studentProfile || isOnboardingLoading) return;
    
    set({ isOnboardingLoading: true });
    try {
      const status = await studentService.fetchOnboardingStatus(studentProfile.user_id);
      set({ onboardingStatus: status });
    } catch (error: any) {
      console.error("Failed to fetch onboarding status:", error?.request_id, error?.message ?? error);
    } finally {
      set({ isOnboardingLoading: false });
    }
  },

  fetchStudentStats: async () => {
    const { studentProfile, isStatsLoading } = get();
    if (!studentProfile || isStatsLoading) return;

    set({ isStatsLoading: true });
    try {
      const data = await studentService.fetchStudentStreak(studentProfile.user_id);
      set({
        studentStats: {
          currentStreak: data.current_streak ?? 0,
          longestStreak: data.longest_streak ?? 0,
          totalSessions: data.total_sessions ?? 0,
        },
      });
    } catch (error: any) {
      console.error("Failed to fetch student stats:", error?.request_id, error?.message ?? error);
    } finally {
      set({ isStatsLoading: false });
    }
  },

  submitActivityResult: async (activityId, activityType, transcript) => {
    set({ activeActivity: null });
    await get().sendMessage(undefined, {
      activity_id: activityId,
      activity_type: activityType,
      transcript: transcript
    });
  },

  setStudentProfile: (profile) => set({ studentProfile: profile }),

  fetchSessions: async () => {
    const { studentProfile, isSessionsLoading, hasFetchedSessions } = get();
    if (!studentProfile || isSessionsLoading || hasFetchedSessions) return;

    set({ isSessionsLoading: true });
    try {
      const data = await studentService.fetchSessions(studentProfile.user_id);
      console.log("📂 [StudentStore] Raw Sessions Data:", data);

      const mappedChats: ChatSession[] = data.sessions.map((s: any) => {
        const raw = (s.subject_agent || "").toLowerCase();
        const derivedSubject = raw.includes("math") ? "mathematics"
          : raw.includes("english") ? "english"
          : raw.includes("science") ? "science"
          : raw.includes("hindi") ? "hindi"
          : (s.subject || "");

        return {
          id: s.session_id,
          session_id: s.session_id,
          title: s.title || s.agent_name || "Learning Session",
          agentType: "English Assistant",
          agentIcon: "📖",
          lastActive: s.updated_at || s.created_at || "",
          lastTopic: s.chapter_name || "Continued Learning",
          grade: "",
          agent_id: s.subject_agent,
          subject: derivedSubject,
          chapter_completion_percentage: typeof s.chapter_completion_percentage === "number"
            ? s.chapter_completion_percentage
            : undefined,
          chapter_name: s.chapter_name || "",
        };
      });

      set({ recentChats: mappedChats, isSessionsLoading: false, hasFetchedSessions: true });
    } catch (error: any) {
      console.error("Fetch Sessions Error:", error?.request_id, error?.message ?? error);
      set({ isSessionsLoading: false, hasFetchedSessions: true });
    }
  },

  fetchAvailableAgents: async () => {
    const { studentProfile, isAgentsLoading, hasFetchedAgents } = get();
    if (!studentProfile || isAgentsLoading || hasFetchedAgents) return;

    set({ isAgentsLoading: true });
    try {
      const data = await studentService.fetchAvailableAgents(
        studentProfile.user_id,
      );

      // Flatten the nested structure: data.partners[].subjects[].agents[]
      const agents: AgentItem[] = [];
      if (data.partners && Array.isArray(data.partners)) {
        data.partners.forEach((partner: any) => {
          if (partner.subjects && Array.isArray(partner.subjects)) {
            partner.subjects.forEach((subject: any) => {
              if (subject.agents && Array.isArray(subject.agents)) {
                subject.agents.forEach((agent: any) => {
                  agents.push({
                    ...agent,
                    is_onboarding_complete: subject.is_onboarding_complete,
                    subject_coverage_percentage:
                      typeof subject.subject_coverage_percentage === "number"
                        ? subject.subject_coverage_percentage
                        : undefined,
                  });
                });
              }
            });
          }
        });
      }

      set({ availableAgents: agents, isAgentsLoading: false, hasFetchedAgents: true });
    } catch (error: any) {
      console.error("Fetch Agents Error:", error?.request_id, error?.message ?? error);
      set({ availableAgents: [], isAgentsLoading: false, hasFetchedAgents: false });
    }
  },

  fetchAvailablePartners: async () => {
    try {
      const data: PartnerItem[] = await studentService.fetchAvailablePartners();
      set({ availablePartners: data });
    } catch (error: any) {
      console.error("Fetch Partners Error:", error?.request_id, error?.message ?? error);
    }
  },

  fetchEnrolledPartners: async () => {
    const { studentProfile } = get();
    if (!studentProfile) return;

    set({ isEnrolledPartnersLoading: true });
    try {
      const data = await studentService.fetchEnrolledPartners(
        studentProfile.user_id,
      );
      set({
        enrolledPartners: data.partners || [],
        isEnrolledPartnersLoading: false,
      });
    } catch (error: any) {
      console.error("Fetch Enrolled Partners Error:", error?.request_id, error?.message ?? error);
      set({ isEnrolledPartnersLoading: false });
    }
  },

  sendPartnerRequest: async (partnerId: string) => {
    const { studentProfile } = get();
    if (!studentProfile?.user_id) {
      set({
        isPartnerModalOpen: true,
        partnerRequestStatus: "error",
        partnerRequestMessage: "Student profile not found.",
      });
      return;
    }

    set({
      isPartnerModalOpen: true,
      partnerRequestStatus: "loading",
      partnerRequestMessage: "Sending request...",
    });

    try {
      const data = await studentService.sendPartnerRequest(
        studentProfile.user_id,
        partnerId,
      );
      const message =
        data.message ||
        data.organization ||
        "Successfully enrolled in partner module.";

      set({
        partnerRequestStatus: "success",
        partnerRequestMessage: String(message),
      });

      // Refresh the enrolled partners list so the UI reflects the new connection
      await get().fetchEnrolledPartners();
    } catch (error: any) {
      console.error("Partner Request Error:", error?.request_id, error?.message ?? error);
      set({
        partnerRequestStatus: "error",
        partnerRequestMessage: error?.message || "Failed to send partner request. Please try again.",
      });
    }
  },

  linkParent: async (parentEmailOrPhone: string) => {
    const { studentProfile } = get();
    if (!studentProfile?.user_id) {
      set({
        isPartnerModalOpen: true,
        partnerRequestStatus: "error",
        partnerRequestMessage: "Student profile not found.",
      });
      return;
    }

    set({
      isPartnerModalOpen: true,
      partnerRequestStatus: "loading",
      partnerRequestMessage: "Linking parent profile...",
    });

    try {
      await studentService.linkParent(
        studentProfile.user_id,
        parentEmailOrPhone,
      );
      set({
        partnerRequestStatus: "success",
        partnerRequestMessage: "Parent successfully linked to your profile.",
      });
    } catch (error: any) {
      console.error("Link Parent Error:", error?.request_id, error?.message ?? error);
      set({
        partnerRequestStatus: "error",
        partnerRequestMessage: error?.message || "Failed to link parent. Please check the ID and try again.",
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

      const data = await response.json();

      // Extract subject from history if activeChat is missing it or has "General"
      const historySubject = data.history?.[0]?.meta_data?.subject;

      const mappedMessages: ChatMessage[] = (data.history || []).map(
        (h: any, i: number) => {
          const content = h.content || "";
          const elements = parseContent(content);

          return {
            id: `h-${i}-${Date.now()}`,
            text: content.replace(/(?:<<|<)(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE|SPEAK_PARA|DIFFICULT_WORD|READ_ALOUD|LISTEN_COMPREHENSION|SHOW_FIGURE_DESCRIBE|KARAOKE)[\s\S]*?(?:>>|>)/g, "").replace(/<svg[\s\S]*?<\/svg>/g, "").trim(),
            elements:
              elements.length > 1 ||
              (elements.length === 1 && elements[0].type !== "text")
                ? elements
                : undefined,
            sender: h.role === "user" ? "user" : "ai",
            timestamp: h.created_at
              ? new Date(h.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            actions: h.meta_data?.actions || undefined,
          };
        },
      );

      set((state) => {
        const isActive = state.activeChat?.id === sessionId;
        const activeChat = state.activeChat;
        
        // Recover subject from history if current state is generic or missing
        let updatedActiveChat = activeChat;
        if (isActive && activeChat && historySubject && (!activeChat.subject || activeChat.subject === "General")) {
          updatedActiveChat = { ...activeChat, subject: historySubject };
        }

        return {
          activeChat: updatedActiveChat,
          messages: isActive ? mappedMessages : state.messages,
          chatMessagesCache: manageCacheEviction(state.chatMessagesCache, sessionId, mappedMessages),
          isHistoryLoading: false,
          historyAbortController: null,
        };
      });
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.debug("History fetch aborted for session:", sessionId);
      } else {
        console.error("Fetch History Error:", error?.request_id, error?.message ?? error);
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

  openChatById: async (sessionId, agentId) => {
    const {
      recentChats,
      fetchSessions,
      fetchChatHistory,
      openNewChat,
      startFocusedSession,
    } = get();

    // Handle transient 'new' state on refresh
    if (sessionId === "new") {
      fetchSessions(); // Load history in background
      const profile = get().studentProfile;
      const agents = get().availableAgents;
      
      // 1. Try to find the specific agent requested in URL
      // 2. Otherwise try to find an agent for the student's grade
      // 3. Fallback to first available
      const targetAgent = (agentId ? agents.find(a => a.agent_id === agentId) : null) || 
                          agents.find(a => a.grade === profile?.grade) || 
                          agents[0];

      if (targetAgent) {
        openNewChat(targetAgent);
      } else {
        // Absolute fallback only if no agents are loaded yet
        openNewChat({
          name: "Socratic Tutor",
          agent_id: agentId || "eng-grade-4",
          subject: "",
          grade: profile?.grade || 4,
        });
      }
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
        } catch {
          console.error("Failed to recover focused session context");
        }
      }
      // If no context, we can't recover - redirect to home
      window.location.href = "/student";
      return;
    }

    // 1. Try to find in existing list
    let chat = recentChats.find((c) => c.id === sessionId);

    // 2. If not found, it might be a refresh - fetch sessions
    if (!chat) {
      await fetchSessions();
      chat = get().recentChats.find((c) => c.id === sessionId);
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
    } else if (!get().isSessionsLoading && get().hasFetchedSessions) {
      console.error("Chat not found even after fetching sessions:", sessionId);
      // Fallback: redirect home only if we are SURE it's not there
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
    const agent = availableAgents.find((a) => a.agent_id === agentId);

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
    const matchingAgent = availableAgents.find(
      (a) => a.subject.toLowerCase() === subject.toLowerCase(),
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
      grade: studentProfile?.grade
        ? `Grade ${studentProfile.grade}`
        : "General",
      agent_id: matchingAgent?.agent_id || "eng-grade-4", // Fallback
      isFocused: true,
      document_title: documentTitle,
      subject: subject,
    };

    // Navigation to /student/chat is handled by the calling component via router.push

    // Save context for refresh recovery
    sessionStorage.setItem(
      "pending_focused_session",
      JSON.stringify({ subject, documentTitle }),
    );

    set((state) => ({
      activeChat: newSession,
      isChatOpen: true,
      messages: [],
      chatMessagesCache: { ...state.chatMessagesCache, [tempId]: [] },
      isAITyping: false,
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
      historyAbortController: null,
    });
  },

  startVoiceSession: async () => {
    const { activeChat, studentProfile, voicePrefs } = get();
    if (!studentProfile) return;

    // Handle Hub start
    const isHubStart = !activeChat;
    const effectiveChat: ChatSession = activeChat || {
      id: "new",
      title: "New Session",
      subject: "General",
      agent_id: undefined,
      isFocused: false,
      agentType: "General Assistant",
      agentIcon: "🤖",
      lastActive: "Just now",
      lastTopic: "Continued Learning",
      chatMode: "voice"
    };

    // Force transition from Hub to Chat view immediately
    if (isHubStart) {
      set({ activeChat: { ...effectiveChat, chatMode: "voice" } });
    }

    console.log("🎙️ [StudentStore] Starting Voice Session for Chat:", effectiveChat);
    set({ voiceSessionStatus: "connecting", isRateLimitHit: false, rateLimitMessage: null });

    // Ensure chat mode is voice
    if (activeChat) {
      set((state) => ({
        activeChat: state.activeChat
          ? { ...state.activeChat, chatMode: "voice" }
          : null,
      }));
    }

    // Reset mute state on new session based on listenMode
    const isPtt = voicePrefs.listenMode === "ptt";
    set({ isMuted: isPtt, pttHeld: false });

    try {
      // Initialize the mute state in voiceService as well
      voiceService.setMuted(isPtt);

      await voiceService.startSession(
        studentProfile.user_id,
        (event: any) => {
        if (event.type === "connected") {
          set({ voiceSessionStatus: "active" });
        } else if (event.type === "disconnected") {
          set({ voiceSessionStatus: "idle" });
        } else if (event.type === "error") {
          if (event.error === "rate_limit_exceeded") {
            set({ 
              voiceSessionStatus: "error",
              isRateLimitHit: true,
              rateLimitMessage: "Daily limit reached. Please upgrade to Pro for more."
            });
          } else {
            set({ voiceSessionStatus: "error" });
          }
        } else if (event.type === "session_id") {
          // Update activeChat with the real session_id from backend
          const { activeChat, fetchSessions } = get();
          if (
            activeChat &&
            (activeChat.id === "new" || activeChat.id === "new-focused")
          ) {
            const newSessionId = event.session_id;

            // 1. Update the store
            set((state) => ({
              activeChat: state.activeChat
                ? { ...state.activeChat, session_id: newSessionId }
                : null,
            }));

            // 2. Update the URL
            window.history.pushState(
              {},
              "",
              `/student?session=${newSessionId}`,
            );

            // 3. Refresh sidebar to show the new chat
            fetchSessions();
          }
        } else if (event.type === "entry_resolved") {
          // Update chat metadata when entry phase completes
          set((state) => ({
            activeChat: state.activeChat
              ? {
                  ...state.activeChat,
                  subject: event.subject,
                  lastTopic: event.chapter,
                }
              : null,
          }));
        } else if (event.type === "planning") {
          const { text } = event;
          set((state) => {
            const lastMsg = state.messages[state.messages.length - 1];
            const isContinuingPlanning = 
              lastMsg && 
              lastMsg.sender === "ai" && 
              lastMsg.isPlanning && 
              state.streamingMessageId === lastMsg.id;

            let updatedMessages = [...state.messages];
            let newId = state.streamingMessageId;

            if (isContinuingPlanning) {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                text: text || "Thinking...",
              };
            } else {
              newId = `planning-${Date.now()}`;
              updatedMessages.push({
                id: newId,
                text: text || "Thinking...",
                sender: "ai",
                isPlanning: true,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              });
            }

            return {
              messages: updatedMessages,
              streamingMessageId: newId,
              isAITyping: true,
            };
          });
        } else if (event.type === "turn_complete") {
          set({ isAITyping: false, streamingMessageId: null });
        } else if (event.type === "status") {
          if (event.phase !== "teaching") {
            set({ isAITyping: false });
          }
        } else if (event.type === "tool_status") {
          set((state) => {
            const updatedMessages = [...state.messages];
            let lastMsg = updatedMessages[updatedMessages.length - 1];
            let newStreamingId = state.streamingMessageId;
            
            if (!lastMsg || lastMsg.sender === "user") {
              const newId = `voice-tool-${Date.now()}`;
              lastMsg = {
                id: newId,
                text: "",
                sender: "ai",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                toolStatus: event.message
              };
              updatedMessages.push(lastMsg);
              newStreamingId = newId;
            } else {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                toolStatus: event.message
              };
            }
            return { messages: updatedMessages, isAITyping: true, streamingMessageId: newStreamingId };
          });
        } else if (event.type === "visual_block" || event.type === "visual_error") {
          set((state) => {
            const updatedMessages = [...state.messages];
            let lastMsgIdx = updatedMessages.length - 1;
            let lastMsg = updatedMessages[lastMsgIdx];
            let newStreamingId = state.streamingMessageId;

            if (!lastMsg || lastMsg.sender === "user") {
              const newId = `voice-visual-${Date.now()}`;
              lastMsg = {
                id: newId,
                text: "",
                sender: "ai",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };
              updatedMessages.push(lastMsg);
              lastMsgIdx = updatedMessages.length - 1;
              newStreamingId = newId;
            }

            if (lastMsgIdx >= 0) {
              const elements = lastMsg.elements ? [...lastMsg.elements] : [
                ...(lastMsg.text ? [{ id: Date.now().toString() + "-text", type: "text" as const, content: lastMsg.text }] : [])
              ];
              
              if (event.type === "visual_error") {
                elements.push({
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
              } else {
                const engine = event.engine || event.meta?.engine || "p5sketch";
                elements.push({
                  id: `visual-${Date.now()}-${elements.length}`,
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
              }

              updatedMessages[lastMsgIdx] = {
                ...lastMsg,
                elements,
                toolStatus: undefined
              };
            }
            return { messages: updatedMessages, streamingMessageId: newStreamingId };
          });
        } else if (event.type === "math_widget" || event.type === "math_widget_error") {
          set((state) => {
            const updatedMessages = [...state.messages];
            let lastMsgIdx = updatedMessages.length - 1;
            let lastMsg = updatedMessages[lastMsgIdx];
            let newStreamingId = state.streamingMessageId;

            if (!lastMsg || lastMsg.sender === "user") {
              const newId = `voice-math-${Date.now()}`;
              lastMsg = {
                id: newId,
                text: "",
                sender: "ai",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };
              updatedMessages.push(lastMsg);
              lastMsgIdx = updatedMessages.length - 1;
              newStreamingId = newId;
            }

            if (lastMsgIdx >= 0) {
              const elements = lastMsg.elements ? [...lastMsg.elements] : [
                ...(lastMsg.text ? [{ id: Date.now().toString() + "-text", type: "text" as const, content: lastMsg.text }] : [])
              ];
              
              if (event.type === "math_widget_error") {
                elements.push({
                  id: `math-error-${Date.now()}`,
                  type: "text",
                  content: event.fallback_text || "[Math Widget Error]",
                });
              } else {
                elements.push({
                  id: `visual-${Date.now()}-${elements.length}`,
                  type: "visual",
                  content: "desmos",
                  meta: {
                    engine: "desmos",
                    label: "Graph",
                    options: { expression: event.expression, ...event.options }
                  }
                });
              }

              updatedMessages[lastMsgIdx] = {
                ...lastMsg,
                elements,
                toolStatus: undefined
              };
            }
            return { messages: updatedMessages, streamingMessageId: newStreamingId };
          });
        }
        },
        (content, role) => {
          const { activeChat } = get();
          if (!activeChat) return;

          set((state) => {
            const lastMsg = state.messages[state.messages.length - 1];
            const sender = role === "user" ? "user" : "ai";
            
            // Check if we are continuing a message or replacing a planning message
            const isContinuing = 
              lastMsg && 
              lastMsg.sender === sender && 
              state.streamingMessageId === lastMsg.id;
            
            const isReplacingPlanning = 
              lastMsg && 
              lastMsg.sender === "ai" && 
              lastMsg.isPlanning &&
              state.streamingMessageId === lastMsg.id;

            let updatedMessages = [...state.messages];
            let newId = state.streamingMessageId;

            if (isContinuing) {
              const newText = isReplacingPlanning ? content : lastMsg.text + (role === "user" ? " " : "") + content;
              const updated: ChatMessage = {
                ...lastMsg,
                text: newText,
                isPlanning: false
              };

              // If the message already has elements (e.g. from a visual_block),
              // keep the SVG/widget elements and update the trailing text element
              if (updated.elements && updated.elements.length > 0) {
                const existingTextIdx = updated.elements.findIndex(
                  (el) => el.type === "text" && el.id.endsWith("-transcript")
                );
                if (existingTextIdx >= 0) {
                  updated.elements = [...updated.elements];
                  updated.elements[existingTextIdx] = {
                    ...updated.elements[existingTextIdx],
                    content: newText
                  };
                } else {
                  updated.elements = [
                    ...updated.elements,
                    { id: Date.now().toString() + "-transcript", type: "text" as const, content: newText }
                  ];
                }
              }

              updatedMessages[updatedMessages.length - 1] = updated;
            } else {
              newId = `voice-${Date.now()}`;
              updatedMessages.push({
                id: newId,
                text: content,
                sender,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              });
            }

            return {
              messages: updatedMessages,
              streamingMessageId: newId,
              isAITyping: role === "assistant"
            };
          });
        },
        effectiveChat.session_id,
        effectiveChat.subject,
        undefined,
        studentProfile.preferred_voice
      );
    } catch (error) {
      console.error("Failed to start voice session:", error);
      set({ voiceSessionStatus: "error" });
    }
  },

  stopVoiceSession: () => {
    try {
      voiceService.stopSession();
    } catch (error) {
      console.error("Failed to stop voice session:", error);
    }
    set({ voiceSessionStatus: "idle", isMuted: false, pttHeld: false });
  },

  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    
    try {
      voiceService.setMuted(newMutedState);
      set({ isMuted: newMutedState });
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  },

  beginPttUtterance: () => {
    set({ pttHeld: true });
    voiceService.setMuted(false);
  },

  endPttUtterance: () => {
    set({ pttHeld: false });
    voiceService.setMuted(true);
  },

  openNewSession: (agent: AgentItem, mode: "chat" | "voice") => {
    set({ sessionMode: mode });
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
      chatMode: mode === "chat" ? "text" : "voice",
    };
    set((state) => ({
      activeChat: newSession,
      messages: [],
      chatMessagesCache: { ...state.chatMessagesCache, ["new"]: [] },
      isChatOpen: true,
      isAgentPickerOpen: false,
      isAITyping: false,
    }));
  },

  initNewVoiceSession: (agentId: string) => {
    const { availableAgents } = get();
    const agent = availableAgents.find((a) => a.agent_id === agentId);
    if (agent) {
      set({ sessionMode: "voice" });
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
        chatMode: "voice",
      };
      set({ activeChat: newSession, isChatOpen: true });
    }
  },

  setListenMode: (mode) => {
    set((state) => {
      const newPrefs = { ...state.voicePrefs, listenMode: mode };
      if (typeof window !== "undefined") {
        localStorage.setItem("voice_prefs", JSON.stringify(newPrefs));
      }
      // If we switch to Continuous, start unmuted; if we switch to PTT, start muted
      const isPtt = mode === "ptt";
      voiceService.setMuted(isPtt);
      return { voicePrefs: newPrefs, isMuted: isPtt, pttHeld: false };
    });
  },

  setPttHotkey: (key) => {
    set((state) => {
      const newPrefs = { ...state.voicePrefs, pttHotkey: key };
      if (typeof window !== "undefined") {
        localStorage.setItem("voice_prefs", JSON.stringify(newPrefs));
      }
      return { voicePrefs: newPrefs };
    });
  },

  // ── English Skill Mode Actions ─────────────────────────────────────────────

  setHighlightedWordIndex: (index) => set({ highlightedWordIndex: index }),

  /** Trigger TTS playback for a directive (called from SSE tts_start handler) */
  playDirectiveTts: (directiveId, timepoints) => {
    set({ activeDirectiveId: directiveId, playbackState: "loading", highlightedWordIndex: -1 });
    // Lazy-import to avoid SSR issues with AudioContext
    import("@/features/student/services/audioPlayerService").then(({ audioPlayerService }) => {
      audioPlayerService.play(directiveId, timepoints, {
        onStateChange: (state) => set({ playbackState: state }),
        onTimeUpdate: (_time, wordIndex) => set({ highlightedWordIndex: wordIndex }),
        onComplete: (dId) => {
          // Report playback_complete to backend (Wave 1 §7.1)
          const { activeChat } = get();
          const sessionId = activeChat?.session_id || activeChat?.id;
          if (sessionId && sessionId !== "new") {
            get().reportConversationAction("playback_complete", dId);
          }
          set({ activeDirectiveId: null, highlightedWordIndex: -1 });
        },
        onError: (_dId, msg) => {
          // Wave 4: graceful degradation — log, never crash
          console.warn("[TTS]", msg);
          set({ playbackState: "idle" });
        },
      });
    });
  },

  /** Stop any active TTS playback */
  stopPlayback: () => {
    import("@/features/student/services/audioPlayerService").then(({ audioPlayerService }) => {
      audioPlayerService.stop();
    });
    set({ playbackState: "idle", activeDirectiveId: null, highlightedWordIndex: -1 });
  },

  /** Prepare for recording — opens the modal but doesn't activate mic yet (Wave 2 §9) */
  startSkillRecording: (directiveId, expectedDurationMs = 15000) => {
    const { recordingState, activeDirectiveId } = get();
    if (recordingState !== "idle" && recordingState !== "completed" && recordingState !== "error") {
      if (activeDirectiveId === directiveId) return;
    }

    set({ 
      activeDirectiveId: directiveId, 
      recordingState: "ready", 
      recordingPrompt: null,
      recordingError: null
    });
  },

  /** Actual mic activation triggered by user in the modal */
  confirmStartRecording: () => {
    const { activeDirectiveId, activeChat, studentProfile, recordingState } = get();
    if (!activeDirectiveId) return;
    
    // Guard: Don't start if already in progress
    if (recordingState === "permission_request" || recordingState === "recording") {
      console.warn("[Recording] Already starting or recording, ignoring click");
      return;
    }

    console.log("[Recording] confirmStartRecording triggered", { activeDirectiveId, currentState: recordingState });
    set({ recordingState: "permission_request" });
    
    import("@/features/student/services/audioRecorderService").then(({ audioRecorderService }) => {
      const sessionId = activeChat?.session_id || activeChat?.id || "";
      const studentId = studentProfile?.user_id || "";
      
      audioRecorderService.start(activeDirectiveId, sessionId, studentId, {
        onStateChange: (state) => {
          set({ recordingState: state });
          if (state === "recording") {
            // Fixed-speed frontend text timing is disabled. Highlight speed is guided solely by backend read-aloud timepoints.
          }
        },
        onSilenceDetected: () => {
          set({ recordingPrompt: "silence" });
          // We can also report the action if we want, but UI confirm is primary now
          const sId = get().activeChat?.session_id || get().activeChat?.id;
          if (sId && sId !== "new") {
            get().reportConversationAction("silence_detected", activeDirectiveId);
          }
        },
        onDurationCap: () => {
          set({ recordingPrompt: "cap" });
        },
        onUploadComplete: (gcsUri, dId) => {
          get().submitOralResult(dId, gcsUri);
        },
        onError: (msg) => {
          console.warn("[Recording]", msg);
          set({ recordingError: msg });
          // Don't set to idle; let the error state persist so the modal shows the error UI
        },
      });
    });
  },

  /** Stop active recording */
  stopSkillRecording: () => {
    const { activeSkillDirective, activeChat } = get();
    if (activeSkillDirective?.type === "KARAOKE") {
      const sessionId = activeChat?.session_id || activeChat?.id;
      if (sessionId && sessionId !== "new") {
        get().reportConversationAction("playback_complete", activeSkillDirective.directive_id);
      }
    }

    import("@/features/student/services/audioRecorderService").then(({ audioRecorderService }) => {
      audioRecorderService.stop();
    });
    set({ 
      recordingState: "idle", 
      recordingPrompt: null,
      recordingError: null,
      oralAnalysisResult: null
    });
  },

  dismissRecordingPrompt: () => {
    set({ recordingPrompt: null });
  },

  /** POST /session/{id}/conversation-action (fire-and-forget) */
  reportConversationAction: async (type, directiveId) => {
    const { activeChat } = get();
    const sessionId = activeChat?.session_id || activeChat?.id;
    if (!sessionId || sessionId === "new") return;
    try {
      await studentService.reportConversationAction(
        sessionId,
        type as any,
        directiveId
      );
    } catch {
      // Fire-and-forget — never surface to student
    }
  },

  /** POST /session/{id}/oral-result after GCS upload */
  submitOralResult: async (directiveId, gcsUri) => {
    const { activeChat } = get();
    const sessionId = activeChat?.session_id || activeChat?.id;
    if (!sessionId || sessionId === "new") return;

    set({ recordingState: "processing", oralAnalysisResult: null });

    try {
      const result = await studentService.submitOralResult(sessionId, directiveId, gcsUri);
      set({ 
        recordingState: "completed",
        oralAnalysisResult: result 
      });
    } catch (err) {
      console.warn("[OralResult] submission failed:", err);
      set({ 
        recordingState: "error", 
        recordingError: "Failed to analyze your reading. Please try again." 
      });
    }
  },

  /** POST /session/{id}/comprehension-answer */
  submitComprehensionAnswer: async (directiveId, interactionType, answer) => {
    const { activeChat } = get();
    const sessionId = activeChat?.session_id || activeChat?.id;
    if (!sessionId || sessionId === "new") return null;
    try {
      const result = await studentService.submitComprehensionAnswer(
        sessionId,
        directiveId,
        interactionType as any,
        answer
      );
      if (result) {
        set((state) => ({
          comprehensionResults: {
            ...state.comprehensionResults,
            [directiveId]: {
              is_correct: result.is_correct,
              answer: answer
            }
          }
        }));
      }
      return result;
    } catch (err) {
      console.warn("[ComprehensionAnswer] submission failed:", err);
      return null;
    }
  },

  clearComprehensionResult: (directiveId) => {
    set((state) => {
      const newResults = { ...state.comprehensionResults };
      delete newResults[directiveId];
      return { comprehensionResults: newResults };
    });
  },

  sendMessage: async (text?: string, activityInput?: any): Promise<void> => {
    const { studentProfile, activeChat } = get();
    if (!studentProfile) return;

    // Handle Hub messaging (activeChat is null) or specific new chats
    const isHubMessage = !activeChat;
    const profile = get().studentProfile;
    
    // If it's a Hub message, try to find a sensible default agent for the student
    const defaultAgent = get().availableAgents.find(a => a.grade === profile?.grade) || get().availableAgents[0];

    const effectiveChat: ChatSession = activeChat || {
      id: "new",
      title: defaultAgent?.name || "New Session",
      subject: defaultAgent?.subject,
      agent_id: defaultAgent?.agent_id,
      isFocused: false,
      agentType: "General Assistant",
      agentIcon: "🤖",
      lastActive: "Just now",
      lastTopic: "Continued Learning",
      chatMode: "text"
    };

    // Capture the ID of the chat where the message was sent
    const chatSentFromId = effectiveChat.id;

    // Force transition from Hub to Chat view immediately
    if (isHubMessage) {
      set({ activeChat: { ...effectiveChat, chatMode: "text" } });
    }

    // Enforce voice mode restriction
    if (effectiveChat.chatMode === "voice") return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: text !== undefined ? text : (activityInput?.transcript || "Completing activity..."),
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Insert user message + streaming AI placeholder immediately
    const streamingMsgId = `streaming-${Date.now()}`;
    const streamingPlaceholder: ChatMessage = {
      id: streamingMsgId,
      text: "",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    set((state) => {
      const currentMessages =
        state.chatMessagesCache[chatSentFromId] || state.messages;
      const newMessages = [...currentMessages, userMsg, streamingPlaceholder];

      return {
        // Atomic update: ensure activeChat is set if it was null (Hub message)
        activeChat: state.activeChat 
          ? (state.activeChat.chatMode ? state.activeChat : { ...state.activeChat, chatMode: "text" })
          : { ...effectiveChat, chatMode: "text" },
        messages:
          (state.activeChat?.id === chatSentFromId || isHubMessage)
            ? newMessages
            : state.messages,
        chatMessagesCache: {
          ...state.chatMessagesCache,
          [chatSentFromId]: newMessages,
        },
        typingChatIds: [...state.typingChatIds, chatSentFromId],
        isAITyping:
          (state.activeChat?.id === chatSentFromId || isHubMessage) ? true : state.isAITyping,
        streamingMessageId: streamingMsgId,
      };
    });

    try {
      const sessionIdToSend =
        effectiveChat.session_id || (effectiveChat.id === "new" ? undefined : effectiveChat.id);
      const isNewSession =
        !sessionIdToSend ||
        sessionIdToSend === "new" ||
        sessionIdToSend.startsWith("new-") ||
        sessionIdToSend.startsWith("focused-");

      console.debug("[Chat] Sending message", {
        session_id: isNewSession ? undefined : sessionIdToSend,
        isFocused: effectiveChat.isFocused,
        text,
      });

      const isNewFocused = effectiveChat.isFocused && isNewSession;
      const abortController = new AbortController();
      set({ chatAbortController: abortController });

      const response = await studentService.sendChatMessage(
        {
          text,
          user_id: studentProfile.user_id,
          grade: studentProfile.grade,
          activity_input: activityInput,
          // Send session/agent/subject info
          ...(sessionIdToSend && !isNewFocused && { session_id: sessionIdToSend }),
          ...(!effectiveChat.isFocused && effectiveChat.agent_id && { agent_id: effectiveChat.agent_id }),
          ...(effectiveChat.subject && { subject: effectiveChat.subject }),
          ...(effectiveChat.isFocused && {
            document_title: effectiveChat.document_title || "General",
            intent: "",
          }),
        } as any,
        abortController.signal,
      );

      if (!response.body) throw new Error("No response body for streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalSessionId: string | undefined;
      let finalOptions: string[] = [];
      let finalActions: ActivityAction[] = [];
      let streamErrorMessage = "";
      let isStreamError = false;

      // -- Reactive Streaming State -------------------------------------------
      let isPlanningUIPresented = false;
      let streamDone = false;
      const planningQueue: Array<{ text: string; phase?: string }> = [];
      const bufferedEvents: any[] = [];
      const elements: ChatElement[] = [];
      let bufferedText = "";
      let currentTextBuffer = "";
      let currentToolStatus: string | undefined;
      let currentStatusText: string | undefined = "Processing...";
      let currentPhase: string | undefined = "understanding";
      let doneResponse = ""; // Stores the full response from the done event for post-stream SVG upgrade

      const updateUI = (text: string, els: ChatElement[], toolStatus?: string, statusText?: string, phase?: string) => {
        // Create a transient display list that includes the current buffer tail
        // this ensures words appearing after a visual block are visible immediately
        const displayElements = [...els];
        const tags = /(?:<<VISUAL[\s\S]*?<<?\/VISUAL>>?)|(?:<<VISUAL[\s\S]*?\/>>?)|(?:<<(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE)[\s\S]*?(?:>>|>|$))|(<svg[\s\S]*?<\/svg>)/g;
        const tailText = currentTextBuffer.replace(tags, "").trim();
        
        if (tailText) {
          displayElements.push({
            id: `stream-tail-${Date.now()}`,
            type: "text",
            content: tailText
          });
        }

        set((state) => {
          const patch = (msgs: ChatMessage[]) =>
            msgs.map((m) =>
              m.id === streamingMsgId 
                ? { 
                    ...m, 
                    text: text.replace(tags, "").trim(),
                    elements: displayElements.length > 0 ? displayElements : undefined,
                    toolStatus,
                    statusText: statusText !== undefined ? statusText : currentStatusText,
                    phase: phase !== undefined ? phase : currentPhase
                  } 
                : m
            );
          return {
            messages: state.activeChat?.id === chatSentFromId ? patch(state.messages) : state.messages,
            chatMessagesCache: {
              ...state.chatMessagesCache,
              [chatSentFromId]: patch(state.chatMessagesCache[chatSentFromId] || []),
            },
          };
        });
      };

      const pushTextElement = (textOverride?: string) => {
        const textToParse = textOverride !== undefined ? textOverride : currentTextBuffer;
        if (textToParse) {
          const parsed = parseContent(textToParse);
          if (parsed.length > 0) {
            parsed.forEach((newEl) => {
              // If we're adding a native SVG, check if we can replace a recent backend-provided placeholder
              if (newEl.type === "svg" && newEl.meta?.shape) {
                const lastIdx = elements.length - 1;
                const lastEl = lastIdx >= 0 ? elements[lastIdx] : null;

                if (
                  lastEl &&
                  lastEl.type === "svg" &&
                  lastEl.meta?.shape === newEl.meta.shape
                ) {
                  // Upgrade the existing element in place
                  elements[lastIdx] = newEl;
                } else {
                  elements.push(newEl);
                }
              } else {
                elements.push(newEl);
              }
            });
          }
          if (textOverride === undefined) currentTextBuffer = "";
        }
      };

      const handleEvent = (event: any) => {
        if (event.type === "planning") {
          const status = event.text || event.message || "";
          const phase = event.phase || "thinking";
          if (status && !planningQueue.some(item => item.text === status)) {
            planningQueue.push({ text: status, phase });
          }
        } else if (event.type === "error") {
          // Mid-stream error from backend (e.g. CORE_2010)
          console.error("Stream error:", event.error_code, event.message);
          // The done event follows immediately after, which triggers finalization.
          // Store the error message so the done handler can use it.
          streamErrorMessage = event.message || "Something went wrong.";
          isStreamError = true;
        } else if (event.type === "tool_status") {
          currentToolStatus = event.message || "Drawing...";
          if (isPlanningUIPresented) updateUI(bufferedText, elements, currentToolStatus);
        } else if (event.type === "visual_block" || event.type === "visual_error") {
          pushTextElement(currentTextBuffer);
          currentTextBuffer = "";
          
          if (event.type === "visual_error") {
            elements.push({
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
          } else {
            const engine = event.engine || event.meta?.engine || "p5sketch";
            const label = event.label || "Visual";
            
            // Deduplication: If we already have a visual from the text stream with the same label/engine, skip this
            const isDuplicate = elements.some(el => 
              el.type === "visual" && 
              el.meta?.engine === engine && 
              el.meta?.label === label
            );

            if (!isDuplicate) {
              elements.push({
                id: `visual-${Date.now()}-${elements.length}`,
                type: "visual",
                content: engine,
                meta: {
                  engine,
                  label,
                  code: event.code,
                  commands: event.commands,
                  image: event.image,
                  options: event.options,
                  meta: event.meta
                }
              });
            }
          }
          currentToolStatus = undefined;
          if (isPlanningUIPresented) updateUI(bufferedText, elements);
          currentToolStatus = undefined;
          if (isPlanningUIPresented) updateUI(bufferedText, elements);
        } else if (event.type === "math_widget" || event.type === "math_widget_error") {
          pushTextElement(currentTextBuffer);
          currentTextBuffer = "";
          elements.push({
            id: `stream-el-${elements.length}`,
            type: "widget",
            content: event.expression || "",
            meta: { error: event.type === "math_widget_error", message: event.message },
          });
          currentToolStatus = undefined;
          if (isPlanningUIPresented) updateUI(bufferedText, elements);
        } else if ((event.type === "chunk" || event.type === "chunks") && typeof event.text === "string") {
          currentTextBuffer += event.text;
          bufferedText += event.text;

          // Detect and extract embedded tags (VISUAL, MATH_DRAW, English skill directives, raw SVG)
          // English skill directives are stripped from visible text and parsed for the audio/widget layer
          const tagRegex = /(?:<<VISUAL[\s\S]*?<<?\/VISUAL>>?)|(?:<<VISUAL[\s\S]*?\/>>?)|(?:<<(MATH_DRAW|MATH_WIDGET|SHOW_FIGURE|SPEAK_PARA|DIFFICULT_WORD|READ_ALOUD|LISTEN_COMPREHENSION|SHOW_FIGURE_DESCRIBE|KARAOKE)[\s\S]*?>>?)|(?:<svg[\s\S]*?<\/svg>)/g;
          let match;
          while ((match = tagRegex.exec(currentTextBuffer)) !== null) {
            const tag = match[0];
            
            // 1. Finalize and push any text that appeared BEFORE the tag
            const textBefore = currentTextBuffer.substring(0, match.index);
            if (textBefore.trim()) pushTextElement(textBefore);
            
            // 2. Process the tag itself
            if (tag.startsWith("<svg")) {
              elements.push({
                id: `stream-svg-${elements.length}-${Date.now()}`,
                type: "svg",
                content: normalizeSvg(tag),
                meta: { isRawBackendSvg: true }
              });
            } else {
              const extracted = parseContent(tag);
              const tagElement = extracted.find(el => el.type !== "text");
              if (tagElement) {
                // Deduplication: If this is a visual block, check if it's already in elements
                const isDuplicate = tagElement.type === "visual" && elements.some(el => 
                  el.type === "visual" && 
                  el.meta?.engine === tagElement.meta?.engine && 
                  el.meta?.label === tagElement.meta?.label
                );
                
                if (!isDuplicate) {
                  elements.push(tagElement);
                }
              }
            }
            
            // 3. Remove the processed part (textBefore + tag) from the active buffer
            currentTextBuffer = currentTextBuffer.substring(match.index + tag.length);
            tagRegex.lastIndex = 0; // Reset for remaining text

            // Handle English skill directives — strip from visible text, parse payload
            if (match[1] && /^(SPEAK_PARA|DIFFICULT_WORD|READ_ALOUD|LISTEN_COMPREHENSION|SHOW_FIGURE_DESCRIBE|KARAOKE)$/.test(match[1])) {
              const directiveType = match[1];
              const jsonStart = tag.indexOf(":");
              if (jsonStart !== -1) {
                try {
                  const payload = JSON.parse(tag.slice(jsonStart + 1, -2).trim());
                  // Store directive for the audio/recording layer to act on
                  set({ activeSkillDirective: { type: directiveType, ...payload } });

                  // For LISTEN_COMPREHENSION, render an inline comprehension widget
                  if (directiveType === "LISTEN_COMPREHENSION" && payload.directive_id) {
                    elements.push({
                      id: `cw-${payload.directive_id}`,
                      type: "comprehension_widget",
                      content: payload.question || "",
                      meta: {
                        widget_type: payload.interaction_type || "mcq",
                        question: payload.question || "",
                        choices: payload.options || [],
                        allow_retry: true,
                        directive_id: payload.directive_id,
                      },
                    });
                    if (isPlanningUIPresented) updateUI(bufferedText, elements);
                  }

                  // For DIFFICULT_WORD, render a tappable word chip
                  if (directiveType === "DIFFICULT_WORD" && payload.word) {
                    elements.push({
                      id: `dw-${payload.directive_id || payload.word}-${Date.now()}`,
                      type: "comprehension_widget",
                      content: payload.word,
                      meta: {
                        widget_type: "difficult_word" as any,
                        word: payload.word,
                        syllables: payload.syllables,
                        phonetic: payload.phonetic,
                        slow_available: payload.slow_available,
                        directive_id: payload.directive_id,
                      },
                    });
                    if (isPlanningUIPresented) updateUI(bufferedText, elements);
                  }
                } catch {
                  // Malformed directive — ignore, continue stream (Wave 1 §10.5)
                }
              }
              continue; // don't fall through to pushTextElement
            }
          }

          if (isPlanningUIPresented) {
            updateUI(bufferedText, elements, currentToolStatus);
          }
        } else if (event.type === "skill_action") {
          // Flush buffer before skill action to ensure chronological order
          pushTextElement(currentTextBuffer);
          currentTextBuffer = "";

          // Mode Controller (The "What"): Prepare the UI state for a skill mode
          const { mode, payload } = event;
          const directiveType = (mode || "").toUpperCase();
          
          set({ activeSkillDirective: { type: directiveType, ...payload } });

          // Add a dedicated reading block element if it's a speaking mode (Wave 1/2)
          if ((directiveType === "SPEAK_PARA" || directiveType === "KARAOKE" || directiveType === "READ_ALOUD") && payload.directive_id) {
            if (!elements.some(el => el.id === `sv-${payload.directive_id}`)) {
              elements.push({
                id: `sv-${payload.directive_id}`,
                type: "english_skill_view",
                content: payload.source_text || "",
                meta: { directive_id: payload.directive_id, mode: directiveType }
              });
              if (isPlanningUIPresented) updateUI(bufferedText, elements);
            }
          }

          // DIFFICULT_WORD: inject a tappable pronunciation chip
          if (directiveType === "DIFFICULT_WORD" && payload.word) {
            const dwId = `dw-${payload.directive_id || payload.word}-${Date.now()}`;
            elements.push({
              id: dwId,
              type: "comprehension_widget",
              content: payload.word,
              meta: {
                widget_type: "difficult_word" as any,
                word: payload.word,
                syllables: payload.syllables,
                phonetic: payload.phonetic,
                slow_available: payload.slow_available,
                directive_id: payload.directive_id,
              },
            });
            updateUI(bufferedText, elements);
          }

          // LISTEN_COMPREHENSION: inject inline quiz widget
          if (directiveType === "LISTEN_COMPREHENSION" && payload.directive_id) {
            if (!elements.some(el => el.id === `cw-${payload.directive_id}`)) {
              elements.push({
                id: `cw-${payload.directive_id}`,
                type: "comprehension_widget",
                content: payload.question || "",
                meta: {
                  widget_type: payload.interaction_type || "mcq",
                  question: payload.question || "",
                  choices: payload.options || [],
                  allow_retry: true,
                  directive_id: payload.directive_id,
                },
              });
              updateUI(bufferedText, elements);
            }
          }

          // SHOW_FIGURE_DESCRIBE: inject a visual card with the figure
          if (directiveType === "SHOW_FIGURE_DESCRIBE" && payload.directive_id) {
            if (!elements.some(el => el.id === `fig-${payload.directive_id}`)) {
              elements.push({
                id: `fig-${payload.directive_id}`,
                type: "visual",
                content: "show_figure_describe",
                meta: {
                  engine: "show_figure_describe",
                  label: payload.prompt || "What do you see?",
                  figure_id: payload.figure_id,
                  directive_id: payload.directive_id,
                  figure_asset_url: payload.figure_asset_url,
                },
              });
              updateUI(bufferedText, elements);
            }
          }
        } else if (event.type === "tts_start") {
          // Backend generated TTS — trigger audio playback (Wave 1 §1.4)
          get().playDirectiveTts(event.directive_id, event.timepoints || []);
        } else if (event.type === "recording_open") {
          // Backend wants student to read aloud (Wave 2 §1.3)
          get().startSkillRecording(event.directive_id, event.expected_duration_ms);
        } else if (event.type === "recording_closed") {
          // Backend closed the recording window
          get().stopSkillRecording();
        } else if (event.type === "skill_result") {
          // Oral reading / comprehension result — store for UI display
          set((state) => {
            const newResults = { ...state.comprehensionResults };
            if (event.directive_id) {
              newResults[event.directive_id] = {
                is_correct: event.payload?.is_correct ?? false,
                answer: event.payload?.answer ?? ""
              };
            }
            return {
              activeSkillDirective: { type: "skill_result", ...event.payload },
              comprehensionResults: newResults
            };
          });
        } else if (event.type === "skill_error") {
          // Wave 4: graceful degradation — log only, session continues
          console.warn("[SkillError]", event.error_type, event.message);
        } else if (event.type === "done") {
          finalSessionId = event.session_id;
          finalOptions = Array.isArray(event.options) ? event.options : [];
          finalActions = Array.isArray(event.actions) ? event.actions : [];
          if (event.response) doneResponse = event.response;
          if (event.status === "error") {
            bufferedText = streamErrorMessage || "Please tell me more.";
            elements.length = 0;
            elements.push({
              id: `err-el-${Date.now()}`,
              type: "text",
              content: bufferedText
            });
            isStreamError = true;
          }
        }
      };

      // -- Orchestrator Loop (Non-blocking) -----------------------------------
      const orchestrateUI = async () => {
        let shownStatuses = 0;
        
        while (!streamDone || planningQueue.length > shownStatuses) {
          if (planningQueue.length > shownStatuses) {
            const item = planningQueue[shownStatuses];
            shownStatuses++;
            currentStatusText = item.text;
            currentPhase = item.phase;
            updateUI(bufferedText, elements, currentToolStatus, item.text, item.phase);
            await new Promise((r) => setTimeout(r, 1200));
          } else if (streamDone) {
            break;
          } else {
            // If we have no more planning statuses but the stream is still going,
            // we wait a bit to see if more planning statuses arrive.
            // If the AI has already started sending chunks (bufferedEvents has data),
            // and we've shown at least one planning status (or there were none), 
            // we can proceed to streaming.
            if (bufferedEvents.length > 0 || shownStatuses > 0) break;
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        isPlanningUIPresented = true;
        // Process all events that were buffered during the planning phase
        while (bufferedEvents.length > 0) {
          handleEvent(bufferedEvents.shift());
        }
        // Final sync for the switch from "Thinking" to "Streaming"
        pushTextElement(currentTextBuffer);
        currentTextBuffer = "";
        updateUI(bufferedText, elements, currentToolStatus);
      };

      const uiPromise = orchestrateUI();

      // -- Stream Reader Loop -------------------------------------------------
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          streamDone = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          let event: any;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          // Late-binding session ID sync
          if (event.type === "session_id" && event.session_id) {
            const newSessionId = event.session_id;
            const { activeChat: currentChat, fetchSessions } = get();
            
            // Sync state and URL only if we are transitioning from a new/null session
            if (!currentChat || currentChat.id === "new" || currentChat.id === "new-focused") {
              const updatedChat: ChatSession = currentChat ? { 
                ...currentChat, 
                id: newSessionId, 
                session_id: newSessionId 
              } : {
                id: newSessionId,
                session_id: newSessionId,
                title: event.title || "New Session",
                agentType: "Socratic Assistant",
                agentIcon: "🤖",
                lastActive: "Just now",
                lastTopic: "Continued Learning",
                subject: event.subject || "General",
                grade: "",
              };

              set({ activeChat: updatedChat });
              window.history.pushState(null, "", `/student/chat/${newSessionId}`);
              fetchSessions(); // Refresh sidebar history
            }
          }

          let shouldUpdate = false;

          // Standardize planning/tool updates for batching
          if (event.type === "planning") {
            const status = event.text || event.message || "";
            const phase = event.phase || "thinking";
            if (status && (status !== currentStatusText || phase !== currentPhase)) {
              currentStatusText = status;
              currentPhase = phase;
              shouldUpdate = true;
            }
          } else if (event.type === "tool_status") {
            currentToolStatus = event.message || "Drawing...";
            shouldUpdate = true;
          }

          if (!isPlanningUIPresented) {
            bufferedEvents.push(event);
          } else {
            handleEvent(event);
            shouldUpdate = true;
          }

          if (shouldUpdate && isPlanningUIPresented) {
            updateUI(bufferedText, elements, currentToolStatus, currentStatusText, currentPhase);
          }
        }
      }

      await uiPromise; // Ensure orchestrator finishes flushes

      // -- Post-stream SVG Upgrade --------------------------------------------
      // The done event's `response` field contains <<MATH_DRAW>> tags which
      // parseContent converts to properly themed SVGs via generateHistoricalSVG.
      // This replaces any raw backend SVG placeholders (isRawBackendSvg: true)
      // that arrived in chunk events, ensuring streaming and history renders match.
      if (doneResponse && !isStreamError) {
        const finalParsed = parseContent(doneResponse);
        const finalVisuals = finalParsed.filter((el) => el.type !== "text");
        if (finalVisuals.length > 0) {
          let upgraded = 0;
          for (let i = 0; i < elements.length; i++) {
            if (
              elements[i].type === "svg" &&
              elements[i].meta?.isRawBackendSvg &&
              upgraded < finalVisuals.length
            ) {
              elements[i] = { ...finalVisuals[upgraded++], id: elements[i].id };
            }
          }
          // Add any visuals from done.response that had no chunk placeholder
          for (let j = upgraded; j < finalVisuals.length; j++) {
            if (!elements.some((el) => el.type !== "text" && !el.meta?.isRawBackendSvg)) {
              elements.push(finalVisuals[j]);
            }
          }
        }
      }

      // Flush any remaining text in the buffer into elements before finalizing.
      // Without this, text that arrives after the last visual block is only shown
      // transiently as a stream-tail and is lost from the final elements array.
      if (currentTextBuffer.trim() && !isStreamError) {
        pushTextElement(currentTextBuffer);
        currentTextBuffer = "";
      }

      // Finalise: replace streaming placeholder with finished message + options
      set((state) => {
        const finalisedMsg: ChatMessage = {
          id: streamingMsgId,
          text: bufferedText,
          elements: [...elements],
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          options: finalOptions.length > 0 ? finalOptions : undefined,
          actions: finalActions.length > 0 ? finalActions : undefined,
          statusText: undefined,
          toolStatus: undefined,
        };

        const patchMsg = (msgs: ChatMessage[]) =>
          msgs.map((m) => (m.id === streamingMsgId ? finalisedMsg : m));

        // Update the session in recentChats
        const isPromotingNewChat =
          chatSentFromId === "new" || chatSentFromId === "new-focused";
        const chatInList = state.recentChats.find(
          (c) => c.id === chatSentFromId,
        );
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
            (c) => c.id !== finalSessionId && c.session_id !== finalSessionId,
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
            .filter(
              (c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx,
            );
          if (state.activeChat?.id === chatSentFromId) {
            finalActiveChat = updatedChat;
          }
        }

        // Migrate cache key from tempId to realId with eviction management
        const currentCached = state.chatMessagesCache[chatSentFromId] || [];
        const finalisedMessages = patchMsg(currentCached);
        
        let newCache = manageCacheEviction(state.chatMessagesCache, realId, finalisedMessages);
        
        if (realId !== chatSentFromId) {
          // Explicitly cleanup the temporary ID cache
          const cleanedCache = { ...newCache };
          delete cleanedCache[chatSentFromId];
          newCache = cleanedCache;
        }

        const newTypingIds = state.typingChatIds.filter(
          (id) => id !== chatSentFromId,
        );
        const isStillViewing = state.activeChat?.id === chatSentFromId;

        return {
          activeChat: finalActiveChat,
          recentChats: newRecentChats,
          chatMessagesCache: newCache,
          messages: isStillViewing ? finalisedMessages : state.messages,
          typingChatIds: newTypingIds,
          isAITyping: isStillViewing ? false : state.isAITyping,
          streamingMessageId: null,
          chatAbortController: null,
          activeActivity: finalActions.find(a => 
            ["request_reading", "request_listening", "request_spelling", "request_repeat"].includes(a.type)
          ) || null,
        };
      });
    } catch (error: any) {
      const isAbort = error.name === "AbortError";
      const isRateLimit = error instanceof ApiRequestError && error.status === 429;
      const isRetryable = error instanceof ApiRequestError && error.retryable;

      if (isAbort) {
        console.debug("Chat generation aborted by user");
      } else if (isRateLimit) {
        set({ isRateLimitHit: true, rateLimitMessage: error.message || null });
      } else {
        console.error("Chat API Error:", error?.request_id, error?.message ?? error);
      }

      const baseErrorText = error?.message || "Sorry, I encountered an error connecting to the knowledge base.";
      const errorText = isRetryable ? `${baseErrorText} Please try again.` : baseErrorText;

      set((state) => {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          text: errorText,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        const cleanOrReplace = (msgs: ChatMessage[]) => {
          const withoutStreaming = msgs.filter((m) => m.id !== streamingMsgId);
          // If it was an abort OR a rate limit, just leave it empty.
          // Otherwise, add the error message.
          return (isAbort || isRateLimit) ? withoutStreaming : [...withoutStreaming, errorMsg];
        };

        const cached = state.chatMessagesCache[chatSentFromId] || [];
        const finishedMessages = cleanOrReplace(cached);
        const newTypingIds = state.typingChatIds.filter(
          (id) => id !== chatSentFromId,
        );

        return {
          chatMessagesCache: manageCacheEviction(state.chatMessagesCache, chatSentFromId, finishedMessages),
          messages:
            state.activeChat?.id === chatSentFromId
              ? finishedMessages
              : state.messages,
          typingChatIds: newTypingIds,
          isAITyping:
            state.activeChat?.id === chatSentFromId ? false : state.isAITyping,
          streamingMessageId: null,
          chatAbortController: null,
        };
      });
    }
  },
}));
