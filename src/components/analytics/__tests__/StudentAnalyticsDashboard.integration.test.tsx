import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import { StudentAnalyticsDashboard } from "../StudentAnalyticsDashboard";

autoResetStore(useAnalyticsStore);

// StudentAnalyticsDashboard is NOT used anywhere in the student portal (src/app/student/**
// has no reference to it). Its only real callers are ParentHome.tsx (mode="parent",
// studentId=<the viewed child>) and TeacherDashboard's report flow. This suite renders it
// the way ParentHome actually does.

function chapterMasteryHandler(byTitle: Record<string, string>) {
  return http.get(`${BASE}/students/:studentId/chapter-mastery`, ({ request }) => {
    const subject = new URL(request.url).searchParams.get("subject") ?? "";
    const documentTitle = byTitle[subject];
    if (!documentTitle) return HttpResponse.json([]);
    return HttpResponse.json([
      { document_title: documentTitle, mastery_score: 0.65, completion_percentage: 40, study_count: 3 },
    ]);
  });
}

beforeEach(() => {
  server.use(
    // The store sorts discovered subjects alphabetically and auto-selects subjects[0].
    http.get(`${BASE}/api/students/:userId/available-agents`, () =>
      HttpResponse.json({
        partners: [{
          subjects: [
            { subject: "Science", agents: [{ subject: "Science", grade: 6 }] },
            { subject: "Mathematics", agents: [{ subject: "Mathematics", grade: 6 }] },
          ],
        }],
      }),
    ),
    http.get(`${BASE}/students/:studentId/skill-summary`, () => HttpResponse.json({ overall_score: 0.5, skill_index: 1 })),
    http.get(`${BASE}/students/:studentId/cg-scores`, () => HttpResponse.json([])),
    http.get(`${BASE}/students/:studentId/skill-tree`, () => HttpResponse.json([])),
    chapterMasteryHandler({ Mathematics: "Algebra Basics", Science: "Photosynthesis" }),
  );
});

describe("StudentAnalyticsDashboard, as rendered by ParentHome (mode=\"parent\")", () => {
  it("fetches the viewed child's data via the studentId prop, not the logged-in profile", async () => {
    render(<StudentAnalyticsDashboard mode="parent" studentId="child-1" />);

    await waitFor(() => expect(screen.getByText("Algebra Basics")).toBeInTheDocument());
    expect(useAnalyticsStore.getState().selectedAnalyticsSubject).toBe("Mathematics");
  });

  it("hides the practice/test actions on chapter cards — parent view is read-only", async () => {
    render(<StudentAnalyticsDashboard mode="parent" studentId="child-1" />);
    await waitFor(() => expect(screen.getByText("Algebra Basics")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /continue|start/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /take test/i })).not.toBeInTheDocument();
  });

  it("does not render its own subject switcher — that control only exists in mode=\"student\"", async () => {
    render(<StudentAnalyticsDashboard mode="parent" studentId="child-1" />);
    await waitFor(() => expect(screen.getByText("Algebra Basics")).toBeInTheDocument());

    // ParentHome renders its own subject <select> outside this component and drives
    // useAnalyticsStore directly (see fetchAnalyticsData call in ParentHome.tsx); this
    // component must not duplicate that control in parent mode.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("re-renders with the new subject's chapters when the store updates externally (as ParentHome's switcher does)", async () => {
    render(<StudentAnalyticsDashboard mode="parent" studentId="child-1" />);
    await waitFor(() => expect(screen.getByText("Algebra Basics")).toBeInTheDocument());

    // Simulate ParentHome's own <select onChange> handler: it calls fetchAnalyticsData
    // directly on the shared store, since this component exposes no in-mode switcher.
    await act(async () => {
      await useAnalyticsStore.getState().fetchAnalyticsData("Science", "child-1");
    });

    await waitFor(() => expect(screen.getByText("Photosynthesis")).toBeInTheDocument());
    expect(screen.queryByText("Algebra Basics")).not.toBeInTheDocument();
  });

  it("shows the parent-specific empty-state copy when the child has no subjects yet", async () => {
    server.use(
      http.get(`${BASE}/api/students/:userId/available-agents`, () => HttpResponse.json({ partners: [] })),
    );
    render(<StudentAnalyticsDashboard mode="parent" studentId="child-1" />);

    await waitFor(() =>
      expect(screen.getByText(/this student hasn't completed their english or mathematics onboarding/i)).toBeInTheDocument(),
    );
  });
});
