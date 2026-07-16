import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useParentStore } from "../store/useParentStore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

autoResetStore(useParentStore);

// Store-driven integration: real parentService -> real authFetch -> MSW.

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("parent", { profile: { user_id: "p1" } });
  useParentStore.getState().setParentProfile({ user_id: "p1", username: "mom", email: "mom@x.com", role: "parent" });
});

describe("parent linked students (integration)", () => {
  it("fetches linked children and auto-selects the approved one", async () => {
    await useParentStore.getState().fetchLinkedStudents();
    const s = useParentStore.getState();
    expect(s.linkedStudents.map((x) => x.student_id)).toEqual(["s1", "s2"]);
    expect(s.selectedStudentId).toBe("s2"); // s2 is APPROVED, s1 is PENDING
  });

  it("approving a pending child sends the status and updates locally", async () => {
    let sentStatus: string | null = null;
    server.use(
      http.patch(`${BASE}/parent/link/:studentId/status`, async ({ params, request }) => {
        const body = (await request.json()) as { status: string };
        sentStatus = body.status;
        return HttpResponse.json({ student_id: params.studentId, parent_id: "p1", status: body.status, requested_at: "now" });
      }),
    );

    await useParentStore.getState().fetchLinkedStudents();
    await useParentStore.getState().updateStudentStatus("s1", "APPROVED");

    expect(sentStatus).toBe("APPROVED");
    expect(useParentStore.getState().linkedStudents.find((x) => x.student_id === "s1")?.status).toBe("APPROVED");
  });

  it("unlinking the selected child re-selects the next approved child", async () => {
    server.use(
      http.get(`${BASE}/parent/students`, () =>
        HttpResponse.json([
          { student_id: "s1", parent_id: "p1", status: "APPROVED", requested_at: "now" },
          { student_id: "s2", parent_id: "p1", status: "APPROVED", requested_at: "now" },
        ]),
      ),
    );

    await useParentStore.getState().fetchLinkedStudents();
    expect(useParentStore.getState().selectedStudentId).toBe("s1");

    await useParentStore.getState().unlinkStudent("s1");

    const s = useParentStore.getState();
    expect(s.linkedStudents.map((x) => x.student_id)).toEqual(["s2"]);
    expect(s.selectedStudentId).toBe("s2");
  });
});
