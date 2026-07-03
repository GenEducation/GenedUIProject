import type { SubmitTestResponse } from "@/features/student/types/test";

export function makeSubmitResult(over: Partial<SubmitTestResponse> = {}): SubmitTestResponse {
  return {
    submission_id: "sub-1",
    overall_verdict: "AT",
    overall_score: 0.75,
    section_results: {
      "Section A": {
        actual_score: 0.75,
        expected_score: 0.7,
        delta: 0.05,
        verdict: "AT",
        total_marks: 4,
        marks_obtained: 3,
      },
    },
    graded_questions: [
      { question_id: "q1", score_0_1: 1, rationale: "Correct.", marks: 1, marks_awarded: 1 },
      { question_id: "q2", score_0_1: 0.5, rationale: "Partly right.", marks: 1, marks_awarded: 0.5 },
      { question_id: "q3", score_0_1: 1, rationale: "All matched.", marks: 2, marks_awarded: 2 },
    ],
    ...over,
  };
}
