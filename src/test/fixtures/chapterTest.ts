import type {
  CreateChapterTestResponse,
  Question,
  QuestionType,
} from "@/features/student/types/test";

function question(type: QuestionType, over: Partial<Question> = {}): Question {
  return {
    question_id: "q",
    type,
    prompt: "?",
    options: null,
    marks: 1,
    paper_section: "A",
    blooms_level: "remember",
    match_pairs: null,
    assertion: null,
    reason: null,
    extract_passage: null,
    justification_required: false,
    ...over,
  };
}

/** A one-section chapter test with an MCQ, a justified true/false, and a match. */
export function makeChapterTest(over: Partial<CreateChapterTestResponse> = {}): CreateChapterTestResponse {
  return {
    test_id: "test-1",
    document_title: "Chapter 3: Photosynthesis",
    subject: "Science",
    grade: 6,
    sections: [
      {
        main_heading: "Fundamentals",
        tier: "Moderate Scaffolding",
        avg_mastery: 0.6,
        questions: [
          question("multiple_choice", {
            question_id: "q1",
            prompt: "What is the primary product of photosynthesis?",
            options: ["Glucose", "Oxygen", "Water", "Carbon Dioxide"],
          }),
          question("true_false", {
            question_id: "q2",
            prompt: "Chlorophyll absorbs all colors of light equally.",
            justification_required: true,
          }),
          question("match_the_following", {
            question_id: "q3",
            prompt: "Match each structure to its role.",
            marks: 2,
            match_pairs: [
              { left: "Stroma", right: "Sugar synthesis" },
              { left: "Thylakoid", right: "Light reactions" },
            ],
          }),
        ],
      },
    ],
    paper_meta: {
      total_marks: 4,
      suggested_time_minutes: 15,
      general_instructions: ["Read carefully."],
      sections: [
        {
          label: "A",
          title: "Section A",
          question_types: ["multiple_choice", "true_false", "match_the_following"],
          marks_per_question: "1-2",
          question_count: 3,
        },
      ],
    },
    ...over,
  };
}
