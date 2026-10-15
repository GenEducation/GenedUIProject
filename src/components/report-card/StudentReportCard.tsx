"use client";

import { useState, useEffect, useCallback, useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { studentService } from "@/features/student/services/studentService";
import { getStudentDisplayName, titleCase } from "@/features/student/utils/displayName";
import { FunFactCard } from "@/components/shared/loaders/FunFactCard";
import type {
  SubjectData, ChapterMasteryItem, SkillCGItem, TestSubmission, DashboardProfile,
  EvolutionAnalysisData, SubjectEvolutionData, StudentProgressData,
  ReportCardData, ReportCardDataset, ReportCardUI, ReportRole,
} from "./types";
import { RC_STYLES, RC_SCREEN_STYLES } from "./styles";
import { applySimulation } from "./utils";
import { ReportCardScreen, isEmptyReport } from "./screen/ReportCardScreen";
import { Icon } from "./screen/icons";
import { Button } from "@/components/ui/Button";
import { usePrintPdf } from "./usePrintPdf";
import { loadV1Report, type ReportSummaryFacts, type ReportWho, type V1Dataset } from "./v1Report";
import { ReportExtrasProvider } from "./sections/ReportExtras";
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

export function StudentReportCard({
  parentId,
  teacherId,
  childId,
  childName,
  loadingFallback,
}: {
  parentId?: string;
  teacherId?: string;
  childId?: string;
  childName?: string;
  /** Replaces the default loading screen (the parent portal has its own). */
  loadingFallback?: ReactNode;
} = {}) {
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
  // The new backend's header facts: who the report is for, and the answer totals (alone vs with help).
  const [v1Profile, setV1Profile] = useState<V1Dataset["profile"] | null>(null);
  const [v1Summary, setV1Summary] = useState<ReportSummaryFacts | null>(null);

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

  /** Fill every dataset slice at once (each loader returns them all). */
  const applyDataset = (d: ReportCardDataset) => {
    setTotalSessions(d.totalSessions);
    setSubjects(d.subjects);
    setChapters(d.chapters);
    setSkillTree(d.skillTree);
    setTestSubmissions(d.testSubmissions);
    setProgressReport(d.progressReport);
    setSubjectEvolutions(d.subjectEvolutions);
    setChapterEvolutions(d.chapterEvolutions);
  };

  // The teacher's report still comes from the MVP route: the new backend has no teacher equivalent yet.
  const fetchTeacherReportData = useCallback(async () => {
    if (!childId || !teacherId) return;
    setIsLoading(true);
    setError(null);
    try {
      const catalog = await loadSubjectCatalog();
      const data = await studentService.fetchTeacherReport(teacherId, childId);
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
      console.error("[ReportCard] Failed to load teacher report data:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, childId]);

  // Student and parent: the new backend's learner routes (see v1Report.ts).
  const who: ReportWho | null = useMemo(
    () => (parentId && childId ? { role: "parent", childId } : studentId ? { role: "student", studentId } : null),
    [parentId, childId, studentId],
  );
  const fetchV1 = useCallback(async () => {
    if (!who) return;
    setIsLoading(true);
    setError(null);
    try {
      const dataset = await loadV1Report(who);
      applyDataset(dataset);
      setV1Profile(dataset.profile);
      setV1Summary(dataset.summary);
    } catch (err) {
      console.error("[ReportCard] Failed to load data:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [who]);

  const load = useCallback(
    () => (teacherId && childId ? fetchTeacherReportData() : fetchV1()),
    [teacherId, childId, fetchTeacherReportData, fetchV1],
  );
  useEffect(() => {
    void load();
  }, [load]);

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
  // A parent's own profile says nothing about the child: the report carries the child's grade and board.
  const reportIsAboutAnother = role !== "student";
  const displayGrade = (reportIsAboutAnother ? v1Profile?.grade : studentProfile?.grade) ?? v1Profile?.grade ?? dashboardProfile?.grade ?? null;
  const displayBoard = (reportIsAboutAnother ? v1Profile?.board : studentProfile?.school_board) ?? v1Profile?.board ?? dashboardProfile?.board ?? null;

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

  const isBrandNew = isEmptyReport(data);
  // The PDF layout is built on the MVP's data (scores, tests, analyses); for the new backend it's coming soon.
  const isV1 = role !== "teacher";

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
    canDownload: !isBrandNew && !isV1,
  };

  // ── Loading / Error ─────────────────────────────────────
  if (isLoading) {
    if (loadingFallback) return <>{loadingFallback}</>;
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={28} className="text-[var(--primary)] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)] font-medium">Generating your report card…</p>
          <FunFactCard className="mt-6" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm text-[var(--danger-ink)] font-medium mb-3">{error}</p>
          <Button
            variant="outline"
            onClick={() => void load()}
            leadingIcon={<Icon name="misc/refresh" size={16} />}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <>
      {/* Source Serif + JetBrains Mono for the print layout and the legacy rc-* parts. */}
      <link rel="stylesheet" href={FONT_HREF} />
      <style>{RC_STYLES + RC_SCREEN_STYLES}</style>
      <ReportExtrasProvider who={role === "teacher" ? null : who} summary={v1Summary}>
        <ReportCardScreen data={data} ui={ui} />
      </ReportExtrasProvider>
      {printPortal}
    </>
  );
}
