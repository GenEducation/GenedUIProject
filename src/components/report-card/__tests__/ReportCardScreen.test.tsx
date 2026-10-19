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
  it("opens with the summary, subject list and key insights", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Abeer Khan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Subjects & Chapters/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Key Insights/ })).toBeInTheDocument();
    expect(subjectRow(/^Mathematics: Proficient, 61% mastery, 54% coverage$/)).toBeInTheDocument();
  });

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

  it("expands a started chapter to its learning arc", async () => {
    render(<Harness />);
    fireEvent.click(subjectRow(/^Mathematics:/));
    fireEvent.click(await screen.findByRole("button", { name: /View chapter breakdown/ }));

    const polynomials = (await screen.findByText("Polynomials", { selector: "h4" })).closest("button")!;
    expect(polynomials).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(polynomials);
    expect(polynomials).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText(/Learning arc & skill dimensions/)).toBeInTheDocument();
    expect(screen.getByText("Conceptual understanding")).toBeInTheDocument();
  });

  it("opens a subject from the Needs Attention callout", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Needs Attention/ }));
    expect(await screen.findByRole("region", { name: "Social Science preview" })).toBeInTheDocument();
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

  it("explains how the report builds, with a CTA for students", () => {
    const start = vi.fn();
    render(<Harness data={empty} onStartSession={start} />);
    expect(screen.getByText("How this report builds")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start your first session" }));
    expect(start).toHaveBeenCalled();
  });

  it("shows no CTA to parents and teachers", () => {
    render(<Harness data={empty} />);
    expect(screen.queryByRole("button", { name: "Start your first session" })).not.toBeInTheDocument();
  });
});
