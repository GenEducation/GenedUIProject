import { describe, it, expect, beforeEach, vi } from "vitest";

import { autoResetStore } from "@/test/helpers/resetStores";
import type {
  CreateChapterTestResponse,
  Question,
  QuestionType,
  SubmitTestResponse,
} from "../../types/test";

vi.mock("../../services/testService", () => ({
  testService: {
    createChapterTest: vi.fn(),
    getTest: vi.fn(),
    getSubmission: vi.fn(),
    submitTest: vi.fn(),
    listStudentTests: vi.fn(),
  },
}));

import { testService } from "../../services/testService";
import { useTestStore } from "../useTestStore";

const svc = vi.mocked(testService, true);

autoResetStore(useTestStore);

// ── fixtures ──────────────────────────────────────────────────────────────────
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

function testWith(questions: Question[], suggestedMinutes: number | null = 15): CreateChapterTestResponse {
  return {
    test_id: "test-1",
    document_title: "Ch 1",
    subject: "Science",
    grade: 6,
    sections: [{ main_heading: "A", tier: "Moderate Scaffolding", avg_mastery: 0.5, questions }],
    paper_meta:
      suggestedMinutes === null
        ? null
        : { total_marks: 3, suggested_time_minutes: suggestedMinutes, general_instructions: [], sections: [] },
  };
}

const okResult: SubmitTestResponse = {
  submission_id: "sub-1",
  overall_verdict: "AT",
  overall_score: 0.5,
  section_results: {},
  graded_questions: [],
};

/** Start a test with the given questions and return the answers payload submitTest received. */
async function submitAndCaptureAnswers(questions: Question[]) {
  svc.createChapterTest.mockResolvedValue(testWith(questions));
  svc.submitTest.mockResolvedValue(okResult);
  await useTestStore.getState().startTest({
    student_id: "s1",
    chapter_query: "c",
    subject: "Science",
    grade: 6,
    questions_per_section: 3,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTestStore — buildAnswerString via submit payload", () => {
  it("formats true_false with a justification as '<answer>. <justification>'", async () => {
    await submitAndCaptureAnswers([question("true_false", { question_id: "q1", justification_required: true })]);
    useTestStore.getState().updateAnswer("q1", "True");
    useTestStore.getState().updateJustification("q1", "it spins");

    await useTestStore.getState().submitTest();

    expect(svc.submitTest).toHaveBeenCalledWith("test-1", {
      answers: [{ question_id: "q1", student_answer: "True. it spins" }],
    });
  });

  it("formats true_false without a justification as the bare answer", async () => {
    await submitAndCaptureAnswers([question("true_false", { question_id: "q1" })]);
    useTestStore.getState().updateAnswer("q1", "False");

    await useTestStore.getState().submitTest();

    expect(svc.submitTest.mock.calls[0][1].answers[0].student_answer).toBe("False");
  });

  it("sorts match_the_following selections numerically, not lexically", async () => {
    await submitAndCaptureAnswers([question("match_the_following", { question_id: "q1" })]);
    // insertion order deliberately shuffled; key 10 must land AFTER key 2
    useTestStore.getState().updateMatchSelection("q1", { 10: "J", 1: "A", 2: "B" });

    await useTestStore.getState().submitTest();

    expect(svc.submitTest.mock.calls[0][1].answers[0].student_answer).toBe("1→A, 2→B, 10→J");
  });

  it("passes multiple_choice answers through unchanged", async () => {
    await submitAndCaptureAnswers([question("multiple_choice", { question_id: "q1" })]);
    useTestStore.getState().updateAnswer("q1", "Glucose");

    await useTestStore.getState().submitTest();

    expect(svc.submitTest.mock.calls[0][1].answers[0].student_answer).toBe("Glucose");
  });

  it("omits questions the student never answered", async () => {
    await submitAndCaptureAnswers([
      question("multiple_choice", { question_id: "q1" }),
      question("short_answer", { question_id: "q2" }),
    ]);
    useTestStore.getState().updateAnswer("q1", "answered");
    // q2 left blank

    await useTestStore.getState().submitTest();

    const payload = svc.submitTest.mock.calls[0][1].answers;
    expect(payload).toHaveLength(1);
    expect(payload[0].question_id).toBe("q1");
  });
});

describe("useTestStore — lifecycle", () => {
  it("startTest sets the timer from suggested_time_minutes", async () => {
    svc.createChapterTest.mockResolvedValue(testWith([question("short_answer")], 15));
    await useTestStore.getState().startTest({
      student_id: "s1", chapter_query: "c", subject: "S", grade: 6, questions_per_section: 3,
    });
    expect(useTestStore.getState().timerSeconds).toBe(15 * 60);
  });

  it("startTest defaults the timer to 30 minutes when paper_meta is missing", async () => {
    svc.createChapterTest.mockResolvedValue(testWith([question("short_answer")], null));
    await useTestStore.getState().startTest({
      student_id: "s1", chapter_query: "c", subject: "S", grade: 6, questions_per_section: 3,
    });
    expect(useTestStore.getState().timerSeconds).toBe(30 * 60);
  });

  it("resetTest clears the current test, answers, and result", async () => {
    await submitAndCaptureAnswers([question("short_answer", { question_id: "q1" })]);
    useTestStore.getState().updateAnswer("q1", "x");

    useTestStore.getState().resetTest();

    const s = useTestStore.getState();
    expect(s.currentTest).toBeNull();
    expect(s.answers).toEqual({});
    expect(s.matchSelections).toEqual({});
    expect(s.timerSeconds).toBe(0);
  });

  it("submitTest is a no-op with no current test", async () => {
    await useTestStore.getState().submitTest();
    expect(svc.submitTest).not.toHaveBeenCalled();
  });
});

describe("useTestStore — loadSubmission error handling", () => {
  it("swallows a 404 without logging", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    svc.getSubmission.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));

    await useTestStore.getState().loadSubmission("missing");

    expect(useTestStore.getState().testResult).toBeNull();
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("logs non-404 errors", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    svc.getSubmission.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));

    await useTestStore.getState().loadSubmission("x");

    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
