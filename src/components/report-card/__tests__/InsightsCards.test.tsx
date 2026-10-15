import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { server } from "@/test/msw/server";
import { ReportExtrasProvider } from "../sections/ReportExtras";
import { KeyInsightsCard, SubjectInsight } from "../screen/InsightsCards";
import { INSIGHT_POLLING, factText, type InsightFact, type InsightsResponse, type InsightView } from "../sections/reportSections";
import type { ReportWho } from "../v1Report";
import { makeData } from "./fixtures";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const STUDENT: ReportWho = { role: "student", studentId: "s-1" };
const PARENT: ReportWho = { role: "parent", childId: "kid-1" };
const fact = (over: Partial<InsightFact>): InsightFact => ({ id: "f1", kind: "mastery", subject_code: "mathematics", label: "Mathematics", value: 75, of: null, unit: "percent", signal: "positive", ...over });

const note = (headline = "Mathematics is going well.", over: Partial<InsightView> = {}): InsightView => ({
  generated_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  headline,
  headline_evidence: ["f1", "f2"],
  working_well: [{ text: "Mathematics mastery is 75 percent.", evidence: ["f1"] }],
  needs_attention: [{ text: "One mix-up has come up twice.", evidence: ["f2"] }],
  next_steps: [{ kind: "clear_mixup", text: "Talk it through, then try the question again.", evidence: ["f2"] }],
  subjects: [{ subject_code: "mathematics", headline: "Mathematics is steady.", working_well: [{ text: "Mastery is 75 percent here.", evidence: ["f1"] }], needs_attention: [] }],
  facts: [fact({}), fact({ id: "f2", kind: "misconception_open", label: "SYNTHETIC wrong idea", value: 2, of: null, unit: "count", signal: "concern" })],
  ...over,
});
const response = (over: Partial<InsightsResponse> = {}): InsightsResponse => ({ status: "ready", refreshing: false, can_reload: true, insight: note(), ...over });

const saved = { ...INSIGHT_POLLING };
beforeEach(() => {
  localStorage.setItem("gened_auth_token", "token-synthetic");
  INSIGHT_POLLING.ms = 5;
});
afterEach(() => Object.assign(INSIGHT_POLLING, saved));

/** The provider reads every section; only the insights read is under test, the rest answer empty. */
function backend(insights: (n: number) => InsightsResponse | number, post?: () => InsightsResponse) {
  let reads = 0;
  const posts: string[] = [];
  const answer = (v: InsightsResponse | number) => (typeof v === "number" ? HttpResponse.json({ message: "nope" }, { status: v }) : HttpResponse.json(v));
  server.use(
    http.get(`${BASE}/v1/learner/insights`, () => answer(insights(++reads))),
    http.get(`${BASE}/v1/parent/children/:id/insights`, () => answer(insights(++reads))),
    http.post(`${BASE}/v1/learner/insights/refresh`, () => { posts.push("refresh"); return HttpResponse.json(post ? post() : response({ refreshing: true })); }),
    http.get(`${BASE}/v1/learner/activity`, () => HttpResponse.json({ start: "2026-10-01", end: "2026-10-01", measurement: "estimated", measured_since: null, periods: [] })),
    http.get(`${BASE}/v1/parent/children/:id/activity`, () => HttpResponse.json({ start: "2026-10-01", end: "2026-10-01", measurement: "estimated", measured_since: null, periods: [] })),
    http.get(`${BASE}/v1/learner/trends`, () => HttpResponse.json({ weeks: [], overall: [], subjects: [] })),
    http.get(`${BASE}/v1/parent/children/:id/trends`, () => HttpResponse.json({ weeks: [], overall: [], subjects: [] })),
    http.get(`${BASE}/v1/learner/misconceptions`, () => HttpResponse.json({ misconceptions: [] })),
    http.get(`${BASE}/v1/parent/children/:id/misconceptions`, () => HttpResponse.json({ misconceptions: [] })),
    http.get(`${BASE}/students/:id/streak`, () => HttpResponse.json({ current_streak: 0, longest_streak: 0 })),
  );
  return { posts, reads: () => reads };
}

const mount = (ui: React.ReactNode, who: ReportWho = STUDENT) => render(<ReportExtrasProvider who={who} summary={null}>{ui}</ReportExtrasProvider>);

describe("the figures behind a sentence", () => {
  it("words each kind of fact", () => {
    expect(factText(fact({ kind: "skills_known", value: 3, of: 4 }))).toBe("Mathematics: 3 of 4 skills known");
    expect(factText(fact({ kind: "weekly_trend", value: -12, of: 3, unit: "points" }))).toBe("Mathematics: -12 points over 3 weeks");
    expect(factText(fact({ kind: "weekly_trend", value: 12, of: 3, unit: "points" }))).toBe("Mathematics: +12 points over 3 weeks");
    expect(factText(fact({ kind: "misconception_open", label: "SYNTHETIC idea", value: 1 }))).toBe("SYNTHETIC idea: seen 1 time");
    expect(factText(fact({ kind: "answers_alone_share", value: 80, of: 10, label: null }))).toBe("80% of 10 right answers on their own");
    expect(factText(fact({ kind: "active_days", value: 9, of: 30, label: null }))).toBe("9 of 30 days active");
    expect(factText(fact({ kind: "streak", value: 4, label: null }))).toBe("4-day streak");
    expect(factText(fact({ kind: "levelled_up", value: 1, of: 4, label: null }))).toBe("1 skill moved up in 4 weeks");
  });
});

describe("the key insights card", () => {
  it("shows the note with the figures each sentence rests on, and when it was written", async () => {
    backend(() => response());
    mount(<KeyInsightsCard />);

    const card = await screen.findByRole("region", { name: /Key Insights/ });
    expect(await within(card).findByText("Mathematics is going well.")).toBeInTheDocument();
    const good = within(card).getByText("Mathematics mastery is 75 percent.").closest("li") as HTMLElement;
    expect(within(good).getByText("Mathematics: 75% mastery")).toBeInTheDocument();
    const attention = within(card).getByText("One mix-up has come up twice.").closest("li") as HTMLElement;
    expect(within(attention).getByText("SYNTHETIC wrong idea: seen 2 times")).toBeInTheDocument();
    expect(within(card).getByText("Talk it through, then try the question again.")).toBeInTheDocument();
    expect(within(card).getAllByText("Mathematics: 75% mastery").length).toBeGreaterThanOrEqual(2); // under the headline and its sentence
    expect(within(card).getByText("Updated 2 days ago")).toBeInTheDocument();
    expect(within(card).getByText(/not a judgement of the child/)).toBeInTheDocument();
  });

  it("keeps the previous note on screen and reads again until the new one is written", async () => {
    INSIGHT_POLLING.ms = 80;
    const calls = backend((n) => (n <= 2 ? response({ refreshing: true }) : response({ insight: note("A newer headline.") })));
    mount(<KeyInsightsCard />);

    expect(await screen.findByText("Mathematics is going well.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Updating…");
    expect(await screen.findByText("A newer headline.")).toBeInTheDocument();
    expect(screen.queryByText("Updating…")).not.toBeInTheDocument();
    expect(calls.reads()).toBe(3);
  });

  it("reloads on the button: asks for a new note and reads until it lands", async () => {
    let written = false;
    const calls = backend(() => response({ insight: note(written ? "Freshly written." : "Mathematics is going well.") }), () => { written = true; return response({ refreshing: true }); });
    mount(<KeyInsightsCard />);

    await screen.findByText("Mathematics is going well.");
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(await screen.findByText("Freshly written.")).toBeInTheDocument();
    expect(calls.posts).toEqual(["refresh"]);
  });

  it("offers no reload when the backend says it can't (a parent, or too soon)", async () => {
    backend(() => response({ can_reload: false }));
    mount(<KeyInsightsCard />, PARENT);
    await screen.findByText("Mathematics is going well.");
    expect(screen.queryByRole("button", { name: "Reload" })).not.toBeInTheDocument();
  });

  it("says what is coming when the feature is off, there is not enough yet, or writing failed", async () => {
    backend(() => response({ status: "disabled", insight: null, can_reload: false }));
    const off = mount(<KeyInsightsCard />);
    expect(await screen.findByText("AI learning insights")).toBeInTheDocument();
    off.unmount();

    backend(() => response({ status: "none", insight: null, can_reload: false }));
    const none = mount(<KeyInsightsCard />);
    expect(await screen.findByText(/A note appears here once a few questions have been answered/)).toBeInTheDocument();
    none.unmount();

    backend(() => response({ status: "unavailable", insight: null }));
    mount(<KeyInsightsCard />);
    expect(await screen.findByText(/couldn.t be written just now/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("shows Couldn't load with Retry when the read fails, and retrying reads again", async () => {
    let n = 0;
    backend(() => (++n === 1 ? 500 : response()));
    mount(<KeyInsightsCard />);
    expect(await screen.findByText(/Couldn.t load the insights/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Mathematics is going well.")).toBeInTheDocument();
  });

  it("is not offered to the teacher's report", () => {
    render(<ReportExtrasProvider who={null} summary={null}><KeyInsightsCard /></ReportExtrasProvider>);
    expect(screen.queryByRole("region", { name: /Key Insights/ })).not.toBeInTheDocument();
  });
});

describe("a subject's insight", () => {
  const data = makeData({
    chapters: [{ subject: "Mathematics", subject_code: "mathematics", document_title: "SYNTHETIC", completion_percentage: 50, mastery_score: 0.5, study_count: 1, grade: 6, skills: [] } as never,
               { subject: "Science", subject_code: "science", document_title: "SYNTHETIC", completion_percentage: 0, mastery_score: 0, study_count: 0, grade: 6, skills: [] } as never],
  });

  it("shows the subject's own entry with its figures, found by the subject's code", async () => {
    backend(() => response());
    mount(<SubjectInsight data={data} subject="Mathematics" />);
    expect(await screen.findByText("Mathematics is steady.")).toBeInTheDocument();
    const item = screen.getByText("Mastery is 75 percent here.").closest("li") as HTMLElement;
    expect(within(item).getByText("Mathematics: 75% mastery")).toBeInTheDocument();
  });

  it("shows the overview's sentences about the subject when the note covers a single subject and has no entries", async () => {
    backend(() => response({ insight: note("Mathematics is going well.", { subjects: [] }) }));
    mount(<SubjectInsight data={data} subject="Mathematics" />);
    expect(await screen.findByText("Mathematics is going well.")).toBeInTheDocument();
    expect(screen.getByText("Mathematics mastery is 75 percent.")).toBeInTheDocument();
    expect(screen.getByText("One mix-up has come up twice."), "its fact is a Mathematics fact, so it is about this subject").toBeInTheDocument();
    expect(screen.queryByText("Talk it through, then try the question again."), "next steps stay on the overview").not.toBeInTheDocument();
  });

  it("says a note for the subject comes with more answers when the note has nothing for it", async () => {
    backend(() => response());
    mount(<SubjectInsight data={data} subject="Science" />);
    await waitFor(() => expect(screen.getByText(/once there are enough answers in it/)).toBeInTheDocument());
  });
});
