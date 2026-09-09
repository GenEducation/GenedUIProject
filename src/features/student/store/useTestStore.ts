import { create } from "zustand";
import { testService } from "../services/testService";
import {
  CreateChapterTestResponse,
  SubmitTestResponse,
  Answer,
  CreateChapterTestRequest,
  Question,
  StudentTestSummary,
} from "../types/test";
import { asError } from "@/utils/errors";

function buildAnswerString(
  question: Question,
  answer: string,
  justification: string | undefined,
  matchSelections: Record<number, string> | undefined
): string {
  switch (question.type) {
    case "true_false": {
      const j = justification?.trim();
      return j ? `${answer}. ${j}` : answer;
    }
    case "match_the_following": {
      if (!matchSelections) return "";
      return Object.entries(matchSelections)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([id, label]) => `${id}→${label}`)
        .join(", ");
    }
    default:
      return answer;
  }
}

interface TestState {
  currentTest: CreateChapterTestResponse | null;
  answers: Record<string, string>;
  justifications: Record<string, string>;
  matchSelections: Record<string, Record<number, string>>;
  testResult: SubmitTestResponse | null;
  studentTests: StudentTestSummary[];
  isLoading: boolean;
  isSubmitting: boolean;
  isLoadingTests: boolean;
  timerSeconds: number;
  /**
   * A freshly generated test is waiting for the student to say what to do with
   * it. Lives in the store rather than the page that kicked generation off,
   * because that page is often unmounted by the time preparation finishes.
   */
  testReadyPrompt: boolean;

  startTest: (request: CreateChapterTestRequest) => Promise<void>;
  updateAnswer: (questionId: string, answer: string) => void;
  updateJustification: (questionId: string, value: string) => void;
  updateMatchSelection: (questionId: string, selections: Record<number, string>) => void;
  submitTest: () => Promise<void>;
  loadTest: (testId: string) => Promise<void>;
  loadSubmission: (submissionId: string) => Promise<void>;
  loadStudentTests: (studentId: string) => Promise<void>;
  /** "Later" — close the prompt, leaving the test to be picked up from Practice. */
  dismissTestReadyPrompt: () => void;
  /** "Cancel" — close the prompt and drop the local copy of the test. */
  discardPreparedTest: () => void;
  resetTest: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  currentTest: null,
  answers: {},
  justifications: {},
  matchSelections: {},
  testResult: null,
  studentTests: [],
  isLoading: false,
  isSubmitting: false,
  isLoadingTests: false,
  timerSeconds: 0,
  testReadyPrompt: false,

  startTest: async (request) => {
    set({ isLoading: true, testResult: null, answers: {}, justifications: {}, matchSelections: {}, testReadyPrompt: false });
    try {
      const test = await testService.createChapterTest(request);
      const timerSeconds = (test.paper_meta?.suggested_time_minutes ?? 30) * 60;
      // Raising the prompt here rather than navigating from the caller is what
      // stops a slow generation from hijacking whatever page the student has
      // moved on to. Only generation opts in — loadTest() is always a direct
      // "open this test now" action and must stay immediate.
      set({ currentTest: test, timerSeconds, testReadyPrompt: true });
    } catch (error) {
      console.error("Failed to start test:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateAnswer: (questionId, answer) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
    }));
  },

  updateJustification: (questionId, value) => {
    set((state) => ({
      justifications: { ...state.justifications, [questionId]: value },
    }));
  },

  updateMatchSelection: (questionId, selections) => {
    set((state) => ({
      matchSelections: { ...state.matchSelections, [questionId]: selections },
    }));
  },

  submitTest: async () => {
    const { currentTest, answers, justifications, matchSelections } = get();
    if (!currentTest) return;

    set({ isSubmitting: true });
    try {
      const allQuestions = currentTest.sections?.flatMap((s) => s.questions) || [];
      const formattedAnswers: Answer[] = allQuestions
        .filter((q) => answers[q.question_id] || matchSelections[q.question_id])
        .map((q) => ({
          question_id: q.question_id,
          student_answer: buildAnswerString(
            q,
            answers[q.question_id] ?? "",
            justifications[q.question_id],
            matchSelections[q.question_id]
          ),
        }));

      const result = await testService.submitTest(currentTest.test_id, {
        answers: formattedAnswers,
      });
      set({ testResult: result });
    } catch (error) {
      console.error("Failed to submit test:", error);
    } finally {
      set({ isSubmitting: false });
    }
  },

  loadTest: async (testId) => {
    set({ isLoading: true, testResult: null, answers: {}, justifications: {}, matchSelections: {} });
    try {
      const test = await testService.getTest(testId);
      const timerSeconds = (test.paper_meta?.suggested_time_minutes ?? 30) * 60;
      set({ currentTest: test, timerSeconds });
    } catch (error) {
      console.error("Failed to load test:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadSubmission: async (submissionId) => {
    set({ isSubmitting: true });
    try {
      const result = await testService.getSubmission(submissionId);
      set({ testResult: result });
    } catch (error) {
      if (asError(error).status !== 404) {
        console.error("Failed to load submission:", error);
      }
    } finally {
      set({ isSubmitting: false });
    }
  },

  loadStudentTests: async (studentId) => {
    set({ isLoadingTests: true });
    try {
      const tests = await testService.listStudentTests(studentId);
      set({ studentTests: tests });
    } catch (error) {
      console.error("Failed to load student tests:", error);
    } finally {
      set({ isLoadingTests: false });
    }
  },

  dismissTestReadyPrompt: () => set({ testReadyPrompt: false }),

  discardPreparedTest: () => {
    set({ testReadyPrompt: false });
    get().resetTest();
  },

  resetTest: () =>
    set({
      currentTest: null,
      answers: {},
      justifications: {},
      matchSelections: {},
      testResult: null,
      timerSeconds: 0,
    }),
}));
