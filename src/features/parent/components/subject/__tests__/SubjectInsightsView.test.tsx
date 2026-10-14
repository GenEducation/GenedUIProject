import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { SubjectInsightsView } from "../SubjectInsightsView";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/parent/s1/subject/Mathematics",
  useSearchParams: () => new URLSearchParams(),
}));

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

function serve({ history = true } = {}) {
  server.use(
    http.get(`${BASE}/api/students/:id/available-agents`, () =>
      HttpResponse.json({
        partners: [{ subjects: [{ subject: "Mathematics", agents: [{ agent_id: "m", subject: "Mathematics", grade: 7 }] }] }],
      }),
    ),
    http.get(`${BASE}/students/:id/skill-summary`, () => HttpResponse.json({ overall_score: 0.68, skill_index: 1, session_count: 12 })),
    http.get(`${BASE}/students/:id/cg-scores`, () =>
      HttpResponse.json([
        { cg_id: "g1", cg_name: "Fractions", avg_mastery: 0.82 },
        { cg_id: "g2", cg_name: "Geometry", avg_mastery: 0.31 },
      ]),
    ),
    http.get(`${BASE}/students/:id/skill-tree`, () =>
      HttpResponse.json([
        {
          cg_id: "g1",
          cg_name: "Fractions",
          concepts: [{ c_id: "c1", c_name: "Adding fractions", los: [{ skill_name: "Like denominators", mastery_level: 0.9, assessment_count: 3, justification: "Solved every one." }] }],
        },
      ]),
    ),
    http.get(`${BASE}/students/:id/chapter-mastery`, () =>
      HttpResponse.json([
        { subject: "Mathematics", document_title: "Integers", completion_percentage: 80, mastery_score: 0.7, study_count: 3, grade: 7, time_minutes: 95, time_sessions: 3 },
        { subject: "Mathematics", document_title: "Algebra", completion_percentage: 0, mastery_score: 0, study_count: 0, grade: 7 },
      ]),
    ),
    http.get(`${BASE}/students/:id/skill-profile-history`, () =>
      history
        ? HttpResponse.json({ history: [
            { overall_score: 0.5, skill_index: 0, adaptive_mode: "", recorded_at: "2026-09-01T10:00:00Z" },
            { overall_score: 0.68, skill_index: 0, adaptive_mode: "", recorded_at: "2026-10-01T10:00:00Z" },
          ] })
        : new HttpResponse(null, { status: 500 }),
    ),
    http.get(`${BASE}/students/:id/skill-progression`, () => HttpResponse.json([])),
  );
}

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
  seedAuthLocalStorage("parent", { profile: { user_id: "p1" } });
});

const view = () => render(<SubjectInsightsView studentId="s1" subject="Mathematics" childName="Aarav Sharma" />);

describe("SubjectInsightsView", () => {
  it("leads with a plain-language summary on the report-card scale", async () => {
    serve();
    view();
    expect(await screen.findByText(/Aarav is doing well in/)).toBeInTheDocument();
    const hero = screen.getByRole("region", { name: "Mathematics summary" });
    expect(within(hero).getByText("68")).toBeInTheDocument();
    expect(await within(hero).findByText("1/2")).toBeInTheDocument();
    expect(within(hero).getByText("12")).toBeInTheDocument();
  });

  it("shows the overall change and handles a missing history on its own", async () => {
    serve();
    const { unmount } = view();
    expect(await screen.findByText(/Up 18 points since/)).toBeInTheDocument();
    unmount();

    serve({ history: false });
    view();
    expect(await screen.findByText("The progress history isn't available right now.")).toBeInTheDocument();
    expect(await screen.findByText("Integers")).toBeInTheDocument();
  });

  it("sends the parent home when the subject isn't this child's", async () => {
    serve();
    render(<SubjectInsightsView studentId="s1" subject="Art" />);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/parent/s1"));
  });
});
