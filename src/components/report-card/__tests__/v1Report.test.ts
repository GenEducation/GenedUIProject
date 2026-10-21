import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { chapterRows } from "../selectors";
import { loadV1Report, type ReportBody } from "../v1Report";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

const help = { correct_alone: 5, correct_with_help: 2, hints_used: 1 };
const skill = (over: Record<string, unknown>) => ({
  component_id: "k1", title: "SYNTHETIC add", level: "got_it", status: null, due: false, needs_adult_support: false, ...over,
});
const worked = {
  chapter_id: "c-1", subject_code: "mathematics", subject: "Mathematics", book_title: "SYNTHETIC Book", number: 1, title: "SYNTHETIC Fractions",
  instance_id: "i-1", status: "in_progress" as const, nodes_done: 3, nodes_total: 6, completion: 0.5, mastery: 0.5,
  skills: [skill({}), skill({ component_id: "k2", title: "SYNTHETIC compare", level: "getting_there", status: "keep_practising", due: true, needs_adult_support: true })],
  answered: 9, correct: 7, help,
  outcomes: [{ code: "M1", title: "SYNTHETIC outcome", mastered: true }, { code: "M2", title: "SYNTHETIC two", mastered: false }],
  last_active_at: "2026-10-10T10:00:00Z",
};
const untouched = {
  chapter_id: "c-2", subject_code: "mathematics", subject: "Mathematics", book_title: "SYNTHETIC Book", number: 2, title: "SYNTHETIC Decimals",
  instance_id: null, status: "not_started" as const, nodes_done: 0, nodes_total: 0, completion: 0, mastery: null, skills: [],
  answered: null, correct: null, help: null, outcomes: null, last_active_at: null,
};
const body: ReportBody = {
  grade: 6, board: "CBSE",
  summary: { answered: 9, correct: 7, help, chapters_available: 2, chapters_opened: 1, chapters_completed: 0, completion: 0.25, mastery: 0.5 },
  subjects: [{ code: "mathematics", name: "Mathematics", mastery: 0.5, chapters_opened: 1 }],
  chapters: [worked, untouched],
};

beforeEach(() => localStorage.setItem("gened_auth_token", "token-synthetic"));

describe("the report card on the new backend", () => {
  it("maps a student's whole report from one read, with each chapter's estimated time", async () => {
    const asked: string[] = [];
    server.use(
      http.get(`${BASE}/v1/learner/report`, ({ request }) => { asked.push(new URL(request.url).pathname); return HttpResponse.json(body); }),
      http.get(`${BASE}/students/s-1/time/by-chapter`, () => HttpResponse.json([{ chapter_id: "c-1", total_minutes: 12.4 }])),
    );

    const d = await loadV1Report({ role: "student", studentId: "s-1" });

    expect(asked).toHaveLength(1);
    expect(d.profile).toEqual({ grade: 6, board: "CBSE" });
    expect(d.totalSessions).toBe(1);
    expect(d.subjects).toEqual([{ subject: "Mathematics", overall_score: 0.5, skill_index: 0, adaptive_mode: "", session_count: 1 }]);
    const [first, second] = d.chapters;
    expect(first).toMatchObject({
      subject: "Mathematics", subject_code: "mathematics", document_title: "SYNTHETIC Fractions", completion_percentage: 50, mastery_score: 0.5,
      status: "in_progress", nodes_done: 3, nodes_total: 6, answered: 9, correct: 7, help, time_minutes: 12.4, last_active_at: "2026-10-10T10:00:00Z",
    });
    expect(first.skills?.map((s) => s.level)).toEqual(["got_it", "getting_there"]);
    expect(second).toMatchObject({ document_title: "SYNTHETIC Decimals", completion_percentage: 0, study_count: 0, status: null, skills: [] });
    expect([second.instance_id, second.answered, second.help, second.time_minutes]).toEqual([undefined, undefined, undefined, undefined]);
    // What the backend does not report stays empty, for the screen to show as coming soon.
    expect([d.testSubmissions, d.chapterEvolutions, d.subjectEvolutions, d.progressReport]).toEqual([[], [], [], null]);
  });

  it("keeps a finished chapter Completed while the student revisits it, and says so", async () => {
    const revisited = { ...worked, status: "completed" as const, completion: 1, revisiting: true };
    server.use(
      http.get(`${BASE}/v1/learner/report`, () => HttpResponse.json({ ...body, chapters: [revisited, untouched] })),
      http.get(`${BASE}/students/s-1/time/by-chapter`, () => HttpResponse.json([])),
    );

    const d = await loadV1Report({ role: "student", studentId: "s-1" });
    const rows = chapterRows(d, "Mathematics");

    expect(rows[0]).toMatchObject({ status: "Completed", coverage: 100, revisiting: true });
    expect(rows[1].revisiting).toBe(false);
  });

  it("keeps nothing measured as no mastery, not a score: the card reads 'measured' from the skills", async () => {
    server.use(http.get(`${BASE}/v1/learner/report`, () => HttpResponse.json({ ...body, subjects: [{ code: "mathematics", name: "Mathematics", mastery: null, chapters_opened: 1 }], chapters: [{ ...worked, mastery: null, skills: [skill({ level: "not_started" })] }] })));
    const d = await loadV1Report({ role: "student" });
    expect(d.subjects[0].overall_score).toBe(0);
    expect(d.chapters[0].mastery_score).toBe(0);
    expect(d.chapters[0].skills?.every((s) => s.level === "not_started")).toBe(true);
  });

  it("reads a parent's report from the child's own route, with the child's grade and board", async () => {
    const paths: string[] = [];
    server.use(
      http.get(`${BASE}/v1/parent/children/:id/report`, ({ request }) => { paths.push(new URL(request.url).pathname); return HttpResponse.json(body); }),
      http.get(`${BASE}/students/kid-1/time/by-chapter`, () => HttpResponse.json([])),
    );

    const d = await loadV1Report({ role: "parent", childId: "kid-1" });

    expect(paths).toHaveLength(1);
    expect(paths[0].endsWith("/v1/parent/children/kid-1/report")).toBe(true);
    expect(d.profile).toEqual({ grade: 6, board: "CBSE" });
    expect(d.chapters).toHaveLength(2);
  });

  it("keeps the report when the study times can't be read, without inventing any", async () => {
    server.use(
      http.get(`${BASE}/v1/learner/report`, () => HttpResponse.json(body)),
      http.get(`${BASE}/students/s-1/time/by-chapter`, () => HttpResponse.json({ message: "nope" }, { status: 500 })),
    );
    const d = await loadV1Report({ role: "student", studentId: "s-1" });
    expect(d.chapters[0]).toMatchObject({ document_title: "SYNTHETIC Fractions", time_minutes: undefined });
  });

  it("fails when the report itself can't be read", async () => {
    server.use(http.get(`${BASE}/v1/learner/report`, () => HttpResponse.json({ message: "nope" }, { status: 500 })));
    await expect(loadV1Report({ role: "student" })).rejects.toBeTruthy();
  });
});
