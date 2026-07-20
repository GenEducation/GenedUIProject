import { http, HttpResponse } from "msw";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/**
 * Default happy-path parent handlers. Integration suites override specific
 * endpoints via server.use() to control status changes or capture request bodies.
 */
export const parentHandlers = [
  http.get(`${BASE}/parent/students`, () =>
    HttpResponse.json([
      { student_id: "s1", parent_id: "p1", status: "PENDING", requested_at: "now", name: "Alice" },
      { student_id: "s2", parent_id: "p1", status: "APPROVED", requested_at: "now", name: "Bob" },
    ]),
  ),
  http.post(`${BASE}/parent/link`, async ({ request }) => {
    const body = (await request.json()) as { student_id: string };
    return HttpResponse.json({ student_id: body.student_id, parent_id: "p1", status: "PENDING", requested_at: "now" });
  }),
  http.patch(`${BASE}/parent/link/:studentId/status`, async ({ params, request }) => {
    const body = (await request.json()) as { status: string };
    return HttpResponse.json({ student_id: params.studentId, parent_id: "p1", status: body.status, requested_at: "now" });
  }),
  http.delete(`${BASE}/parent/link/:studentId`, () => new HttpResponse(null, { status: 204 })),
];
