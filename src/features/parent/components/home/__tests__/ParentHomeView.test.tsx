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

const SUMMARY: Record<string, { overall_score: number; session_count: number }> = {
  English: { overall_score: 0.84, session_count: 28 },
  Mathematics: { overall_score: 0.45, session_count: 22 },
  Science: { overall_score: 0.68, session_count: 16 },
};

function serveChild({ timeOk = true } = {}) {
  server.use(
    http.get(`${BASE}/api/students/:id/available-agents`, () =>
      HttpResponse.json({
        partners: [{
          subjects: ["English", "Mathematics", "Science"].map((subject) => ({
            subject, agents: [{ agent_id: subject, subject, grade: 7 }],
          })),
        }],
      }),
    ),
    http.get(`${BASE}/students/:id/skill-summary`, ({ request }) => {
      const subject = new URL(request.url).searchParams.get("subject")!;
      return HttpResponse.json({ ...SUMMARY[subject], skill_index: 1 });
    }),
    http.get(`${BASE}/students/:id/chapter-mastery`, ({ request }) => {
      const subject = new URL(request.url).searchParams.get("subject");
      const started = subject === "English" ? 11 : 6;
      return HttpResponse.json(
        Array.from({ length: 14 }, (_, i) => ({ subject, document_title: `Ch ${i}`, completion_percentage: i < started ? 50 : 0 })),
      );
    }),
    http.get(`${BASE}/students/:id/time/by-chapter`, () =>
      HttpResponse.json([
        { subject: "English", chapter_name: "a", total_minutes: 500, session_count: 3 },
        { subject: "English", chapter_name: "b", total_minutes: 360, session_count: 2 },
        { subject: "Mathematics", chapter_name: "c", total_minutes: 610, session_count: 4 },
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
    http.post(`${BASE}/get-session`, () =>
      HttpResponse.json({
        sessions: [3, 8, 12, 40].map((d) => ({ created_at: new Date(Date.now() - d * DAY).toISOString() })),
      }),
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
  it("leaves Learning Score, Skill Index and alerts blank until the backend provides them", () => {
    serveChild();
    renderHome();
    expect(within(card("Overall Learning Score")).getByText("Available soon")).toBeInTheDocument();
    expect(within(card("Skill Index")).getByText("Coming soon")).toBeInTheDocument();
    expect(within(card("Recent Alerts & Updates")).getByText("No alerts right now")).toBeInTheDocument();
  });

  it("totals sessions across subjects with a month-on-month trend", async () => {
    serveChild();
    renderHome();
    const sessions = card("Completed Sessions");
    expect(await within(sessions).findByText("66")).toBeInTheDocument(); // 28 + 22 + 16
    expect(within(sessions).getByText("+200% this month")).toBeInTheDocument(); // 3 vs 1
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

  it("summarises each subject with report-card bands and links to its page", async () => {
    serveChild();
    renderHome();

    const english = await screen.findByRole("link", { name: /^English: Advanced, 84% mastery/ });
    expect(english).toHaveAttribute("href", "/parent/s1/subject/English");
    expect(within(english).getByText("28")).toBeInTheDocument();
    expect(within(english).getByText("14h 20m")).toBeInTheDocument();
    expect(within(english).getByText("11/14")).toBeInTheDocument();

    await screen.findByRole("link", { name: /^Mathematics: Approaching, 45% mastery/ });
    const science = await screen.findByRole("link", { name: /^Science: Proficient, 68% mastery/ });
    await waitFor(() => expect(within(science).getByText("0m")).toBeInTheDocument()); // no time logged
  });
});
