import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { useStudentStore } from "../useStudentStore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const STUDENT = "44444444-0000-4000-8000-000000000001";

/** SYNTHETIC `/student/partners` rows: every real school, with this student's status (the backend's shape). */
const SCHOOLS = [
  { partner_id: "55555555-0000-4000-8000-000000000001", organization: "SYNTHETIC School A", board: "CBSE", association_status: "NOT_REQUESTED", is_effective: false },
  { partner_id: "55555555-0000-4000-8000-000000000002", organization: "SYNTHETIC School B", board: "CBSE", association_status: "APPROVED", is_effective: true },
];

let requested: string | null = null;

beforeEach(() => {
  requested = null;
  localStorage.setItem("gened_auth_token", "token-synthetic");
  useStudentStore.setState({
    studentProfile: { user_id: STUDENT, username: "synthetic", role: "STUDENT", grade: 6 },
    availablePartners: [],
    enrolledPartners: [],
  });
  server.use(
    http.get(`${BASE}/student/partners`, () => HttpResponse.json(SCHOOLS)),
    http.post(`${BASE}/student/partner`, ({ request }) => {
      requested = new URL(request.url).searchParams.get("partner_id");
      return HttpResponse.json({ message: "Partner request sent" });
    }),
  );
});

describe("useStudentStore — schools", () => {
  it("fills the 'Connect to a school' list and the connected schools from one request", async () => {
    await useStudentStore.getState().fetchEnrolledPartners();
    const state = useStudentStore.getState();
    expect(state.availablePartners.map((p) => p.organization)).toEqual(["SYNTHETIC School A", "SYNTHETIC School B"]);
    expect(state.enrolledPartners.map((p) => p.organization)).toEqual(["SYNTHETIC School B"]);
  });

  it("fetchAvailablePartners fills the same list (the GenEd placeholder is never offered)", async () => {
    await useStudentStore.getState().fetchAvailablePartners();
    expect(useStudentStore.getState().availablePartners).toHaveLength(2);
  });

  it("sends a request for the chosen school and refreshes the list", async () => {
    await useStudentStore.getState().sendPartnerRequest(SCHOOLS[0].partner_id);
    expect(requested).toBe(SCHOOLS[0].partner_id);
    expect(useStudentStore.getState().partnerRequestStatus).toBe("success");
    expect(useStudentStore.getState().availablePartners).toHaveLength(2);
  });
});
