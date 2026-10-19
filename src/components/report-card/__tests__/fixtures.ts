import type {
  ChapterMasteryItem,
  EvolutionAnalysisData,
  ReportCardData,
  SubjectData,
  SubjectEvolutionData,
} from "../types";

// A realistic mid-term dataset: four subjects across all mastery bands, a
// mix of completed / in-progress / unstarted chapters, analysed chapters with
// session scores, and an overall progress report.

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 5, 12);
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

function chapter(subject: string, title: string, mastery: number, completion: number, sessions: number, extra: Partial<ChapterMasteryItem> = {}): ChapterMasteryItem {
  return {
    subject,
    document_title: title,
    completion_percentage: completion,
    mastery_score: mastery,
    study_count: sessions,
    grade: 8,
    status: completion >= 100 ? "completed" : completion > 0 ? "in_progress" : null,
    time_minutes: sessions ? sessions * 18 : undefined,
    time_sessions: sessions || undefined,
    ...extra,
  };
}

function evo(subject: string, title: string, scores: number[], updated: number, headline?: string): EvolutionAnalysisData {
  return {
    student_id: "s1",
    subject,
    document_title: title,
    conversation_count: scores.length,
    adapted: true,
    headline: headline ?? null,
    skill_score_trajectory: null,
    analysis_json: {
      per_conversation: scores.map((s, i) => ({ overall_score: s, stage_label: `Session ${i + 1}`, tutor_observations: ["Explained the idea in their own words."] })),
      dimension_analyses: [{ dimension_name: "Conceptual understanding", delta: 0.12, key_observation: "Connects new ideas to earlier chapters." }],
    },
    analysis_markdown: null,
    updated_at: daysAgo(updated),
  };
}

export const SUBJECTS: SubjectData[] = [
  { subject: "English", overall_score: 0.82, skill_index: 1.1, adaptive_mode: "PRACTICE", session_count: 18 },
  { subject: "Mathematics", overall_score: 0.61, skill_index: 0.9, adaptive_mode: "PRACTICE", session_count: 13 },
  { subject: "Science", overall_score: 0.47, skill_index: 0.8, adaptive_mode: "PRACTICE", session_count: 9 },
  { subject: "Social Science", overall_score: 0.34, skill_index: 0.7, adaptive_mode: "PRACTICE", session_count: 6 },
];

export const CHAPTERS: ChapterMasteryItem[] = [
  chapter("English", "Creative Writing", 0.86, 100, 5),
  chapter("English", "Poetry: The Road Not Taken", 0.8, 100, 4),
  chapter("English", "Grammar: Tenses", 0.78, 60, 3),
  chapter("English", "Reading Comprehension", 0, 0, 0),
  chapter("Mathematics", "Real Numbers", 0.68, 70, 1, { chapter_report: "### Summary of Current Session (70% complete)\nWorked through Euclid's division lemma.\n" }),
  chapter("Mathematics", "Polynomials", 0.92, 100, 4),
  chapter("Mathematics", "Coordinate Geometry", 0.52, 45, 3),
  chapter("Mathematics", "Linear Equations in Two Variables", 0, 0, 0),
  chapter("Science", "Human Biology", 0.55, 80, 4),
  chapter("Science", "Force and Pressure", 0.38, 30, 2),
  chapter("Science", "Light", 0, 0, 0),
  chapter("Social Science", "Indian Freedom Struggle", 0.34, 40, 3),
  chapter("Social Science", "Resources and Development", 0, 0, 0),
];

export const CHAPTER_EVOLUTIONS: EvolutionAnalysisData[] = [
  evo("English", "Poetry: The Road Not Taken", [0.62, 0.7, 0.74, 0.79], 9),
  evo("English", "Creative Writing", [0.72, 0.78, 0.81, 0.86, 0.88], 2, "Writing has grown more vivid and structured."),
  evo("Mathematics", "Polynomials", [0.58, 0.7, 0.84, 0.92], 6),
  evo("Mathematics", "Coordinate Geometry", [0.6, 0.55, 0.52], 3),
  evo("Science", "Human Biology", [0.4, 0.48, 0.55, 0.58], 1),
];

export const SUBJECT_EVOLUTIONS: SubjectEvolutionData[] = [
  {
    student_id: "s1",
    subject: "Mathematics",
    chapter_count: 3,
    overall_adapted: true,
    headline: "Algebra is clicking; geometry needs more visual practice.",
    subject_skill_trajectory: "Mastery rose steadily through Polynomials, then dipped in Coordinate Geometry where plotting slowed progress.",
    analysis_json: {
      subject_strengths: ["Factorising polynomials", "Checking answers"],
      subject_weaknesses: ["Plotting points accurately", "Word problems"],
      recommendations: ["Practise plotting with graph paper", { action: "Try two word problems per session" }],
      cross_chapter_patterns: [{ pattern_name: "Strong recall", summary: "Remembers formulas across chapters." }],
    },
    analysis_markdown: null,
    updated_at: daysAgo(3),
  },
];

export function makeData(overrides: Partial<ReportCardData> = {}): ReportCardData {
  return {
    totalSessions: 46,
    subjects: SUBJECTS,
    chapters: CHAPTERS,
    skillTree: [
      {
        subject: "Mathematics",
        cg_id: "alg",
        cg_name: "Algebra",
        avg_mastery: 0.74,
        concepts: [
          {
            c_id: "poly",
            c_name: "Polynomials",
            los: [
              { skill_id: "lo1", skill_name: "Factorise quadratics", mastery_level: 0.86, assessment_count: 4 },
              { skill_id: "lo2", skill_name: "Find zeroes", mastery_level: 0.42, assessment_count: 3 },
            ],
          },
        ],
      },
    ],
    testSubmissions: [
      {
        submission_id: "t1",
        test_id: "t1",
        document_title: "Polynomials",
        subject: "Mathematics",
        grade: 8,
        overall_score: 0.8,
        overall_verdict: "PASS",
        section_results: { MCQ: { correct: 8, total: 10 }, Short: { correct: 4, total: 5 } },
        submitted_at: daysAgo(5),
      },
    ],
    progressReport: {
      student_id: "s1",
      subject_count: 3,
      headline: "Consistent progress in English; Mathematics is building momentum.",
      overall_assessment:
        "Abeer shows steady improvement across sessions, with especially strong written expression. Focus next on geometry and on applying science concepts to real situations.",
      tutor_effectiveness: null,
      report_json: {
        universal_strengths: ["English shows strong performance (82% mastery).", "Consistent session completion and active engagement.", "Asks clarifying questions when stuck."],
        universal_weaknesses: ["Social Science needs focus (34% mastery)."],
        focus_areas: [{ area: "Coordinate Geometry and plotting", priority: "high" }],
      },
      report_markdown: null,
      updated_at: daysAgo(1),
    },
    subjectEvolutions: SUBJECT_EVOLUTIONS,
    chapterEvolutions: CHAPTER_EVOLUTIONS,
    displayName: "Abeer Khan",
    firstName: "Abeer",
    displayGrade: 8,
    displayBoard: "CBSE",
    overallAvg: SUBJECTS.reduce((s, x) => s + x.overall_score, 0) / SUBJECTS.length,
    generatedAt: "5 Oct 2026",
    reportPeriod: "October 2026",
    ...overrides,
  };
}

export const FIXTURE_NOW = NOW;
