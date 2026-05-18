import { create } from "zustand";
import { testService } from "../services/testService";
import {
  CreateChapterTestResponse,
  SubmitTestResponse,
  Answer,
  CreateChapterTestRequest,
  Question,
} from "../types/test";

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
  isLoading: boolean;
  isSubmitting: boolean;
  timerSeconds: number;

  startTest: (request: CreateChapterTestRequest) => Promise<void>;
  updateAnswer: (questionId: string, answer: string) => void;
  updateJustification: (questionId: string, value: string) => void;
  updateMatchSelection: (questionId: string, selections: Record<number, string>) => void;
  submitTest: () => Promise<void>;
  resetTest: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  currentTest: null,
  answers: {},
  justifications: {},
  matchSelections: {},
  testResult: null,
  isLoading: false,
  isSubmitting: false,
  timerSeconds: 0,

  startTest: async (request) => {
    set({ isLoading: true, testResult: null, answers: {}, justifications: {}, matchSelections: {} });
    try {
      const test = await testService.createChapterTest(request);
      const timerSeconds = (test.paper_meta?.suggested_time_minutes ?? 30) * 60;
      set({ currentTest: test, timerSeconds });
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
      const allQuestions = currentTest.sections.flatMap((s) => s.questions);
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
