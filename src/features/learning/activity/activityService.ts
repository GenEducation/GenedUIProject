import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const studentPath = (studentId: string) => `${API_BASE_URL}/students/${encodeURIComponent(studentId)}`;

/** One chapter's estimated time (`GET /students/{id}/time/by-chapter`). */
export interface ChapterTime {
  chapter_id: string;
  total_minutes: number;
}

export const activityService = {
  chapterTimes: async (studentId: string): Promise<ChapterTime[]> =>
    (await authFetch(`${studentPath(studentId)}/time/by-chapter`, { headers: { accept: "application/json" } })).json(),
};
