import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const studentPath = (studentId: string) => `${API_BASE_URL}/students/${encodeURIComponent(studentId)}`;

/** The learner's study session in progress (`GET /students/{id}/session/current`). `open: false`: no session right now. */
export interface StudySession {
  open: boolean;
  started_at: string | null;
  elapsed_seconds: number;
  credited_seconds: number;
  server_time: string;
}

/** One chapter's estimated time (`GET /students/{id}/time/by-chapter`). */
export interface ChapterTime {
  chapter_id: string;
  total_minutes: number;
}

export const activityService = {
  currentSession: async (studentId: string): Promise<StudySession> =>
    (await authFetch(`${studentPath(studentId)}/session/current`, { headers: { accept: "application/json" } })).json(),

  chapterTimes: async (studentId: string): Promise<ChapterTime[]> =>
    (await authFetch(`${studentPath(studentId)}/time/by-chapter`, { headers: { accept: "application/json" } })).json(),
};
