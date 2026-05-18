export type ZPDVerdict = "ABOVE" | "AT" | "BELOW";
export type ScaffoldingTier = "Heavy Scaffolding" | "Moderate Scaffolding" | "Socratic" | "Stretch";
export type QuestionType = "multiple_choice" | "short_answer" | "open_ended";

export interface Question {
  question_id: string;
  type: QuestionType;
  prompt: string;
  options: string[] | null;
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

export interface CreateChapterTestResponse {
  test_id: string;
  document_title: string;
  sections: TestSection[];
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
  verdict: ZPDVerdict;
}

export interface GradedQuestion {
  question_id: string;
  score_0_1: number;
  rationale: string;
}

export interface SubmitTestResponse {
  submission_id: string;
  overall_verdict: ZPDVerdict;
  overall_score: number;
  section_results: Record<string, SectionResult>;
  graded_questions: GradedQuestion[];
}
