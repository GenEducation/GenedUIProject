import React, { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ReportCardScreen } from "../screen/ReportCardScreen";
import type { ReportCardData, ReportCardUI } from "../types";
import { makeData } from "./fixtures";

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
    const practise = screen.getByRole("region", { name: "Keep practising" });
    expect(within(practise).getByText("SYNTHETIC compare")).toBeInTheDocument();
    expect(within(practise).getByText("Getting there")).toBeInTheDocument();
    expect(screen.getByText("AI learning insights")).toBeInTheDocument();
    expect(screen.getByText("Subject trends")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Report summary" })).getByText("Coming soon")).toBeInTheDocument();

    fireEvent.click(subjectRow(/^Mathematics:/));
    fireEvent.click(await screen.findByRole("button", { name: /View chapter breakdown/ }));
    const detail = await screen.findByRole("region", { name: "Mathematics details" });
    expect(within(detail).getByText("Step 3 of 6")).toBeInTheDocument();
    expect(within(detail).getByText("7/9")).toBeInTheDocument();

    fireEvent.click(within(detail).getByRole("button", { name: /SYNTHETIC Fractions/ }));
    expect(await within(detail).findByText("SYNTHETIC add")).toBeInTheDocument();
    expect(within(detail).getByText("Got it")).toBeInTheDocument();
    expect(within(detail).getByText("SYNTHETIC outcome")).toBeInTheDocument();

    fireEvent.click(within(detail).getByRole("tab", { name: "Tests" }));
    expect(await screen.findByText("Chapter tests")).toBeInTheDocument();
  });
});
