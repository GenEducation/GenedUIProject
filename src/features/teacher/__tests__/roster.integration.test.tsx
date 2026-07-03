import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useTeacherStore } from "../store/useTeacherStore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

autoResetStore(useTeacherStore);

// Store-driven integration: real teacherService -> real authFetch -> MSW. Exercises
// response normalization, auth-header injection, and the store's optimistic logic
// together, without mocking the service layer.

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("teacher", { profile: { user_id: "t1" } });
  useTeacherStore.getState().setTeacherProfile({
    user_id: "t1",
    username: "ms_ada",
    email: "ada@school.edu",
    role: "TEACHER",
    full_name: "Ada",
    title: "Teacher",
    subjects: ["Mathematics"],
  });
});

describe("teacher roster (integration)", () => {
  it("loads students from the default handler into the store", async () => {
    await useTeacherStore.getState().fetchStudents();
    const ids = useTeacherStore.getState().students.map((s) => s.student_id);
    expect(ids).toEqual(["s1", "s2"]);
  });

  it("approve sends x-user-role header, optimistically flips to APPROVED, and refetches overview", async () => {
    let sawRole: string | null = null;
    server.use(
      http.patch(`${BASE}/teacher/students/:studentId/assign`, ({ request, params }) => {
        sawRole = request.headers.get("x-user-role");
        return HttpResponse.json({ student_id: params.studentId, status: "APPROVED", subject: "Mathematics" });
      }),
      http.get(`${BASE}/teacher/overview`, () =>
        HttpResponse.json({ total_students: 2, pending: 0, approved: 2 }),
      ),
    );

    await useTeacherStore.getState().fetchStudents();
    const res = await useTeacherStore.getState().approve("s1", "Mathematics");

    expect(res).toEqual({ ok: true });
    expect(sawRole).toBe("TEACHER"); // authFetch injected the role header
    expect(useTeacherStore.getState().students.find((s) => s.student_id === "s1")?.status).toBe("APPROVED");
    expect(useTeacherStore.getState().overview?.approved).toBe(2);
  });

  it("surfaces a 403 approval block as a recoverable failure, leaving the student PENDING", async () => {
    server.use(
      http.patch(`${BASE}/teacher/students/:studentId/assign`, () =>
        HttpResponse.json(
          { error_code: "TCHR_1104", message: "Student not admitted to your school.", request_id: "r1" },
          { status: 403 },
        ),
      ),
    );

    await useTeacherStore.getState().fetchStudents();
    const res = await useTeacherStore.getState().approve("s1", "Mathematics");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("TCHR_1104");
    expect(useTeacherStore.getState().students.find((s) => s.student_id === "s1")?.status).toBe("PENDING");
  });
});
