import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, within, waitFor } from "@testing-library/react";
import { server } from "@/test/msw/server";
import { ReportExtrasProvider } from "../sections/ReportExtras";
import { ReportCardPrint } from "../print/ReportCardPrint";
import type { InsightsResponse } from "../sections/reportSections";
import type { ChapterMasteryItem, ReportCardData } from "../types";
import type { ReportWho } from "../v1Report";
import { makeData } from "./fixtures";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const WHO: ReportWho = { role: "student", studentId: "s-1" };

const chapter = (title: string, over: Partial<ChapterMasteryItem>): ChapterMasteryItem => ({
  subject: "Mathematics", document_title: title, completion_percentage: 0, mastery_score: 0, study_count: 0, grade: 6,
  status: null, subject_code: "mathematics", chapter_number: 1, ...over,
});

/** A learner on the new backend: one opened chapter with two skills (one due), one chapter not opened yet. */
function v1Data(): ReportCardData {
  return makeData({
    subjects: [{ subject: "Mathematics", overall_score: 0.62, skill_index: 1, adaptive_mode: "PRACTICE", session_count: 1 }],
    chapters: [
      chapter("Fractions", {
        completion_percentage: 50, mastery_score: 0.62, study_count: 1, status: "in_progress", nodes_done: 3, nodes_total: 6,
        answered: 10, correct: 7, time_minutes: 42, chapter_number: 1,
        skills: [
          { component_id: "c1", title: "Adding fractions", level: "got_it", status: null, due: false, needs_adult_support: false },
          { component_id: "c2", title: "Comparing fractions", level: "getting_there", status: "keep_practising", due: true, needs_adult_support: false },
          { component_id: "c3", title: "Simplifying", level: "good_start", status: null, due: false, needs_adult_support: true },
        ],
      }),
      chapter("Decimals", { chapter_number: 2, skills: [] }),
    ],
    totalSessions: 1, displayName: "Asha Rao", firstName: "Asha", displayGrade: 6, displayBoard: "CBSE", progressReport: null,
    subjectEvolutions: [], chapterEvolutions: [], testSubmissions: [], skillTree: [],
  });
}

const day = (i: number) => new Date(Date.UTC(2026, 9, 14) - (83 - i) * 86_400_000).toISOString().slice(0, 10);
const periods = Array.from({ length: 84 }, (_, i) => ({ period: day(i), answers: i % 3 === 0 ? 2 : 0, correct: 1, minutes: i % 3 === 0 ? 12 : 0, active_days: i % 3 === 0 ? 1 : 0, skills_levelled_up: null }));
const note: InsightsResponse = {
  status: "ready", refreshing: false, can_reload: true,
  insight: {
    generated_at: "2026-10-14T10:00:00Z", headline: "Fractions are coming together, with one mix-up to clear.", headline_evidence: ["f1"],
    working_well: [{ text: "Adding fractions is now a skill they know.", evidence: ["f1"] }],
    needs_attention: [{ text: "Adding tops and bottoms separately has come up 3 times.", evidence: ["f2"] }],
    next_steps: [{ kind: "clear_mixup", text: "Talk through why the bottoms stay the same, then retry.", evidence: ["f2"] }],
    subjects: [{ subject_code: "mathematics", headline: "Maths is moving.", working_well: [{ text: "Skills are sticking.", evidence: ["f1"] }], needs_attention: [] }],
    facts: [
      { id: "f1", kind: "mastery", subject_code: "mathematics", label: "Mathematics", value: 62, of: null, unit: "percent", signal: "positive" },
      { id: "f2", kind: "misconception_open", subject_code: "mathematics", label: "Adds tops and bottoms", value: 3, of: null, unit: "count", signal: "concern" },
    ],
  },
};

type Resolver = Parameters<typeof http.get>[1];
function backend(over: { insights?: Resolver; activity?: Resolver } = {}) {
  server.use(
    http.get(`${BASE}/v1/learner/insights`, over.insights ?? (() => HttpResponse.json(note))),
    http.get(`${BASE}/v1/learner/activity`, over.activity ?? (() => HttpResponse.json({ start: day(0), end: day(83), measurement: "estimated", measured_since: day(10), periods }))),
    http.get(`${BASE}/v1/learner/trends`, () => HttpResponse.json({ weeks: [], overall: [], subjects: [{ subject_code: "mathematics", points: [
      { week: "2026-09-21", known_share: 0.3, measured: 3, known: 1, levelled_up: 0 }, { week: "2026-10-05", known_share: 0.5, measured: 3, known: 2, levelled_up: 1 }] }] })),
    http.get(`${BASE}/v1/learner/misconceptions`, () => HttpResponse.json({ misconceptions: [
      { misconception_id: "m1", title: "Adds tops and bottoms", chapter_id: "c", chapter_title: "Fractions", subject_code: "mathematics", first_seen_at: "2026-10-01T00:00:00Z", last_seen_at: "2026-10-10T00:00:00Z", times_seen: 3, resolved: false },
      { misconception_id: "m2", title: "Bigger bottom means bigger fraction", chapter_id: "c", chapter_title: "Fractions", subject_code: "mathematics", first_seen_at: "2026-09-20T00:00:00Z", last_seen_at: "2026-09-25T00:00:00Z", times_seen: 2, resolved: true },
    ] })),
    http.get(`${BASE}/students/:id/streak`, () => HttpResponse.json({ current_streak: 4, longest_streak: 9 })),
  );
}

const mount = (data = v1Data()) =>
  render(<ReportExtrasProvider who={WHO} summary={{ help: { correct_alone: 8, correct_with_help: 2, hints_used: 1 }, answered: 10, correct: 10 }}><ReportCardPrint data={data} /></ReportExtrasProvider>);

beforeEach(() => localStorage.setItem("gened_auth_token", "token-synthetic"));

describe("the printable report card", () => {
  it("has the student, the summary figures and the written note with the figures behind it", async () => {
    backend();
    mount();
    expect(screen.getByRole("heading", { name: "Asha Rao" })).toBeInTheDocument();
    expect(screen.getByText("Grade 6 • CBSE Board")).toBeInTheDocument();
    const summary = screen.getByLabelText("Summary");
    expect(within(summary).getByText("80%")).toBeInTheDocument();
    expect(within(summary).getByText("of 10 right answers on their own")).toBeInTheDocument();
    expect(within(summary).getByText("Study time, last 30 days (estimated)")).toBeInTheDocument();

    const insights = await screen.findByLabelText("Key insights");
    expect(within(insights).getByText("Fractions are coming together, with one mix-up to clear.")).toBeInTheDocument();
    expect(within(insights).getByText("Adding tops and bottoms separately has come up 3 times.")).toBeInTheDocument();
    expect(within(insights).getAllByText("Adds tops and bottoms: seen 3 times")).toHaveLength(2); // under the concern and under its step
    expect(within(insights).getByText("Talk through why the bottoms stay the same, then retry.")).toBeInTheDocument();
  });

  it("lists every chapter, the opened one with its skills and flags, and the one not opened yet", async () => {
    backend();
    mount();
    const subjects = await screen.findByLabelText("Subjects");
    expect(within(subjects).getByText("Mathematics")).toBeInTheDocument();
    expect(within(subjects).getByText(/0 of 2 chapters completed, 1 not opened yet/)).toBeInTheDocument();

    const fractions = within(subjects).getByText("Fractions").closest("tr") as HTMLElement;
    expect(within(fractions).getByText("3 of 6")).toBeInTheDocument();
    expect(within(fractions).getByText("7 / 10")).toBeInTheDocument();
    expect(within(fractions).getByText(/≈ 42 min/)).toBeInTheDocument();
    expect(within(subjects).getByText("Adding fractions: Got it")).toBeInTheDocument();
    expect(within(subjects).getByText("Comparing fractions: Getting there (revisit)")).toBeInTheDocument();
    expect(within(subjects).getByText("Simplifying: Good start (adult help suggested)")).toBeInTheDocument();

    const decimals = within(subjects).getByText("Decimals").closest("tr") as HTMLElement;
    expect(within(decimals).getByText("Not started")).toBeInTheDocument();
    expect(within(decimals).getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("shows the subject's trend and its own note, the activity, and the mix-ups open and cleared", async () => {
    backend();
    mount();
    const subjects = await screen.findByLabelText("Subjects");
    expect(await within(subjects).findByText("+20 points in 2 weeks")).toBeInTheDocument();
    expect(within(subjects).getByText("Maths is moving.")).toBeInTheDocument();

    const activity = await screen.findByLabelText("Activity");
    expect(within(activity).getByText(/Streak 4 days now, 9 at best\./)).toBeInTheDocument();
    expect(within(activity).getByText(/Time measured since/)).toBeInTheDocument();

    const mixups = await screen.findByLabelText("Mix-ups");
    expect(within(mixups).getByText("To clear")).toBeInTheDocument();
    expect(within(mixups).getByText("Cleared")).toBeInTheDocument();
    expect(within(mixups).getByText(/Adds tops and bottoms/)).toBeInTheDocument();
  });

  it("leaves a section out when its read failed or there is nothing to say, and still prints the rest", async () => {
    backend({
      insights: () => HttpResponse.json({ status: "none", refreshing: false, can_reload: false, insight: null }),
      activity: () => HttpResponse.json({ message: "down" }, { status: 500 }),
    });
    mount();
    await waitFor(() => expect(screen.queryByLabelText("Key insights")).not.toBeInTheDocument());
    await screen.findByLabelText("Mix-ups");
    expect(screen.queryByLabelText("Activity")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Subjects")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Summary")).getByText("Study time, last 30 days (estimated)").previousSibling).toHaveTextContent("—");
    expect(screen.getByText(/Study time is an estimate of active time, not a clock\./)).toBeInTheDocument();
  });
});
