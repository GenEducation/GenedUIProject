import { create } from "zustand";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface Agent {
  id: string;
  name: string;
  role: string;
  icon: string;
  description: string;
  color: string;
  class_id: string;
  grade?: string;
  topics?: string[];
  goals?: string[];
  skill_vectors?: Record<string, number>;
}

export interface Student {
  id: string;
  name: string;
  scholarly_rank: string;
  current_title: string;
  global_mastery_pct: number;
  last_concept?: string;
  class_ids?: string[];
}

export interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: string;
}

interface AgentState {
  agents: Agent[];
  activeAgent: Agent | null;
  student: Student | null;
  isLoading: boolean;
  masteryLevel: number;
  chatHistory: Message[];
  isAssessmentMode: boolean;
  activeTopic: string | null;
  masteryNodes: any[];
  
  setActiveAgent: (agent: Agent | null) => void;
  setAssessmentMode: (mode: boolean) => void;
  setActiveTopic: (topic: string | null) => void;
  addMastery: (amount: number) => void;
  
  fetchAgents: (classId?: string) => Promise<void>;
  fetchStudent: (id: string) => Promise<void>;
  fetchHistory: (sessionId: string) => Promise<void>;
  fetchMasteryMap: (studentId: string, classId?: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  activeAgent: null,
  student: null,
  isLoading: false,
  masteryLevel: 35,
  chatHistory: [],
  isAssessmentMode: false,
  activeTopic: null,
  masteryNodes: [],

  setActiveAgent: (agent) => {
    set({ activeAgent: agent, activeTopic: null }); // Reset topic on agent change
  },
  setAssessmentMode: (mode) => set({ isAssessmentMode: mode }),
  setActiveTopic: (topic) => set({ activeTopic: topic }),
  addMastery: (amount) => set((state) => ({ 
    masteryLevel: Math.min(state.masteryLevel + amount, 100) 
  })),

  fetchAgents: async (classId) => {
    set({ isLoading: true });
    try {
      const url = classId 
        ? `${API_BASE_URL}/agents?class_id=${classId}` 
        : `${API_BASE_URL}/agents`;
      const response = await fetch(url);
      const data = await response.json();
      set({ agents: data, isLoading: false });
    } catch (error) {
      console.error("Fetch agents failed:", error);
      set({ isLoading: false });
    }
  },

  fetchStudent: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/students/${id}/profile`);
      const data = await response.json();
      set({ student: data, masteryLevel: data.global_mastery_pct });
    } catch (error) {
      console.error("Fetch student failed:", error);
    }
  },

  fetchHistory: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/${sessionId}/history`);
      const data = await response.json();
      set({ chatHistory: data });
    } catch (error) {
      console.error("Fetch history failed:", error);
    }
  },

  fetchMasteryMap: async (studentId, classId) => {
    try {
      const url = classId 
        ? `${API_BASE_URL}/students/${studentId}/mastery-map?class_id=${classId}`
        : `${API_BASE_URL}/students/${studentId}/mastery-map`;
      const response = await fetch(url);
      const data = await response.json();
      set({ masteryNodes: data });
    } catch (error) {
      console.error("Fetch mastery map failed:", error);
    }
  }
}));
