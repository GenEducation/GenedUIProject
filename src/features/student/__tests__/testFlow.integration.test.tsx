import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { makeSubmitResult } from "@/test/fixtures/submitResult";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useTestStore } from "@/features/student/store/useTestStore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

// Route protection + nav chrome are covered elsewhere; stub them so this test stays on
// the test-taking flow (question components -> store -> submit -> results).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams("from=assessments"),
}));
vi.mock("@/components/auth/AuthGuard", () => ({ AuthGuard: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/features/student/components/StudentHomeSidebar", () => ({ StudentHomeSidebar: () => null }));
vi.mock("@/features/student/components/test/AssessmentSidebar", () => ({ AssessmentSidebar: () => null }));

import TestPage from "@/app/student/test/page";

autoResetStore(useTestStore);

beforeEach(() => {
  localStorage.clear();
});

describe("test-taking flow (integration)", () => {
  it("sends the correctly formatted answers[] payload and renders results", async () => {
    // startTest pulls the chapter test from MSW so currentTest exists before render.
    await useTestStore.getState().startTest({
      student_id: "u_student",
      chapter_query: "Photosynthesis",
      subject: "Science",
      grade: 6,
      questions_per_section: 3,
    });

    // Capture what the client actually submits.
    let submitted: { answers: { question_id: string; student_answer: string }[] } | undefined;
    server.use(
      http.post(`${BASE}/tests/:testId/submit`, async ({ request }) => {
        submitted = (await request.json()) as typeof submitted;
        return HttpResponse.json(makeSubmitResult());
      }),
    );

    render(<TestPage />);

    // MCQ + true/false answered through the real components.
    fireEvent.click(screen.getByRole("button", { name: /Glucose/ }));
    fireEvent.click(screen.getByRole("button", { name: "False" }));
    fireEvent.change(screen.getByPlaceholderText("Write your justification here..."), {
      target: { value: "It absorbs red and blue most strongly" },
    });
    // Match is drag-and-drop (dnd-kit + random shuffle) — impractical in jsdom, so drive
    // its selection through the store action the component would call.
    useTestStore.getState().updateMatchSelection("q3", { 1: "A", 2: "B" });

    fireEvent.click(screen.getByRole("button", { name: /Submit Assessment/i }));
    // If the "unanswered questions" guard appears, confirm it.
    const confirm = screen.queryByRole("button", { name: /Submit Anyway/i });
    if (confirm) fireEvent.click(confirm);

    await waitFor(() => expect(submitted).toBeDefined());
    expect(submitted!.answers).toEqual([
      { question_id: "q1", student_answer: "Glucose" },
      { question_id: "q2", student_answer: "False. It absorbs red and blue most strongly" },
      { question_id: "q3", student_answer: "1→A, 2→B" },
    ]);

    // Results round-trip stored, and the UI leaves the question view.
    await waitFor(() => expect(useTestStore.getState().testResult?.submission_id).toBe("sub-1"));
    expect(screen.queryByRole("button", { name: /Submit Assessment/i })).not.toBeInTheDocument();
  });
});
