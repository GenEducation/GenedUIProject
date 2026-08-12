"use client";

import { useState, useEffect, useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { studentService } from "@/features/student/services/studentService";
import { getStudentDisplayName, titleCase } from "@/features/student/utils/displayName";
import type {
  SubjectData, ChapterMasteryItem, SkillCGItem, TestSubmission, DashboardProfile,
  EvolutionAnalysisData, SubjectEvolutionData, StudentProgressData,
  ReportCardData, ReportCardUI, ReportRole,
} from "./types";
import { RC_STYLES } from "./styles";
import { applySimulation } from "./utils";
import { ReportCardBody } from "./ReportCardBody";
import { usePrintPdf } from "./usePrintPdf";
import {
  loadSubjectCatalog,
  requireExactSubject,
  type TaxonomySubject,
} from "@/features/subjects/subjectCatalog";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,500&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap";

function hasExactReportSubject(
  row: { subject?: unknown },
  grade: unknown,
  catalog: TaxonomySubject[],
): boolean {
  try {
    requireExactSubject(row.subject, grade, catalog);
    return true;
  } catch {
    return false;
  }
}

export function StudentReportCard({ parentId, teacherId, childId, childName }: { parentId?: string; teacherId?: string; childId?: string; childName?: string } = {}) {
  const { studentProfile } = useStudentStore();
  const router = useRouter();

  const role: ReportRole = teacherId ? "teacher" : parentId ? "parent" : "student";

  // Dev-only state simulation (?simulate=new|sessions-only|no-tests|no-insights|partial).
  // Read from the URL after mount to avoid an SSR/hydration mismatch and to keep
  // this shared component free of a Suspense-requiring useSearchParams().
  const [simMode, setSimMode] = useState<string | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setSimMode(new URLSearchParams(window.location.search).get("simulate"));
    }
  }, []);

  // ── State ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardProfile, setDashboardProfile] = useState<DashboardProfile | null>(null);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterMasteryItem[]>([]);
  const [skillTree, setSkillTree] = useState<SkillCGItem[]>([]);
  const [testSubmissions, setTestSubmissions] = useState<TestSubmission[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [progressReport, setProgressReport] = useState<StudentProgressData | null>(null);
  const [subjectEvolutions, setSubjectEvolutions] = useState<SubjectEvolutionData[]>([]);
  const [chapterEvolutions, setChapterEvolutions] = useState<EvolutionAnalysisData[]>([]);

  // Expander/subject/clamp UI state (screen only). Subjects default COLLAPSED.
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(() => new Set());
  const [openExpanders, setOpenExpanders] = useState<Set<string>>(() => new Set());
  const [expandedClamps, setExpandedClamps] = useState<Set<string>>(() => new Set());

  const toggleInSet = (setter: Dispatch<SetStateAction<Set<string>>>, key: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleSubject = (name: string) => toggleInSet(setOpenSubjects, name);
  const toggleExp = (key: string) => toggleInSet(setOpenExpanders, key);
  const toggleClamp = (key: string) => toggleInSet(setExpandedClamps, key);

  // ── Data Fetching ─────────────────────────────────────
  const studentId = studentProfile?.user_id;

  const fetchParentReportData = useCallback(async () => {
    if (!childId || !(parentId || teacherId)) return;
    setIsLoading(true);
    setError(null);
    try {
      const catalog = await loadSubjectCatalog();
      const data = parentId
        ? await studentService.fetchParentReport(parentId, childId)
        : await studentService.fetchTeacherReport(teacherId!, childId);
      const grade = data.profile?.grade;
      if (!Number.isInteger(grade)) {
        throw new Error("A valid student grade is required to build a report.");
      }
      setDashboardProfile(data.profile ?? null);
      setTotalSessions(data.total_sessions ?? 0);
      setSubjects((data.subjects ?? []).filter((row: SubjectData) => hasExactReportSubject(row, grade, catalog)));
      setChapters((data.chapters ?? []).filter((row: ChapterMasteryItem) => hasExactReportSubject(row, grade, catalog)));
      setSkillTree((data.skill_tree ?? []).filter((row: SkillCGItem) => hasExactReportSubject(row, grade, catalog)));
      setTestSubmissions((data.test_submissions ?? []).filter((row: TestSubmission) => hasExactReportSubject(row, grade, catalog)));
      setProgressReport(data.progress_report ?? null);
      setSubjectEvolutions((data.subject_evolutions ?? []).filter((row: SubjectEvolutionData) => hasExactReportSubject(row, grade, catalog)));
      setChapterEvolutions((data.chapter_evolutions ?? []).filter((row: EvolutionAnalysisData) => hasExactReportSubject(row, grade, catalog)));
    } catch (err) {
      console.error("[ReportCard] Failed to load parent report data:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [parentId, teacherId, childId]);

  const fetchAll = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [catalog, profileData, subjectListData] = await Promise.all([
        loadSubjectCatalog(),
        studentService.fetchDashboardProfile(studentId).catch(() => null),
        studentService.fetchAnalyticsSubjects(studentId).catch(() => ({ subjects: [] })),
      ]);

      if (profileData) setDashboardProfile(profileData);
      const grade = profileData?.grade ?? studentProfile?.grade;
      if (!Number.isInteger(grade)) {
        throw new Error("A valid student grade is required to build a report.");
      }
      const rawSubjectNames: unknown[] = Array.isArray(subjectListData?.subjects)
        ? subjectListData.subjects
        : [];
      const subjectNames = rawSubjectNames.flatMap((subject) => {
        try {
          return [requireExactSubject(subject, grade, catalog)];
        } catch {
          return [];
        }
      });
      setTotalSessions(subjectListData?.session_count ?? 0);

      const perSubjectResults = await Promise.all(
        subjectNames.map(async (subject) => {
          const [summaryData, masteryData, treeData, subjectEvoData] = await Promise.all([
            studentService.fetchSkillSummary(studentId, subject).catch(() => null),
            studentService.fetchChapterMastery(studentId, subject).catch(() => []),
            studentService.fetchSkillTree(studentId, subject).catch(() => []),
            studentService.fetchSubjectEvolution(studentId, subject).catch(() => null),
          ]);

          const subjectEntry: SubjectData | null = summaryData
            ? {
                subject,
                overall_score: summaryData.overall_score ?? 0,
                skill_index: summaryData.skill_index ?? 0,
                adaptive_mode: summaryData.adaptive_mode ?? "PRACTICE",
                session_count: summaryData.session_count ?? 0,
              }
            : null;

          const chapterEntries: ChapterMasteryItem[] = Array.isArray(masteryData)
            ? masteryData.map((ch: ChapterMasteryItem) => ({ ...ch, subject }))
            : [];
          const cgEntries: SkillCGItem[] = Array.isArray(treeData)
            ? treeData.map((cg: SkillCGItem) => ({ ...cg, subject }))
            : [];

          return { subjectEntry, chapterEntries, cgEntries, subjectEvoData };
        })
      );

      const allSubjects: SubjectData[] = [];
      const allChapters: ChapterMasteryItem[] = [];
      const allCGs: SkillCGItem[] = [];
      const allSubjectEvos: SubjectEvolutionData[] = [];

      for (const { subjectEntry, chapterEntries, cgEntries, subjectEvoData } of perSubjectResults) {
        if (subjectEntry) allSubjects.push(subjectEntry);
        allChapters.push(...chapterEntries);
        allCGs.push(...cgEntries);
        if (subjectEvoData && !subjectEvoData.detail) allSubjectEvos.push(subjectEvoData);
      }

      const [testData, progressData, timeByChapterData] = await Promise.all([
        studentService.fetchTestSubmissions(studentId).catch(() => []),
        studentService.fetchProgressReport(studentId).catch(() => null),
        studentService.fetchTimeByChapter(studentId).catch(() => []),
      ]);

      if (Array.isArray(timeByChapterData)) {
        const timeByKey = new Map<string, { total_minutes: number; session_count: number }>();
        for (const t of timeByChapterData) {
          const key = `${t.subject ?? ""}::${(t.chapter_name ?? "").toLowerCase()}`;
          timeByKey.set(key, t);
        }
        for (const ch of allChapters) {
          const key = `${ch.subject}::${ch.document_title.toLowerCase()}`;
          const t = timeByKey.get(key);
          if (t) {
            ch.time_minutes = t.total_minutes;
            ch.time_sessions = t.session_count;
          }
        }
      }

      setSubjects(allSubjects);
      setChapters(allChapters);
      setSkillTree(allCGs);
      setSubjectEvolutions(allSubjectEvos);

      if (Array.isArray(testData)) setTestSubmissions(testData);
      if (progressData && !progressData.detail) setProgressReport(progressData);

      const chapterEvoResults = await Promise.all(
        allChapters.map((ch) =>
          studentService.fetchChapterEvolution(studentId, ch.subject, ch.document_title).catch(() => null)
        )
      );
      setChapterEvolutions(chapterEvoResults.filter((r) => r && !r.detail) as EvolutionAnalysisData[]);
    } catch (err) {
      console.error("[ReportCard] Failed to load data:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [studentId, studentProfile?.grade]);

  useEffect(() => {
    if (childId && (parentId || teacherId)) {
      fetchParentReportData();
    } else {
      fetchAll();
    }
  }, [fetchAll, fetchParentReportData, parentId, teacherId, childId]);

  // Watchdog: fetchAll() no-ops (leaving isLoading true forever) if studentId
  // never hydrates from the store, and a hung network request has no other
  // timeout — both looked identical to a student as an infinite spinner.
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsLoading((stillLoading) => {
        if (stillLoading) {
          setError("This is taking longer than expected. Please try again.");
        }
        return false;
      });
    }, 15000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // ── Derived display values ─────────────────────────────
  const resolvedStudentName =
    studentProfile?.name || studentProfile?.username ? getStudentDisplayName(studentProfile) : undefined;
  const displayName =
    (childId && (parentId || teacherId) ? childName : undefined) ||
    resolvedStudentName ||
    (dashboardProfile?.name ? titleCase(dashboardProfile.name) : undefined) ||
    "Student";
  const displayGrade = studentProfile?.grade ?? dashboardProfile?.grade ?? null;
  const displayBoard = studentProfile?.school_board ?? dashboardProfile?.board ?? null;

  const data: ReportCardData = useMemo(() => {
    const ds = applySimulation(simMode, {
      totalSessions, subjects, chapters, skillTree, testSubmissions,
      progressReport, subjectEvolutions, chapterEvolutions,
    });
    const overallAvg =
      ds.subjects.length > 0 ? ds.subjects.reduce((sum, s) => sum + s.overall_score, 0) / ds.subjects.length : 0;
    return {
      ...ds,
      displayName,
      firstName: displayName.split(" ")[0],
      displayGrade,
      displayBoard,
      overallAvg,
      generatedAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      reportPeriod: new Date(progressReport?.updated_at ?? Date.now()).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };
  }, [simMode, totalSessions, subjects, chapters, skillTree, testSubmissions, progressReport, subjectEvolutions, chapterEvolutions, displayName, displayGrade, displayBoard]);

  const safeName = (displayName || "Student").replace(/[^a-z0-9]/gi, "_");
  const { isGenerating, triggerPrint, printPortal } = usePrintPdf({ data, role, filename: `${safeName}_Report_Card` });

  const isBrandNew = data.totalSessions === 0 && data.subjects.length === 0 && !data.progressReport;

  const ui: ReportCardUI = {
    variant: "screen",
    role,
    isSubjectOpen: (name) => openSubjects.has(name),
    toggleSubject,
    isExpOpen: (key) => openExpanders.has(key),
    toggleExp,
    isClampOpen: (key) => expandedClamps.has(key),
    toggleClamp,
    onStartSession: role === "student" ? () => router.push("/student") : undefined,
    onPrint: triggerPrint,
    isPdfGenerating: isGenerating,
    canDownload: !isBrandNew,
  };

  // ── Loading / Error ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={28} className="text-[#059F6D] animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Generating your report card…</p>
          <p className="text-xs text-slate-400 mt-1">Aggregating data across all subjects</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm text-red-500 font-medium mb-3">{error}</p>
          <button
            onClick={() => (childId && (parentId || teacherId) ? fetchParentReportData() : fetchAll())}
            className="px-4 py-2 rounded-lg bg-[#042E5C] text-white text-sm font-medium hover:bg-[#031d3a] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="report-root" data-ready="true" style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "Inter, sans-serif" }}>
      <link rel="stylesheet" href={FONT_HREF} />
      <style>{RC_STYLES}</style>
      <ReportCardBody data={data} ui={ui} />
      {printPortal}
    </div>
  );
}
