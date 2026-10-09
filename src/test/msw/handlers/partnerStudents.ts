import { http, HttpResponse } from "msw";
import type { MembershipStatus } from "@/features/partner/services/partnerStudentsService";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/** The SYNTHETIC partner the tests sign in as (`gened_partner_id`). */
export const SYNTHETIC_PARTNER = "22222222-0000-4000-8000-000000000001";

interface Membership {
  id: string;
  username: string;
  name: string;
  grade: number;
  status: MembershipStatus;
}

/**
 * A school's memberships, shaped like the backend's `gened_schools` routes
 * (which keep the MVP's shapes): `/partner/students` lists every state plus a
 * trailing counts row; `/partner/requests` lists PENDING only.
 */
const memberships = new Map<string, Membership>();
/** The last status PATCH, for asserting what the portal sent. */
export let lastStatusChange: { studentId: string; status: string } | null = null;

const member = (n: number, status: MembershipStatus): Membership => ({
  id: `33333333-0000-4000-8000-${String(n).padStart(12, "0")}`,
  username: `synthetic_student_${n}`,
  name: `SYNTHETIC Student ${n}`,
  grade: 6,
  status,
});

export const partnerStudentsFixture = {
  reset(rows?: Membership[]) {
    memberships.clear();
    lastStatusChange = null;
    for (const m of rows ?? [member(1, "APPROVED"), member(2, "PENDING"), member(3, "REJECTED"), member(4, "REVOKED")]) {
      memberships.set(m.id, m);
    }
  },
  member,
  get: (id: string) => memberships.get(id),
};

partnerStudentsFixture.reset();

const own = (url: URL) => url.searchParams.get("partner_id") === SYNTHETIC_PARTNER;
const forbidden = () =>
  HttpResponse.json({ message: "Permission denied: You can only access your own data." }, { status: 403 });
const notFound = () =>
  HttpResponse.json({ message: "Student association not found for this partner." }, { status: 404 });

export const partnerStudentsHandlers = [
  http.get(`${BASE}/partner/students`, ({ request }) => {
    if (!own(new URL(request.url))) return forbidden();
    const rows = [...memberships.values()];
    const statuses = rows.map((r) => r.status);
    return HttpResponse.json([
      ...rows.map(({ id, username, grade, status }) => ({ id, username, grade, status })),
      {
        total_count: rows.length,
        pending_count: statuses.filter((s) => s === "PENDING").length,
        approved_count: statuses.filter((s) => s === "APPROVED").length,
      },
    ]);
  }),

  http.get(`${BASE}/partner/requests`, ({ request }) => {
    if (!own(new URL(request.url))) return forbidden();
    return HttpResponse.json(
      [...memberships.values()]
        .filter((m) => m.status === "PENDING")
        .map((m) => ({
          student_id: m.id,
          name: m.name,
          grade: m.grade,
          status: m.status,
          link_origin: "STUDENT",
          requested_teacher_id: null,
          requested_at: "2026-01-01T00:00:00Z",
        })),
    );
  }),

  http.get(`${BASE}/partner/students/:studentId`, ({ params, request }) => {
    if (!own(new URL(request.url))) return forbidden();
    const m = memberships.get(String(params.studentId));
    // The backend answers null (not a 404) for a student who isn't this school's.
    if (!m) return HttpResponse.json(null);
    return HttpResponse.json({
      id: m.id,
      username: m.username,
      email: `${m.username}@example.invalid`,
      age: null,
      grade: m.grade,
      school_board: "CBSE",
      status: m.status,
      requested_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });
  }),

  http.patch(`${BASE}/partner/students/:studentId/status`, ({ params, request }) => {
    const url = new URL(request.url);
    if (!own(url)) return forbidden();
    const status = url.searchParams.get("status") ?? "";
    if (!["APPROVED", "REJECTED", "REVOKED"].includes(status)) {
      return HttpResponse.json({ message: "Invalid status value. Must be one of APPROVED, REJECTED, REVOKED." }, { status: 422 });
    }
    const m = memberships.get(String(params.studentId));
    if (!m) return notFound();
    m.status = status as MembershipStatus;
    lastStatusChange = { studentId: m.id, status };
    return HttpResponse.json({ message: `Student status updated to ${status}` });
  }),

  http.delete(`${BASE}/partner/students/:studentId`, ({ params, request }) => {
    if (!own(new URL(request.url))) return forbidden();
    if (!memberships.delete(String(params.studentId))) return notFound();
    return HttpResponse.json({ message: "Student successfully removed from partner association" });
  }),
];
