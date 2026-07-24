// Shared data shapes for the student report card and its print/PDF layout.
// Scores from the API are 0–1 floats (multiply by 100 for display) EXCEPT
// ChapterMasteryItem.completion_percentage, which is already 0–100.

export interface SubjectData {
  subject: string;
  overall_score: number;
  skill_index: number;
  adaptive_mode: string;
  session_count: number;
}

export interface ChapterMasteryItem {
  subject: string;
  document_title: string;
  completion_percentage: number;
  mastery_score: number;
  study_count: number;
  grade: number;
  chapter_report?: string | null;
  status?: string | null;
  is_curriculum?: boolean;
  is_system?: boolean;
  is_placeholder?: boolean;
  time_minutes?: number;
  time_sessions?: number;
}

export interface SkillLOItem {
  skill_id: string;
  skill_name: string;
  mastery_level: number;
  assessment_count: number;
  last_assessed_at?: string | null;
  justification?: string | null;
}

export interface SkillConceptItem {
  c_id: string;
  c_name: string;
  los: SkillLOItem[];
}

export interface SkillCGItem {
  subject: string;
  cg_id: string;
  cg_name: string;
  avg_mastery: number;
  concepts: SkillConceptItem[];
}

export interface TestSubmission {
  submission_id: string;
  test_id: string;
  document_title: string;
  subject: string;
  grade: number;
  overall_score: number;
  overall_verdict: string;
  section_results: Record<string, { score?: number; correct?: number; total?: number; verdict?: string }>;
  submitted_at: string;
}

export interface DashboardProfile {
  name: string;
  grade?: number | null;
  board?: string | null;
  avatar_initials: string;
}

export interface EvolutionAnalysisData {
  student_id: string;
  subject: string;
  document_title: string;
  conversation_count: number;
  adapted: boolean | null;
  headline: string | null;
  skill_score_trajectory: string | null;
  analysis_json: Record<string, any> | null;
  analysis_markdown: string | null;
  updated_at: string | null;
}

export interface SubjectEvolutionData {
  student_id: string;
  subject: string;
  chapter_count: number;
  overall_adapted: boolean | null;
  headline: string | null;
  subject_skill_trajectory: string | null;
  analysis_json: Record<string, any> | null;
  analysis_markdown: string | null;
  updated_at: string | null;
}

export interface StudentProgressData {
  student_id: string;
  subject_count: number;
  headline: string | null;
  overall_assessment: string | null;
  tutor_effectiveness: string | null;
  report_json: Record<string, any> | null;
  report_markdown: string | null;
  updated_at: string | null;
}

/** The mutable slice of fetched data that the dev `?simulate=` helper transforms. */
export interface ReportCardDataset {
  totalSessions: number;
  subjects: SubjectData[];
  chapters: ChapterMasteryItem[];
  skillTree: SkillCGItem[];
  testSubmissions: TestSubmission[];
  progressReport: StudentProgressData | null;
  subjectEvolutions: SubjectEvolutionData[];
  chapterEvolutions: EvolutionAnalysisData[];
}

/** Everything the presentational body/print layout needs — data plus a few
 *  derived display values computed once in the container. */
export interface ReportCardData extends ReportCardDataset {
  displayName: string;
  firstName: string;
  displayGrade: number | null;
  displayBoard: string | null;
  overallAvg: number;
  generatedAt: string;
  reportPeriod: string;
}

export type ReportRole = "student" | "parent" | "teacher";
export type ReportVariant = "screen" | "print";

/** UI wiring passed from the container to the body. In print variant the
 *  isOpen* predicates all return true so every section renders expanded. */
export interface ReportCardUI {
  variant: ReportVariant;
  role: ReportRole;
  isSubjectOpen: (name: string) => boolean;
  toggleSubject: (name: string) => void;
  isExpOpen: (key: string) => boolean;
  toggleExp: (key: string) => void;
  isClampOpen: (key: string) => boolean;
  toggleClamp: (key: string) => void;
  onStartSession?: () => void;
  onPrint?: () => void;
  isPdfGenerating?: boolean;
  canDownload?: boolean;
}
