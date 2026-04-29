import { create } from "zustand";
import { studentService } from "@/features/student/services/studentService";

// -- Types --------------------------------------------------------------------

interface SkillSummary {
  overall_score: number;
  skill_index: number;
  session_count?: number;
}

export interface SkillHistoryPoint {
  mastery_level: number;
  assessment_count: number;
  source: string;
  session_id: string | null;
  recorded_at: string; // ISO timestamp
}

export interface SkillProgressionEntry {
  skill_id: string;
  skill_name: string;
  history: SkillHistoryPoint[];
}

export interface OverallHistoryPoint {
  overall_score: number;
  skill_index: number;
  adaptive_mode: string;
  recorded_at: string;
}

// -- Store Interface ----------------------------------------------------------

interface AnalyticsState {
  isAnalyticsOpen: boolean;
  analyticsSubjects: string[];
  selectedAnalyticsSubject: string;
  skillSummary: SkillSummary | null;
  cgScores: Array<{ cg_id: string; cg_name: string; avg_mastery: number }>;
  skillTree: any[];
  analyticsChapterMastery: any[];
  isAnalyticsLoading: boolean;

  // Skill Progression state
  skillProgression: SkillProgressionEntry[];
  skillProfileHistory: OverallHistoryPoint[];
  isProgressionLoading: boolean;

  // Actions
  setAnalyticsOpen: (open: boolean) => void;
  setSelectedAnalyticsSubject: (subject: string) => void;
  fetchAnalyticsSubjects: (studentId: string) => Promise<void>;
  fetchAnalyticsData: (subject?: string, studentIdOverride?: string) => Promise<void>;
  fetchSkillProgressionData: (subject?: string, studentIdOverride?: string) => Promise<void>;
}

// -- Store --------------------------------------------------------------------

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  isAnalyticsOpen: false,
  analyticsSubjects: [],
  selectedAnalyticsSubject: "",
  skillSummary: null,
  cgScores: [],
  skillTree: [],
  analyticsChapterMastery: [],
  isAnalyticsLoading: false,

  // Skill Progression initial state
  skillProgression: [],
  skillProfileHistory: [],
  isProgressionLoading: false,

  setAnalyticsOpen: (open) => set({ isAnalyticsOpen: open }),

  setSelectedAnalyticsSubject: (subject) => set({ selectedAnalyticsSubject: subject }),

  fetchAnalyticsSubjects: async (studentId) => {
    try {
      const data = await studentService.fetchAnalyticsSubjects(studentId);
      const subjects = data.subjects || [];
      set({ analyticsSubjects: subjects });
      
      // If no subject selected and we have subjects, select the first one
      if (subjects.length > 0 && !get().selectedAnalyticsSubject) {
        set({ selectedAnalyticsSubject: subjects[0] });
      }
    } catch (error) {
      console.error("Fetch Analytics Subjects Error:", error);
    }
  },

  fetchAnalyticsData: async (subject, studentIdOverride) => {
    const { selectedAnalyticsSubject } = get();
    const targetSubject = subject || selectedAnalyticsSubject;
    const effectiveStudentId = studentIdOverride;

    if (!effectiveStudentId) {
      console.warn("fetchAnalyticsData: No student ID provided.");
      return;
    }

    if (!targetSubject) {
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
      // Fetch all analytics components in parallel using allSettled
      // so that one failing endpoint doesn't block the others from rendering.
      const results = await Promise.allSettled([
        studentService.fetchSkillSummary(effectiveStudentId, targetSubject),
        studentService.fetchCGScores(effectiveStudentId, targetSubject),
        studentService.fetchSkillTree(effectiveStudentId, targetSubject),
        studentService.fetchChapterMastery(effectiveStudentId, targetSubject),
      ]);

      const [summary, scores, tree, mastery] = results;

      set({
        skillSummary: summary.status === "fulfilled" ? summary.value : get().skillSummary,
        cgScores: scores.status === "fulfilled" ? (scores.value || []) : get().cgScores,
        skillTree: tree.status === "fulfilled" ? (tree.value || []) : get().skillTree,
        analyticsChapterMastery: mastery.status === "fulfilled" ? (mastery.value || []) : get().analyticsChapterMastery,
        isAnalyticsLoading: false
      });

      // Log specific failures for debugging
      results.forEach((res, idx) => {
        if (res.status === "rejected") {
          const endpoints = ["Skill Summary", "CG Scores", "Skill Tree", "Chapter Mastery"];
          console.error(`${endpoints[idx]} fetch failed:`, res.reason);
        }
      });

    } catch (error) {
      console.error("Fetch Analytics Data Critical Error:", error);
      set({ isAnalyticsLoading: false });
    }
  },

  fetchSkillProgressionData: async (subject, studentIdOverride) => {
    const { selectedAnalyticsSubject } = get();
    const targetSubject = subject || selectedAnalyticsSubject;
    const effectiveStudentId = studentIdOverride;

    if (!effectiveStudentId || !targetSubject) {
      console.warn("fetchSkillProgressionData: Missing student ID or subject.");
      return;
    }

    set({ isProgressionLoading: true });

    try {
      const [progressionRes, profileRes] = await Promise.allSettled([
        studentService.fetchSkillProgression(effectiveStudentId, targetSubject),
        studentService.fetchSkillProfileHistory(effectiveStudentId, targetSubject),
      ]);

      set({
        skillProgression:
          progressionRes.status === "fulfilled" ? (progressionRes.value ?? []) : get().skillProgression,
        skillProfileHistory:
          profileRes.status === "fulfilled"
            ? (profileRes.value?.history ?? [])
            : get().skillProfileHistory,
        isProgressionLoading: false,
      });

      if (progressionRes.status === "rejected") {
        console.error("Skill Progression fetch failed:", progressionRes.reason);
      }
      if (profileRes.status === "rejected") {
        console.error("Skill Profile History fetch failed:", profileRes.reason);
      }
    } catch (error) {
      console.error("fetchSkillProgressionData Critical Error:", error);
      set({ isProgressionLoading: false });
    }
  },
}));
