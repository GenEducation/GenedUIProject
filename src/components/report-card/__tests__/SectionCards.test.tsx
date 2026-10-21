import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { server } from "@/test/msw/server";
import { ReportExtrasProvider } from "../sections/ReportExtras";
import { ActivityCard, FocusCard, IndependenceBar } from "../screen/SectionCards";
import { makeData } from "./fixtures";
import { recentMinutes, trendLine, type ActivityPeriod, type ActivitySeries } from "../sections/reportSections";
import type { ReportWho } from "../v1Report";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const STUDENT: ReportWho = { role: "student", studentId: "s-1" };
const HELP = { correct_alone: 6, correct_with_help: 2, hints_used: 3 };

beforeEach(() => localStorage.setItem("gened_auth_token", "token-synthetic"));

/** `days` consecutive days ending 2026-10-14 (a Wednesday), answers by day from `answersByDay`. */
function series(days: number, answersByDay: Record<number, number> = {}, over: Partial<ActivitySeries> = {}): ActivitySeries {
  const end = Date.UTC(2026, 9, 14);
  const periods: ActivityPeriod[] = Array.from({ length: days }, (_, i) => {
    const ago = days - 1 - i;
    const answers = answersByDay[ago] ?? 0;
    return {
      period: new Date(end - ago * 86_400_000).toISOString().slice(0, 10), answers, correct: answers, minutes: answers * 4,
      active_days: answers > 0 ? 1 : 0, skills_levelled_up: null,
    };
  });
  return { start: periods[0].period, end: periods[days - 1].period, measurement: "estimated", measured_since: null, periods, ...over };
}

const mount = (ui: React.ReactNode, who: ReportWho = STUDENT) =>
  render(<ReportExtrasProvider who={who} summary={{ help: HELP, answered: 10, correct: 8 }}>{ui}</ReportExtrasProvider>);

/** Every read the provider makes, with defaults an individual test overrides. */
function backend(over: { activity?: object | number; trends?: object; misconceptions?: object | number; streak?: object | number } = {}) {
  const respond = (v: object | number | undefined, fallback: object) =>
    typeof v === "number" ? HttpResponse.json({ message: "nope" }, { status: v }) : HttpResponse.json(v ?? fallback);
  server.use(
    http.get(`${BASE}/v1/learner/activity`, () => respond(over.activity, series(84, { 0: 5, 1: 2, 3: 7 }))),
    http.get(`${BASE}/v1/learner/trends`, () => respond(over.trends, { weeks: [], overall: [], subjects: [] })),
    http.get(`${BASE}/v1/learner/misconceptions`, () => respond(over.misconceptions, { misconceptions: [] })),
    http.get(`${BASE}/students/s-1/streak`, () => respond(over.streak, { current_streak: 3, longest_streak: 9 })),
  );
}

describe("pure display rules", () => {
  it("sums the last 30 days' minutes, and says when tracking started inside that window", () => {
    const s = series(84, { 0: 5, 2: 5, 40: 9 }); // the 40-days-ago day is outside the last 30
    expect(recentMinutes(s)).toEqual({ minutes: 40, partial: false });
    const since = s.periods[70].period; // 13 days ago
    expect(recentMinutes({ ...s, measured_since: since }).partial).toBe(true);
    expect(recentMinutes({ ...s, measured_since: s.periods[10].period }).partial).toBe(false);
  });

  it("draws a trend only from weeks with something measured, and needs two of them", () => {
    const pt = (known_share: number | null) => ({ week: "w", known_share, measured: 1, known: 0, levelled_up: 0 });
    expect(trendLine([pt(null), pt(0.25), pt(null)])).toBeNull();
    expect(trendLine([pt(null), pt(0.25), pt(0.5), pt(0.75)])).toEqual({ values: [25, 50, 75], delta: 50 });
  });
});

describe("the study habits card", () => {
  it("shows the streak, the active days and the estimated study time over the last 30 days, with a bar a day", async () => {
    backend();
    mount(<ActivityCard />);

    const card = await screen.findByRole("region", { name: "Study habits" });
    const stat = (label: string) => within(card).getByText(label).closest("div") as HTMLElement;
    await waitFor(() => expect(stat("Day streak")).toHaveTextContent("3")); // the streak, from its own read
    expect(stat("Day streak")).toHaveTextContent("Best 9");
    expect(stat("Active days")).toHaveTextContent("3of 30");
    expect(stat("Study time")).toHaveTextContent("56 minEstimated"); // (5 + 2 + 7) answers x 4 minutes
    expect(within(card).getByRole("img", { name: "Answers each day over the last 30 days: 3 active" })).toBeInTheDocument();
    expect(within(card).getByText("75% of right answers on their own")).toBeInTheDocument();
  });

  it("names when tracking began, so earlier days read as untracked and not as zero", async () => {
    const s = series(84, { 0: 3, 20: 4 });
    backend({ activity: { ...s, measured_since: s.periods[78].period } });
    mount(<ActivityCard />);
    expect(await screen.findByText(/Study time is tracked from/)).toBeInTheDocument();
  });

  it("keeps the days when only the streak can't be read", async () => {
    backend({ streak: 500 });
    mount(<ActivityCard />);
    const card = await screen.findByRole("region", { name: "Study habits" });
    await within(card).findByRole("img", { name: /Answers each day/ });
    expect(within(card).getByText("Day streak").nextSibling).toHaveTextContent("—");
  });

  it("says what fills an empty card", async () => {
    backend({ activity: series(84) });
    mount(<ActivityCard />);
    expect(await screen.findByText(/This fills in as lessons are worked through/)).toBeInTheDocument();
  });

  it("shows Couldn't load with Retry, and retrying reads it again", async () => {
    backend({ activity: 500 });
    mount(<ActivityCard />);
    expect(await screen.findByText(/Couldn.t load this section/)).toBeInTheDocument();

    backend(); // the next read works
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("img", { name: /Answers each day/ })).toBeInTheDocument();
  });

  it("is not offered to the teacher's report", () => {
    render(<ReportExtrasProvider who={null} summary={null}><ActivityCard /></ReportExtrasProvider>);
    expect(screen.queryByRole("region", { name: "Study habits" })).not.toBeInTheDocument();
  });
});

describe("right answers alone and with help", () => {
  it("shows them side by side with the hints, never as one score", () => {
    render(<IndependenceBar help={HELP} />);
    expect(screen.getByText("75% of right answers on their own")).toBeInTheDocument();
    expect(screen.getByText("6 alone · 2 with help · 3 hints")).toBeInTheDocument();
  });

  it("says so when there is nothing right to compare yet", () => {
    render(<IndependenceBar help={{ correct_alone: 0, correct_with_help: 0, hints_used: 2 }} />);
    expect(screen.getByText(/No right answers yet/)).toBeInTheDocument();
  });
});

describe("what to work on", () => {
  const item = (n: number, over: Record<string, unknown> = {}) => ({
    misconception_id: `m-${n}`, title: `SYNTHETIC idea ${n}`, chapter_id: "c-1", chapter_title: "SYNTHETIC Fractions", subject_code: "mathematics",
    first_seen_at: "2026-10-01T10:00:00Z", last_seen_at: "2026-10-10T10:00:00Z", times_seen: 2, resolved: false, ...over,
  });
  const k = (id: string, over: Record<string, unknown> = {}) => ({ component_id: id, title: `SYNTHETIC ${id}`, level: "getting_there", status: "keep_practising", due: false, needs_adult_support: false, ...over });
  const data = (skills: object[] = [k("compare", { due: true }), k("order", { needs_adult_support: true })]) => makeData({
    chapters: [{ subject: "Mathematics", subject_code: "mathematics", document_title: "SYNTHETIC Fractions", completion_percentage: 50, mastery_score: 0.5, study_count: 1, grade: 6,
      skills: [{ ...k("add"), level: "got_it", status: null }, ...skills] } as never],
  });

  it("lists the skills to practise, due first, and the mix-ups still open, with a count of those cleared", async () => {
    backend({ misconceptions: { misconceptions: [item(1), item(2, { resolved: true })] } });
    mount(<FocusCard data={data()} />);

    const card = await screen.findByRole("region", { name: "What to work on" });
    expect(within(card).queryByText("SYNTHETIC add"), "a skill that is fine stays off the list").not.toBeInTheDocument();
    const skills = within(card).getAllByText(/^SYNTHETIC (compare|order)$/).map((n) => n.textContent);
    expect(skills).toEqual(["SYNTHETIC compare", "SYNTHETIC order"]);
    expect(within(card).getByText("Revisit due")).toBeInTheDocument();
    expect(within(card).getByText("Could use an adult's help")).toBeInTheDocument();
    expect(await within(card).findByText("SYNTHETIC idea 1")).toBeInTheDocument();
    expect(within(card).queryByText("SYNTHETIC idea 2")).not.toBeInTheDocument();
    expect(within(card).getByText("1 mix-up already cleared")).toBeInTheDocument();
  });

  it("folds long lists behind View all", async () => {
    backend({ misconceptions: { misconceptions: [1, 2, 3, 4, 5].map((n) => item(n)) } });
    mount(<FocusCard data={data()} />);
    await screen.findByText("SYNTHETIC idea 3");
    expect(screen.queryByText("SYNTHETIC idea 4")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    await waitFor(() => expect(screen.getByText("SYNTHETIC idea 5")).toBeInTheDocument());
  });

  it("says so when there is nothing to work on", async () => {
    backend();
    mount(<FocusCard data={data([])} />);
    expect(await screen.findByText(/Nothing to revisit right now/)).toBeInTheDocument();
  });

  it("keeps the skills and offers Retry when the mix-ups can't be read", async () => {
    backend({ misconceptions: 500 });
    mount(<FocusCard data={data()} />);
    expect(await screen.findByText(/Couldn.t load the mix-ups/)).toBeInTheDocument();
    expect(screen.getByText("SYNTHETIC compare")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
