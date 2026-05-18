export type ZPDVerdict = "ABOVE" | "AT" | "BELOW";
export type ScaffoldingTier = "Heavy Scaffolding" | "Moderate Scaffolding" | "Socratic" | "Stretch";

export type QuestionType =
  | "multiple_choice"
  | "fill_in_the_blank"
  | "short_answer"
  | "long_answer"
  | "application"
  | "true_false"
  | "match_the_following"
  | "assertion_reasoning"
  | "extract_based"
  | "open_ended";

export type BloomsLevel =
  | "remember" | "understand" | "apply"
  | "analyze"  | "evaluate"   | "create";

export type PaperSection = "A" | "B" | "C";

export interface MatchPair {
  left: string;
  right: string;
}

export interface Question {
  question_id: string;
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  marks: 1 | 2 | 3 | 5;
  paper_section: PaperSection;
  blooms_level: BloomsLevel;
  match_pairs: MatchPair[] | null;
  assertion: string | null;
  reason: string | null;
  extract_passage: string | null;
  justification_required: boolean;
}

export interface TestSection {
  main_heading: string;
  tier: ScaffoldingTier;
  avg_mastery: number;
  questions: Question[];
}

export interface CreateChapterTestRequest {
  student_id: string;
  chapter_query: string;
  subject: string;
  grade: number;
  questions_per_section: number;
}

export interface PaperSectionMeta {
  label: PaperSection;
  title: string;
  question_types: string[];
  marks_per_question: string;
  question_count: number;
}

export interface PaperMeta {
  total_marks: number;
  suggested_time_minutes: number;
  general_instructions: string[];
  sections: PaperSectionMeta[];
}

export interface CreateChapterTestResponse {
  test_id: string;
  document_title: string;
  subject: string;
  grade: number;
  sections: TestSection[];
  paper_meta: PaperMeta | null;
}

export interface Answer {
  question_id: string;
  student_answer: string;
}

export interface SubmitTestRequest {
  answers: Answer[];
}

export interface SectionResult {
  actual_score: number;
  expected_score: number;
  delta: number;
  verdict: ZPDVerdict;
  total_marks: number;
  marks_obtained: number;
}

export interface GradedQuestion {
  question_id: string;
  score_0_1: number;
  rationale: string;
  marks: number;
  marks_awarded: number;
}

export interface SubmitTestResponse {
  submission_id: string;
  overall_verdict: ZPDVerdict;
  overall_score: number;
  section_results: Record<string, SectionResult>;
  graded_questions: GradedQuestion[];
}
