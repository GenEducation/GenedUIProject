import { authFetch } from "@/utils/authFetch";
import type { InstanceState, LearnerChaptersOut } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/**
 * The student's chapter list and lesson instances. Every route needs the
 * STUDENT role; the pages sit behind `AuthGuard requiredRole="student"`, so a
 * 403 means a broken session and `authFetch`'s sign-out is right.
 *
 * No `response.ok` checks: `authFetch` throws `ApiRequestError` on any non-OK
 * response, carrying the backend's readable `message`.
 */
export const learnerService = {
  /** The chapters this student can open for `subject` (exact taxonomy name). Grade and school come from the token. */
  chapters: async (subject: string): Promise<LearnerChaptersOut> => {
    const response = await authFetch(`${API_BASE_URL}/v1/learner/chapters?subject=${encodeURIComponent(subject)}`);
    return response.json();
  },

  /** Open (or resume) the student's lesson for a chapter. */
  openChapter: async (chapterId: string): Promise<InstanceState> => {
    const response = await authFetch(`${API_BASE_URL}/v1/chapters/${encodeURIComponent(chapterId)}/instances`, {
      method: "POST",
    });
    return response.json();
  },

  instance: async (instanceId: string): Promise<InstanceState> => {
    const response = await authFetch(`${API_BASE_URL}/v1/instances/${encodeURIComponent(instanceId)}`);
    return response.json();
  },

  /** The card's signed URL is relative to the API. */
  cardSrc: (imageUrl: string): string => `${API_BASE_URL}${imageUrl}`,
};
