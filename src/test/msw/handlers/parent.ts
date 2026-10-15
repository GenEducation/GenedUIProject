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

  // Guardian linking. The emailed invitation link, its confirmation, and the parent's list of children who named
  // their email.
  http.get(`${BASE}/parent/verify-token`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      status: "success",
      message: "Token is valid.",
      parent_email: "m@x.com",
      student_username: "Aarav",
      student_id: url.searchParams.get("student_id"),
    });
  }),
  http.post(`${BASE}/parent/confirm-link`, async ({ request }) => {
    const body = (await request.json()) as { student_id: string; parent_id: string };
    return HttpResponse.json({ student_id: body.student_id, parent_id: body.parent_id, status: "APPROVED", requested_at: "now" });
  }),
  http.get(`${BASE}/parent/guardian/invitations`, () => HttpResponse.json([])),

  // The student's side: by default the parent email is verified and the parent is already connected.
  http.get(`${BASE}/parent/guardian/status`, ({ request }) =>
    HttpResponse.json(guardianStatus({ student_id: new URL(request.url).searchParams.get("student_id") ?? "s1" })),
  ),
  http.post(`${BASE}/parent/guardian/email-code`, () => HttpResponse.json({ status: "success", message: "sent" })),
  http.post(`${BASE}/parent/guardian/verify-email`, async ({ request }) => {
    const body = (await request.json()) as { student_id: string };
    return HttpResponse.json(guardianStatus({ student_id: body.student_id, state: "awaiting_parent_registration", relationship_status: null }));
  }),
  http.post(`${BASE}/parent/guardian/invitation`, async ({ request }) => {
    const body = (await request.json()) as { student_id: string };
    return HttpResponse.json(guardianStatus({ student_id: body.student_id, state: "awaiting_parent_registration", relationship_status: null, invitation_sent: true }));
  }),
  // The student's own link: none by default.
  http.get(`${BASE}/parent/link/status`, () => HttpResponse.json(null)),
];

/** A `GET /parent/guardian/status` body; defaults to a linked, approved, confirmed guardian. */
export function guardianStatus(overrides: Record<string, unknown> = {}) {
  return {
    student_id: "s1",
    state: "linked",
    parent_email: "mum@example.com",
    parent_email_supplied: true,
    parent_email_verified: true,
    parent_account_registered: true,
    parent_onboarding_completed: true,
    guardian_consent_recorded: true,
    relationship_status: "APPROVED",
    relationship_with_invited_parent: true,
    linked_parent_email: "Mum@Example.com",
    invitation_sent_at: "2026-10-01T09:00:00Z",
    last_invitation_at: "2026-10-01T09:00:00Z",
    reminders_sent: 0,
    can_resend_invitation: false,
    ...overrides,
  };
}
