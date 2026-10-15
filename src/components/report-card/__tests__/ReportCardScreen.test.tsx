import React, { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ReportCardScreen } from "../screen/ReportCardScreen";
import type { ReportCardData, ReportCardUI } from "../types";
import { makeData } from "./fixtures";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { ReportExtrasProvider } from "../sections/ReportExtras";

function Harness({ data = makeData(), onStartSession }: { data?: ReportCardData; onStartSession?: () => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const ui: ReportCardUI = {
    variant: "screen",
    role: onStartSession ? "student" : "parent",
    isSubjectOpen: () => false,
    toggleSubject: () => {},
    isExpOpen: (k) => open.has(k),
    toggleExp: (k) => setOpen((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; }),
    isClampOpen: () => false,
    toggleClamp: () => {},
    onStartSession,
    onPrint: () => {},
    canDownload: true,
  };
  return <ReportCardScreen data={data} ui={ui} />;
}

const subjectRow = (name: RegExp) => screen.getByRole("button", { name });

describe("ReportCardScreen — narrow (stacked) layout", () => {
  it("steps overview → preview → chapter breakdown, and back out with Esc", async () => {
    render(<Harness />);

    fireEvent.click(subjectRow(/^Mathematics:/));
    const preview = await screen.findByRole("region", { name: "Mathematics preview" });
    expect(within(preview).getByText("Algebra is clicking; geometry needs more visual practice.")).toBeInTheDocument();

    fireEvent.click(within(preview).getByRole("button", { name: /View chapter breakdown/ }));
    const detail = await screen.findByRole("region", { name: "Mathematics details" });
    expect(within(detail).getByRole("tab", { name: "Chapters" })).toHaveAttribute("aria-selected", "true");
    expect(within(detail).getByRole("heading", { name: "Chapters (4)" })).toBeInTheDocument();
    expect(within(detail).getByText("Linear Equations in Two Variables")).toBeInTheDocument();
    expect(within(detail).getByText("Not started")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await screen.findByRole("region", { name: "Mathematics preview" });
    await waitFor(() => expect(screen.queryByRole("region", { name: "Mathematics details" })).not.toBeInTheDocument());

    fireEvent.keyDown(document, { key: "Escape" });
    await screen.findByRole("heading", { name: /Key Insights/ });
  });

  it("switches detail tabs", async () => {
    render(<Harness />);
    fireEvent.click(subjectRow(/^Mathematics:/));
    fireEvent.click(await screen.findByRole("button", { name: /View chapter breakdown/ }));

    fireEvent.click(await screen.findByRole("tab", { name: "Insights" }));
    expect(await screen.findByText("Practise plotting with graph paper")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Tests" }));
    const panel = await screen.findByRole("tabpanel", { name: "Tests" });
    await waitFor(() => expect(within(panel).getByText("PASS")).toBeInTheDocument());
    expect(within(panel).getByText("Polynomials")).toBeInTheDocument();
  });
});

describe("ReportCardScreen — wide (cascading) layout", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the subject list beside the preview, then swaps only the list for the preview in detail", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 1400 } as DOMRect);
    render(<Harness />);

    fireEvent.click(subjectRow(/^Science:/));
    await screen.findByRole("region", { name: "Science preview" });
    expect(screen.getByRole("heading", { name: /Subjects & Chapters/ })).toBeInTheDocument();
    expect(subjectRow(/^Science:/)).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /View chapter breakdown/ }));
    await screen.findByRole("region", { name: "Science details" });
    await waitFor(() => expect(screen.queryByRole("heading", { name: /Subjects & Chapters/ })).not.toBeInTheDocument());
    // The name / overall summary stays.
    expect(screen.getByRole("region", { name: "Report summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Abeer Khan" })).toBeInTheDocument();
    // The preview card has moved to the left column. (jsdom never finishes
    // framer's exit animation, so the outgoing copy can linger here.)
    expect(screen.getAllByRole("region", { name: "Science preview" }).length).toBeGreaterThan(0);
  });
});

describe("ReportCardScreen — brand-new student", () => {
  const empty = makeData({
    totalSessions: 0, subjects: [], chapters: [], progressReport: null,
    subjectEvolutions: [], chapterEvolutions: [], testSubmissions: [],
  });

  it("explains how the report builds, with a CTA for students only", () => {
    const start = vi.fn();
    const { unmount } = render(<Harness data={empty} onStartSession={start} />);
    expect(screen.getByText("How this report builds")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pick a chapter" }));
    expect(start).toHaveBeenCalled();
    unmount();

    // No CTA for parents and teachers.
    render(<Harness data={empty} />);
    expect(screen.queryByRole("button", { name: "Pick a chapter" })).not.toBeInTheDocument();
  });
});

describe("ReportCardScreen — the new backend's chapters", () => {
  const skill = (component_id: string, level: string, extra: object = {}) =>
    ({ component_id, title: `SYNTHETIC ${component_id}`, level, status: null, due: false, needs_adult_support: false, ...extra }) as never;
  const v1 = makeData({
    totalSessions: 1,
    subjects: [{ subject: "Mathematics", overall_score: 0.5, skill_index: 0, adaptive_mode: "", session_count: 1 }],
    chapters: [
      {
        subject: "Mathematics", document_title: "SYNTHETIC Fractions", completion_percentage: 50, mastery_score: 0.5, study_count: 1,
        grade: 0, status: "in_progress", chapter_id: "c-1", instance_id: "i-1", book_title: "SYNTHETIC Book", nodes_done: 3, nodes_total: 6,
        answered: 9, correct: 7, outcomes: [{ code: "M1", title: "SYNTHETIC outcome", mastered: true }],
        skills: [skill("add", "got_it"), skill("compare", "getting_there", { status: "keep_practising", due: true })],
        last_active_at: new Date().toISOString(),
      },
      { subject: "Mathematics", document_title: "SYNTHETIC Decimals", completion_percentage: 0, mastery_score: 0, study_count: 0, grade: 0, status: null, chapter_id: "c-2", skills: [] },
    ],
    skillTree: [], testSubmissions: [], progressReport: null, subjectEvolutions: [], chapterEvolutions: [],
  });

  it("shows each chapter's steps, answers and skills, what to keep practising, and the rest as coming soon", async () => {
    render(<Harness data={v1} />);

    // Overview: the backend's revisit list, and placeholders where AI insights and trends were.
    const practise = screen.getByRole("region", { name: "What to work on" });
    expect(within(practise).getByText("SYNTHETIC compare")).toBeInTheDocument();
    expect(within(practise).getByText("Getting there")).toBeInTheDocument();
    expect(screen.getByText("AI learning insights")).toBeInTheDocument();
    expect(screen.getByText("Subject trends")).toBeInTheDocument();
    // No tests on the new backend: the header shows the right answers in their place.
    const header = within(screen.getByRole("region", { name: "Report summary" }));
    expect(header.getByText("Right Answers")).toBeInTheDocument();
    expect(header.queryByText("Tests")).not.toBeInTheDocument();

    fireEvent.click(subjectRow(/^Mathematics:/));
    fireEvent.click(await screen.findByRole("button", { name: /View chapter breakdown/ }));
    const detail = await screen.findByRole("region", { name: "Mathematics details" });
    expect(within(detail).getByText("Step 4 of 6")).toBeInTheDocument();
    expect(within(detail).getByText("Answers").nextSibling).toHaveTextContent("7/9");

    fireEvent.click(within(detail).getByRole("button", { name: /SYNTHETIC Fractions/ }));
    expect(await within(detail).findByText("SYNTHETIC add")).toBeInTheDocument();
    expect(within(detail).getByText("Got it")).toBeInTheDocument();
    expect(within(detail).getByText("SYNTHETIC outcome")).toBeInTheDocument();

    expect(within(detail).queryByRole("tab", { name: "Tests" }), "no chapter tests on the new backend").not.toBeInTheDocument();
    expect(within(detail).getByRole("tab", { name: "Insights" })).toBeInTheDocument();
  });
});

describe("ReportCardScreen — the sections the new backend added", () => {
  const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
  const day = (n: number, answers: number) => ({
    period: new Date(Date.UTC(2026, 9, 14) - n * 86_400_000).toISOString().slice(0, 10), answers, correct: answers, minutes: answers * 10,
    active_days: answers ? 1 : 0, skills_levelled_up: null,
  });
  const point = (week: string, share: number | null) => ({ week, known_share: share, measured: share == null ? 0 : 4, known: 0, levelled_up: 0 });
  const chapter = (over: object) => ({
    subject: "Mathematics", subject_code: "mathematics", document_title: "SYNTHETIC Fractions", completion_percentage: 50, mastery_score: 0.5, study_count: 1,
    grade: 6, status: "in_progress", chapter_id: "c-1", instance_id: "i-1", book_title: "SYNTHETIC Book", nodes_done: 3, nodes_total: 6,
    answered: 10, correct: 8, outcomes: [], skills: [{ component_id: "add", title: "SYNTHETIC add", level: "got_it", status: null, due: false, needs_adult_support: false }],
    help: { correct_alone: 6, correct_with_help: 2, hints_used: 3 }, time_minutes: 75, last_active_at: new Date().toISOString(), ...over,
  });
  const data = makeData({
    totalSessions: 1,
    subjects: [{ subject: "Mathematics", overall_score: 0.5, skill_index: 0, adaptive_mode: "", session_count: 1 }],
    chapters: [chapter({}) as never],
    skillTree: [], testSubmissions: [], progressReport: null, subjectEvolutions: [], chapterEvolutions: [],
  });

  function renderWithBackend() {
    localStorage.setItem("gened_auth_token", "token-synthetic");
    server.use(
      http.get(`${BASE}/v1/learner/activity`, () => HttpResponse.json({ start: day(83, 0).period, end: day(0, 0).period, measurement: "estimated", measured_since: null,
        periods: Array.from({ length: 84 }, (_, i) => day(83 - i, i === 83 ? 4 : i === 82 ? 2 : 0)) })),
      http.get(`${BASE}/students/s-1/streak`, () => HttpResponse.json({ current_streak: 2, longest_streak: 5 })),
      http.get(`${BASE}/v1/learner/trends`, () => HttpResponse.json({ weeks: ["a", "b", "c"], overall: [],
        subjects: [{ subject_code: "mathematics", points: [point("a", null), point("b", 0.25), point("c", 0.75)] }] })),
      http.get(`${BASE}/v1/learner/misconceptions`, () => HttpResponse.json({ misconceptions: [{ misconception_id: "m", title: "SYNTHETIC idea", chapter_id: "c-1",
        chapter_title: "SYNTHETIC Fractions", subject_code: "mathematics", first_seen_at: "2026-10-01T10:00:00Z", last_seen_at: "2026-10-10T10:00:00Z", times_seen: 1, resolved: false }] })),
    );
    const ui: ReportCardUI = {
      variant: "screen", role: "student", isSubjectOpen: () => false, toggleSubject: () => {}, isExpOpen: () => false, toggleExp: () => {},
      isClampOpen: () => false, toggleClamp: () => {}, onPrint: () => {}, canDownload: false,
    };
    const summary = { help: { correct_alone: 6, correct_with_help: 2, hints_used: 3 }, answered: 10, correct: 8 };
    return render(
      <ReportExtrasProvider who={{ role: "student", studentId: "s-1" }} summary={summary}>
        <ReportCardScreen data={data} ui={ui} />
      </ReportExtrasProvider>,
    );
  }

  it("fills the header with the right answers, study habits with time and help, and what to work on with the mix-ups", async () => {
    renderWithBackend();

    const header = within(screen.getByRole("region", { name: "Report summary" }));
    expect(header.getByText("Right Answers").previousSibling).toHaveTextContent("8 / 10");
    const habits = within(await screen.findByRole("region", { name: "Study habits" }));
    expect(await habits.findByText("1h")).toBeInTheDocument(); // (4 + 2) answers x 10 minutes
    expect(habits.getByText("75% of right answers on their own")).toBeInTheDocument();
    const focus = within(screen.getByRole("region", { name: "What to work on" }));
    expect(await focus.findByText("SYNTHETIC idea")).toBeInTheDocument();
    // Study time reaches the chapter and subject too, as an estimate.
    fireEvent.click(subjectRow(/^Mathematics:/));
    expect(await screen.findByText("1h 15m")).toBeInTheDocument();
  });

  it("draws each subject's trend from the weekly share of skills known, skipping weeks nothing was measured", async () => {
    renderWithBackend();
    // 25% to 75%: up 50 points (the section swaps from loading to the lines, so it is found again each time).
    await waitFor(() => expect(within(screen.getByRole("region", { name: /subject trends/i })).getByText("+50%")).toBeInTheDocument());
  });
});
