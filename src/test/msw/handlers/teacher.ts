import { http, HttpResponse } from "msw";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/**
 * Default happy-path teacher handlers. Integration suites override specific
 * endpoints via server.use() to control approve outcomes or capture request bodies.
 */
export const teacherHandlers = [
  http.get(`${BASE}/teacher/overview`, () =>
    HttpResponse.json({ total_students: 2, pending: 1, approved: 1 }),
  ),
  http.get(`${BASE}/teacher/students`, () =>
    HttpResponse.json({
      students: [
        { student_id: "s1", status: "PENDING", subject: "Mathematics", name: "Alice" },
        { student_id: "s2", status: "APPROVED", subject: "Science", name: "Bob" },
      ],
    }),
  ),
  http.get(`${BASE}/teacher/requests`, () => HttpResponse.json([])),
  http.patch(`${BASE}/teacher/students/:studentId/assign`, async ({ params }) =>
    HttpResponse.json({ student_id: params.studentId, status: "APPROVED", subject: "Mathematics" }),
  ),
];
