import { create } from "zustand";
import { testService } from "../services/testService";
import { 
  CreateChapterTestResponse, 
  SubmitTestResponse, 
  Answer, 
  CreateChapterTestRequest 
} from "../types/test";

interface TestState {
  currentTest: CreateChapterTestResponse | null;
  answers: Record<string, string>; // question_id -> student_answer
  testResult: SubmitTestResponse | null;
  isLoading: boolean;
  isSubmitting: boolean;

  // Actions
  startTest: (request: CreateChapterTestRequest) => Promise<void>;
  updateAnswer: (questionId: string, answer: string) => void;
  submitTest: () => Promise<void>;
  resetTest: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  currentTest: null,
  answers: {},
  testResult: null,
  isLoading: false,
  isSubmitting: false,

  startTest: async (request) => {
    set({ isLoading: true, testResult: null, answers: {} });
    try {
      const test = await testService.createChapterTest(request);
      set({ currentTest: test });
    } catch (error) {
      console.error("Failed to start test:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateAnswer: (questionId, answer) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer }
    }));
  },

  submitTest: async () => {
    const { currentTest, answers } = get();
    if (!currentTest) return;

    set({ isSubmitting: true });
    try {
      const formattedAnswers: Answer[] = Object.entries(answers).map(([question_id, student_answer]) => ({
        question_id,
        student_answer
      }));

      const result = await testService.submitTest(currentTest.test_id, { answers: formattedAnswers });
      set({ testResult: result });
    } catch (error) {
      console.error("Failed to submit test:", error);
    } finally {
      set({ isSubmitting: false });
    }
  },

  resetTest: () => set({ currentTest: null, answers: {}, testResult: null })
}));
