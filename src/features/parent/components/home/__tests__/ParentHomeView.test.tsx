import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { localDayKey } from "../../../utils/homeMetrics";
import { ParentHomeView } from "../ParentHomeView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/parent/s1",
  useSearchParams: () => new URLSearchParams(),
}));

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => localDayKey(new Date(Date.now() - n * DAY));

// The child's report (`/v1/parent/children/{id}/report`): subjects by code, mastery 0–1, null when nothing is measured.
const REPORT_SUBJECTS = [
  { code: "english", name: "English", mastery: 0.84, chapters_opened: 11, chapters_total: 14 },
  { code: "mathematics", name: "Mathematics", mastery: 0.45, chapters_opened: 6, chapters_total: 14 },
  { code: "science", name: "Science", mastery: null, chapters_opened: 1, chapters_total: 12 },
];

function serveChild({ timeOk = true, reportOk = true } = {}) {
  server.use(
    http.get(`${BASE}/parent/children/:id/available-subjects`, () =>
      HttpResponse.json({
        grade: 7,
        subjects: ["English", "Mathematics", "Science"].map((subject) => ({ subject, chapter_count: 1 })),
      }),
    ),
    http.get(`${BASE}/v1/parent/children/:id/report`, () =>
      reportOk ? HttpResponse.json({ grade: 7, board: "CBSE", summary: {}, chapters: [], subjects: REPORT_SUBJECTS }) : new HttpResponse(null, { status: 500 }),
    ),
    // The backend names subjects by code; the page matches them to its own names.
    http.get(`${BASE}/students/:id/time/by-chapter`, () =>
      HttpResponse.json([
        { chapter_id: "c1", subject: "english", chapter_name: "a", total_minutes: 500, session_count: 3 },
        { chapter_id: "c2", subject: "english", chapter_name: "b", total_minutes: 360, session_count: 2 },
        { chapter_id: "c3", subject: "mathematics", chapter_name: "c", total_minutes: 610, session_count: 4 },
      ]),
    ),
    http.get(`${BASE}/students/:id/time/by-period`, () =>
      timeOk
        ? HttpResponse.json([
            { period: daysAgo(2), total_minutes: 60 },
            { period: daysAgo(10), total_minutes: 90 },
            { period: daysAgo(60), total_minutes: 1000 },
          ])
        : new HttpResponse(null, { status: 500 }),
    ),
  );
}

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("parent", { profile: { user_id: "p1" } });
});

const renderHome = () => render(<ParentHomeView studentId="s1" />);
const card = (name: string) => screen.getByRole("region", { name });

describe("ParentHomeView", () => {
  it("totals sessions from the time breakdown, over all time", async () => {
    serveChild();
    renderHome();
    const sessions = card("Completed Sessions");
    expect(await within(sessions).findByText("9")).toBeInTheDocument(); // 3 + 2 + 4
    expect(within(sessions).getByText("All time")).toBeInTheDocument();
  });

  it("shows study time for the chosen period", async () => {
    serveChild();
    renderHome();
    const study = card("Study Time");
    expect(await within(study).findByText("2h 30m")).toBeInTheDocument(); // last 30 days: 60 + 90

    fireEvent.click(within(study).getByRole("combobox", { name: "Study time period" }));
    fireEvent.click(screen.getByRole("option", { name: "Last 7 Days" }));
    expect(await within(study).findByText("1h 0m")).toBeInTheDocument();
    expect(screen.getByText("Daily study minutes — last 7 days")).toBeInTheDocument();
  });

  it("says when study time can't be loaded", async () => {
    serveChild({ timeOk: false });
    renderHome();
    expect(await screen.findByText("Study time isn't available right now.")).toBeInTheDocument();
  });

  it("summarises each subject from the child's report, with report-card bands, and links to its page", async () => {
    serveChild();
    renderHome();

    const english = await screen.findByRole("link", { name: /^English: Advanced, 84% mastery/ });
    expect(english).toHaveAttribute("href", "/parent/s1/subject/English");
    await waitFor(() => expect(within(english).getByText("14h 20m")).toBeInTheDocument());
    expect(within(english).getByText("5")).toBeInTheDocument(); // sessions: 3 + 2
    expect(within(english).getByText("11/14")).toBeInTheDocument();

    await screen.findByRole("link", { name: /^Mathematics: Approaching, 45% mastery/ });
    // Opened, nothing measured: like the report card, no 0% and no band.
    const science = await screen.findByRole("link", { name: /^Science: No answers yet\. View details/ });
    expect(within(science).getByText("No answers yet")).toBeInTheDocument();
    expect(within(science).getByText("1/12")).toBeInTheDocument();
    await waitFor(() => expect(within(science).getByText("0m")).toBeInTheDocument()); // no time logged
  });

  it("shows a dash, not 0%, when the report can't be loaded", async () => {
    serveChild({ reportOk: false });
    renderHome();
    const english = await screen.findByRole("link", { name: /^English: Unavailable\. View details/ });
    await waitFor(() => expect(within(english).getAllByText("—")).toHaveLength(2)); // mastery, chapters
    expect(within(english).queryByText("0%")).toBeNull();
    expect(within(english).getByText("5")).toBeInTheDocument(); // sessions still come from the time breakdown
  });
});
