/**
 * Moments service — mobile port of the web parent momentsService.
 * CRUD over /moments using authFetch for Bearer-token injection.
 */
import { authFetch } from "./authFetch";
import type { Moment, CreateMomentRequest, UpdateMomentRequest } from "../types/moments";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const momentsService = {
  getMoments: async (userId: string): Promise<Moment[]> => {
    const res = await authFetch(`${BASE}/moments?user_id=${encodeURIComponent(userId)}`);
    return res.json();
  },

  createMoment: async (request: CreateMomentRequest): Promise<Moment> => {
    const res = await authFetch(`${BASE}/moments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return res.json();
  },

  updateMoment: async (momentId: string, request: UpdateMomentRequest): Promise<Moment> => {
    const res = await authFetch(`${BASE}/moments/${encodeURIComponent(momentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return res.json();
  },

  deleteMoment: async (momentId: string): Promise<void> => {
    await authFetch(`${BASE}/moments/${encodeURIComponent(momentId)}`, { method: "DELETE" });
  },
};
