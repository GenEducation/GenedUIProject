import { authFetch } from "@/utils/authFetch";
import {
  CreateChapterTestRequest,
  CreateChapterTestResponse,
  SubmitTestRequest,
  SubmitTestResponse,
  StudentTestSummary
} from "../types/test";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export const testService = {
  createChapterTest: async (request: CreateChapterTestRequest, signal?: AbortSignal): Promise<CreateChapterTestResponse> => {
    const response = await authFetch(`${API_BASE_URL}/create-chapter-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Test Creation Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to create chapter test: ${response.status}`);
    }

    return response.json();
  },

  submitTest: async (testId: string, request: SubmitTestRequest): Promise<SubmitTestResponse> => {
    const response = await authFetch(`${API_BASE_URL}/tests/${testId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Test Submission Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to submit test: ${response.status}`);
    }

    return response.json();
  },

  getTest: async (testId: string, signal?: AbortSignal): Promise<CreateChapterTestResponse> => {
    const response = await authFetch(`${API_BASE_URL}/tests/${testId}`, { signal });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Get Test Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to get test: ${response.status}`);
    }

    return response.json();
  },

  listStudentTests: async (studentId: string, signal?: AbortSignal): Promise<StudentTestSummary[]> => {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/tests`, { signal });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("List Student Tests Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to list student tests: ${response.status}`);
    }

    return response.json();
  },

  getSubmission: async (submissionId: string, signal?: AbortSignal): Promise<SubmitTestResponse> => {
    const response = await authFetch(`${API_BASE_URL}/submissions/${submissionId}`, { signal });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Get Submission Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Failed to get submission: ${response.status}`);
    }

    return response.json();
  }
};
