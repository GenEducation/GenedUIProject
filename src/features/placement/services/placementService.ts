import { authFetch } from "@/utils/authFetch";
import type {
  PlacementBlockAnswer,
  PlacementBlockAnswerResponse,
  PlacementBlockContent,
  PlacementResult,
  PlacementStartResponse,
  PlacementStatus,
} from "../types/placement";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

const PLACEMENT_BASE = `${API_BASE_URL}/api/onboarding/placement`;

/**
 * No `if (!response.ok)` branches here on purpose.
 *
 * `authFetch` already throws `ApiRequestError` on every non-OK response, with
 * `error_code` lifted off the body — so the old `onboardingService`'s manual
 * ok-checks were unreachable dead code that also swallowed the error code.
 * Callers narrow with `asError(e).error_code` and compare against
 * `PLACEMENT_ERROR`.
 */
export const placementService = {
  /** The gate: decides whether a student is routed into the form at all. */
  getStatus: async (studentId: string): Promise<PlacementStatus> => {
    const response = await authFetch(`${PLACEMENT_BASE}/status/${studentId}`);
    return response.json();
  },

  /**
   * Creates the attempt and freezes the item order, or returns the existing
   * one untouched. This is also the resume call — safe on every entry to the
   * flow. Board and grade come from the student record; do not send them.
   *
   * Hands back `current_block` — a whole subject's items at once, not one
   * item — since the backend now batches by subject block.
   */
  start: async (studentId: string): Promise<PlacementStartResponse> => {
    const response = await authFetch(`${PLACEMENT_BASE}/start`, {
      method: "POST",
      body: JSON.stringify({ student_id: studentId }),
    });
    return response.json();
  },

  /**
   * Rarely needed — `start` and the block POST both hand back the next block.
   * Exists for a refresh mid-block and for a "review my answers" pass.
   * `block_index` may not exceed the current block; reading ahead returns
   * ONBD_1106.
   */
  getBlock: async (attemptId: string, blockIndex?: number): Promise<PlacementBlockContent> => {
    const query = blockIndex === undefined ? "" : `?block_index=${blockIndex}`;
    const response = await authFetch(`${PLACEMENT_BASE}/${attemptId}/block${query}`);
    return response.json();
  },

  /**
   * Grades every answer in the current subject block in one call and returns
   * the next block. Idempotent: replaying a block returns `accepted: 0` and
   * changes nothing — a wrong second answer cannot overwrite a right first
   * one. Retry freely on a flaky connection.
   *
   * Partial blocks are allowed — send only what the student actually
   * answered; resuming re-serves the same block with the rest still to do.
   */
  submitBlock: async (
    attemptId: string,
    answers: PlacementBlockAnswer[],
  ): Promise<PlacementBlockAnswerResponse> => {
    const response = await authFetch(`${PLACEMENT_BASE}/${attemptId}/block`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    return response.json();
  },

  /** ONBD_1107 while the form is still in progress. */
  getResult: async (attemptId: string): Promise<PlacementResult> => {
    const response = await authFetch(`${PLACEMENT_BASE}/${attemptId}/result`);
    return response.json();
  },
};
