import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { chapterMastery, loadV1Report } from "../v1Report";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

const recent = (over: Record<string, unknown>) => ({
  chapter_id: "c-1", chapter_title: "SYNTHETIC Fractions", chapter_number: 1, book_title: "SYNTHETIC Book",
  subject: "mathematics", instance_id: "i-1", state: "active", nodes_done: 3, nodes_total: 6,
  started_at: "2026-10-01T10:00:00Z", completed_at: null, last_active_at: "2026-10-10T10:00:00Z",
  palette: "mathematics:0", card: null, ...over,
});
const report = { completed: false, nodes_done: 3, nodes_total: 6, answers: { answered: 9, correct: 7 },
  outcomes: [{ code: "M1", title: "SYNTHETIC outcome", mastered: true }, { code: "M2", title: "SYNTHETIC two", mastered: false }] };
const skills = { levels_version: "progress_levels_v2", skills: [
  { component_id: "k1", title: "SYNTHETIC add", chapter_id: "c-1", chapter_title: "x", instance_id: "i-1", level: "got_it", status: null, due: false, due_at: null, needs_adult_support: false },
  { component_id: "k2", title: "SYNTHETIC compare", chapter_id: "c-1", chapter_title: "x", instance_id: "i-1", level: "getting_there", status: "keep_practising", due: true, due_at: null, needs_adult_support: true },
] };

beforeEach(() => localStorage.setItem("gened_auth_token", "token-synthetic"));

describe("the report card on the new backend", () => {
  it("rates a chapter only from skills with evidence, Got it and Strong counting as known", () => {
    expect(chapterMastery([])).toBe(0);
    const k = (level: string) => ({ component_id: level, title: level, level, status: null, due: false, needs_adult_support: false }) as never;
    expect(chapterMastery([k("not_started"), k("not_started")])).toBe(0);
    expect(chapterMastery([k("strong"), k("got_it"), k("good_start"), k("getting_there"), k("not_started")])).toBe(0.5);
  });

  it("builds a student's report: every chapter they can open, the worked one carrying its facts", async () => {
    const asked: string[] = [];
    server.use(
      http.get(`${BASE}/v1/learner/recent-chapters`, ({ request }) => { asked.push(new URL(request.url).search); return HttpResponse.json({ chapters: [recent({})] }); }),
      http.get(`${BASE}/v1/skills`, () => HttpResponse.json(skills)),
      http.get(`${BASE}/v1/learner/available-subjects`, () => HttpResponse.json({ grade: 6, subjects: [{ subject: "Mathematics", chapter_count: 2 }] })),
      http.get(`${BASE}/v1/learner/chapters`, () => HttpResponse.json({ subject: "Mathematics", grade: 6, chapters: [
        { chapter_id: "c-1", source_id: "s", number: 1, title: "SYNTHETIC Fractions", book_title: "SYNTHETIC Book", palette: "p", card: null },
        { chapter_id: "c-2", source_id: "s", number: 2, title: "SYNTHETIC Decimals", book_title: "SYNTHETIC Book", palette: "p", card: null },
      ] })),
      http.get(`${BASE}/v1/instances/:id/report`, () => HttpResponse.json(report)),
      http.get(`${BASE}/students/s-1/time/by-chapter`, () => HttpResponse.json([{ chapter_id: "c-1", chapter_name: "x", subject: "mathematics", total_minutes: 42.6, session_count: 3 }])),
    );

    const d = await loadV1Report({ role: "student", studentId: "s-1" });

    expect(asked).toEqual(["?limit=50"]);
    expect(d.totalSessions).toBe(1);
    expect(d.subjects).toEqual([{ subject: "Mathematics", overall_score: 0.5, skill_index: 0, adaptive_mode: "", session_count: 1 }]);
    const [worked, untouched] = d.chapters;
    expect(worked).toMatchObject({
      subject: "Mathematics", document_title: "SYNTHETIC Fractions", completion_percentage: 50, mastery_score: 0.5,
      status: "in_progress", nodes_done: 3, nodes_total: 6, answered: 9, correct: 7, last_active_at: "2026-10-10T10:00:00Z",
      time_minutes: 42.6,
    });
    expect(worked.skills?.map((s) => s.level)).toEqual(["got_it", "getting_there"]);
    expect(untouched).toMatchObject({ document_title: "SYNTHETIC Decimals", completion_percentage: 0, study_count: 0, skills: [] });
    expect(untouched.instance_id).toBeUndefined();
    // What the backend no longer reports stays empty, for the screen to show as coming soon.
    expect([d.testSubmissions, d.chapterEvolutions, d.subjectEvolutions, d.progressReport]).toEqual([[], [], [], null]);
  });

  it("builds a parent's report from the child's own routes, naming subjects from their codes", async () => {
    const paths: string[] = [];
    server.use(
      http.get(`${BASE}/v1/parent/children/:id/recent-chapters`, ({ request }) => { paths.push(new URL(request.url).pathname); return HttpResponse.json({ chapters: [recent({ subject: "social_science", state: "completed", completed_at: "2026-10-09T10:00:00Z" })] }); }),
      http.get(`${BASE}/v1/parent/children/:id/skills`, () => HttpResponse.json(skills)),
      http.get(`${BASE}/v1/parent/children/:id/instances/:inst/report`, ({ request }) => { paths.push(new URL(request.url).pathname); return HttpResponse.json(report); }),
    );

    const d = await loadV1Report({ role: "parent", childId: "kid-1" });

    expect(paths.every((p) => p.includes("/v1/parent/children/kid-1/"))).toBe(true);
    expect(d.chapters).toHaveLength(1);
    expect(d.chapters[0]).toMatchObject({ subject: "Social Science", completion_percentage: 100, status: "completed" });
  });

  it("keeps the chapter when its report can't be read, without inventing its answers", async () => {
    server.use(
      http.get(`${BASE}/v1/learner/recent-chapters`, () => HttpResponse.json({ chapters: [recent({})] })),
      http.get(`${BASE}/v1/skills`, () => HttpResponse.json({ skills: [] })),
      http.get(`${BASE}/v1/learner/available-subjects`, () => HttpResponse.json({ grade: 6, subjects: [] })),
      http.get(`${BASE}/v1/instances/:id/report`, () => HttpResponse.json({ message: "nope" }, { status: 500 })),
    );
    const [ch] = (await loadV1Report({ role: "student", studentId: "s-1" })).chapters;
    expect(ch).toMatchObject({ document_title: "SYNTHETIC Fractions", answered: null, correct: null, outcomes: null });
  });
});
