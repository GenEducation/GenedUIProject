/**
 * Parent service — mobile port of the web src/features/parent/services/parentService.ts.
 * All calls go through authFetch which injects Bearer token and handles 401/403.
 */
import { authFetch } from "./authFetch";
import type { LinkedChild } from "../types/parent";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function deriveInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function mapChild(raw: Record<string, unknown>): LinkedChild {
  const name = String(raw.username ?? raw.name ?? raw.student_name ?? "");
  return {
    id:       String(raw.student_id ?? raw.id ?? ""),
    name,
    grade:    String(raw.grade ?? ""),
    initials: deriveInitials(name) || "?",
    status:   (raw.status as LinkedChild["status"]) ?? "PENDING",
  };
}

export const parentService = {
  fetchLinkedStudents: async (parentId: string): Promise<LinkedChild[]> => {
    const res = await authFetch(
      `${BASE}/parent/students?parent_id=${encodeURIComponent(parentId)}`
    );
    const data = await res.json();
    const raw: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : (data?.students ?? data?.data ?? []);
    return raw
      .filter((item) => "student_id" in item || "id" in item)
      .map(mapChild);
  },

  linkStudent: async (parentId: string, studentId: string): Promise<LinkedChild> => {
    const res = await authFetch(`${BASE}/parent/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent_id: parentId, student_id: studentId }),
    });
    return mapChild(await res.json());
  },

  updateStudentStatus: async (
    parentId: string,
    studentId: string,
    status: "APPROVED" | "REJECTED"
  ): Promise<LinkedChild> => {
    const res = await authFetch(
      `${BASE}/parent/link/${encodeURIComponent(studentId)}/status?parent_id=${encodeURIComponent(parentId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    return mapChild(await res.json());
  },

  unlinkStudent: async (parentId: string, studentId: string): Promise<void> => {
    await authFetch(
      `${BASE}/parent/link/${encodeURIComponent(studentId)}?parent_id=${encodeURIComponent(parentId)}`,
      { method: "DELETE" }
    );
  },

  fetchParentReport: async (
    parentId: string,
    studentId: string
  ): Promise<unknown> => {
    const res = await authFetch(
      `${BASE}/parent/students/${encodeURIComponent(studentId)}/report?parent_id=${encodeURIComponent(parentId)}`
    );
    return res.json();
  },
};
