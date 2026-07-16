import { authFetch } from "@/utils/authFetch";
import { Moment, CreateMomentRequest, UpdateMomentRequest } from "../types/moments";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export const momentsService = {
  getMoments: async (userId: string): Promise<Moment[]> => {
    const response = await authFetch(
      `${API_BASE_URL}/moments?user_id=${encodeURIComponent(userId)}`
    );
    if (!response.ok) throw new Error(`Failed to fetch moments: ${response.status}`);
    return response.json();
  },

  createMoment: async (request: CreateMomentRequest): Promise<Moment> => {
    const response = await authFetch(`${API_BASE_URL}/moments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to create moment: ${response.status}`);
    return response.json();
  },

  updateMoment: async (momentId: string, request: UpdateMomentRequest): Promise<Moment> => {
    const response = await authFetch(`${API_BASE_URL}/moments/${encodeURIComponent(momentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to update moment: ${response.status}`);
    return response.json();
  },

  deleteMoment: async (momentId: string): Promise<void> => {
    const response = await authFetch(
      `${API_BASE_URL}/moments/${encodeURIComponent(momentId)}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete moment: ${response.status}`);
  },
};
