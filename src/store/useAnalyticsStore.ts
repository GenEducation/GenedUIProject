import { create } from "zustand";
import { studentService } from "@/features/student/services/studentService";
import {
  loadSubjectCatalog,
  requireExactSubject,
  type ExactSubject,
  type TaxonomySubject,
} from "@/features/subjects/subjectCatalog";

// -- Types --------------------------------------------------------------------

interface SkillSummary {
  overall_score: number;
  skill_index: number;
  skill_index_max?: number;
  skill_index_progress?: number;
  skill_index_status?: string;
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
  analyticsSubjects: ExactSubject[];
  selectedAnalyticsSubject: ExactSubject | "";
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
  setSelectedAnalyticsSubject: (subject: ExactSubject) => void;
  fetchAnalyticsSubjects: (studentId: string, signal?: AbortSignal) => Promise<void>;
  fetchAnalyticsData: (subject?: string, studentIdOverride?: string) => Promise<void>;
  fetchSkillProgressionData: (subject?: string, studentIdOverride?: string) => Promise<void>;
}

function extractExactSubjects(data: any, catalog: TaxonomySubject[]): ExactSubject[] {
  const subjects = new Set<ExactSubject>();
  for (const partner of Array.isArray(data?.partners) ? data.partners : []) {
    for (const group of Array.isArray(partner?.subjects) ? partner.subjects : []) {
      for (const agent of Array.isArray(group?.agents) ? group.agents : []) {
        try {
          subjects.add(
            requireExactSubject(agent.subject ?? group.subject, Number(agent.grade), catalog),
          );
        } catch {
          // Invalid historical rows are not analytics query options.
        }
      }
    }
  }
  return Array.from(subjects).sort();
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

  fetchAnalyticsSubjects: async (studentId, signal?) => {
    try {
      const catalog = await loadSubjectCatalog();
      const data = await studentService.fetchAvailableAgents(studentId, signal);
      const subjects = extractExactSubjects(data, catalog);
      set({ analyticsSubjects: subjects });
      
      // If no subject selected and we have subjects, select the first one
      if (subjects.length > 0 && !get().selectedAnalyticsSubject) {
        set({ selectedAnalyticsSubject: subjects[0] });
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Fetch Analytics Subjects Error:", error?.request_id, error?.message ?? error);
    }
  },

  fetchAnalyticsData: async (subject, studentIdOverride) => {
    const { selectedAnalyticsSubject, analyticsSubjects } = get();
    const requestedSubject = subject || selectedAnalyticsSubject;
    const targetSubject = requestedSubject
      ? analyticsSubjects.find((candidate) => candidate === requestedSubject)
      : undefined;
    const effectiveStudentId = studentIdOverride;

    if (!effectiveStudentId) {
      console.warn("fetchAnalyticsData: No student ID provided.");
      return;
    }

    if (!targetSubject) {
      // First, fetch subjects if none selected
      try {
        const catalog = await loadSubjectCatalog();
        const agentData = await studentService.fetchAvailableAgents(effectiveStudentId);
        const subjects = extractExactSubjects(agentData, catalog);
        set({ analyticsSubjects: subjects });
        if (subjects.length > 0) {
          get().fetchAnalyticsData(subjects[0], studentIdOverride);
        }
      } catch (error: any) {
        console.error("Fetch Analytics Subjects Error:", error?.request_id, error?.message ?? error);
      }
      return;
    }

    if (subject && targetSubject) set({ selectedAnalyticsSubject: targetSubject });

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
          console.error(`${endpoints[idx]} fetch failed:`, res.reason?.request_id, res.reason?.message ?? res.reason);
        }
      });

    } catch (error: any) {
      console.error("Fetch Analytics Data Critical Error:", error?.request_id, error?.message ?? error);
      set({ isAnalyticsLoading: false });
    }
  },

  fetchSkillProgressionData: async (subject, studentIdOverride) => {
    const { selectedAnalyticsSubject, analyticsSubjects } = get();
    const requestedSubject = subject || selectedAnalyticsSubject;
    const targetSubject = requestedSubject
      ? analyticsSubjects.find((candidate) => candidate === requestedSubject)
      : undefined;
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
        console.error("Skill Progression fetch failed:", progressionRes.reason?.request_id, progressionRes.reason?.message ?? progressionRes.reason);
      }
      if (profileRes.status === "rejected") {
        console.error("Skill Profile History fetch failed:", profileRes.reason?.request_id, profileRes.reason?.message ?? profileRes.reason);
      }
    } catch (error: any) {
      console.error("fetchSkillProgressionData Critical Error:", error?.request_id, error?.message ?? error);
      set({ isProgressionLoading: false });
    }
  },
}));
