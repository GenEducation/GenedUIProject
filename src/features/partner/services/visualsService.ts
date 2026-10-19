import { authFetch } from "@/utils/authFetch";
import type {
  VisualDecisionIn,
  VisualDecisionOut,
  VisualDetail,
  VisualListParams,
  VisualRegenerateIn,
  VisualRegenerateOut,
  VisualSummary,
} from "../types/visuals";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

const VISUALS_BASE = `${API_BASE_URL}/v1/visuals`;

function toQuery(params: VisualListParams = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/**
 * The partner review calls for the visual library. Every route needs the
 * PARTNER role; the portal already sits behind `AuthGuard requiredRole="partner"`,
 * so a 403 here means a broken session and `authFetch`'s sign-out is right —
 * no `allow403`.
 *
 * No `response.ok` checks: `authFetch` throws `ApiRequestError` on any non-OK
 * response. A 409 (already decided, or the visual changed since it was shown)
 * is the expected, recoverable one — callers show `message` and reload.
 */
export const visualsService = {
  /** Newest first. Page with `before` = the last item's `created_at`. */
  listCandidates: async (params?: VisualListParams): Promise<VisualSummary[]> => {
    const response = await authFetch(`${VISUALS_BASE}/candidates${toQuery(params)}`);
    return response.json();
  },

  /** Accepted visuals only; `state` is ignored by the backend here. */
  listLibrary: async (params?: Omit<VisualListParams, "state" | "source_id">): Promise<VisualSummary[]> => {
    const response = await authFetch(`${VISUALS_BASE}/library${toQuery(params)}`);
    return response.json();
  },

  getCandidate: async (id: string): Promise<VisualDetail> => {
    const response = await authFetch(`${VISUALS_BASE}/candidates/${encodeURIComponent(id)}`);
    return response.json();
  },

  decide: async (id: string, body: VisualDecisionIn): Promise<VisualDecisionOut> => {
    const response = await authFetch(`${VISUALS_BASE}/candidates/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.json();
  },

  /** For a visual that is already rejected (no new version asked, or the last attempt failed). */
  regenerate: async (id: string, body: VisualRegenerateIn): Promise<VisualRegenerateOut> => {
    const response = await authFetch(`${VISUALS_BASE}/candidates/${encodeURIComponent(id)}/regenerate`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.json();
  },

  /**
   * `image_url` is a relative, signed, public path: render it with a plain
   * `<img>` (no auth header), never through `authFetch`.
   */
  imageSrc: (imageUrl: string | null): string | null => (imageUrl ? `${API_BASE_URL}${imageUrl}` : null),
};
