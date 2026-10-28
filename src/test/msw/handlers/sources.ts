import { http, HttpResponse } from "msw";
import type {
  AuthoredQuestions,
  AuthoringResponse,
  LearningOutcome,
  QuestionsResponse,
  RecordedAnswer,
  ReleaseDecision,
  SourceRelease,
  SourceState,
  SourceView,
} from "@/features/partner/types/sources";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const SOURCES = `${BASE}/v1/sources`;

/**
 * SYNTHETIC partner chapter sources (ADR 0014). Titles are labelled SYNTHETIC;
 * the learning-outcome codes mirror the shape of the taxonomy's, not its text.
 */
export const SYNTHETIC_OUTCOMES: LearningOutcome[] = [
  { code: "G6-MATH-LO1.1.1", name: "SYNTHETIC outcome one", competency_code: "G6-MATH-C1.1", competency_name: "SYNTHETIC competency A" },
  { code: "G6-MATH-LO1.2.1", name: "SYNTHETIC outcome two", competency_code: "G6-MATH-C1.2", competency_name: "Fractions & decimals" },
];

let seq = 0;

export function makeSource(overrides: Partial<SourceView> = {}): SourceView {
  seq += 1;
  const id = overrides.source_id ?? `synthetic-press-synthetic-book-6-ch${seq}-${String(seq).padStart(10, "0")}`;
  return {
    source_id: id,
    board: "CBSE",
    publisher: "synthetic_press",
    subject: "Mathematics",
    grade: 6,
    book_title: "SYNTHETIC Book",
    edition_label: "SYNTHETIC TEST DATA",
    chapter: { ordinal: seq, title: `SYNTHETIC chapter ${seq}`, first_pdf_page: 1, last_pdf_page: 3 },
    pdf_file_name: "synthetic.pdf",
    page_count: 3,
    strand: "synthetic_strand",
    lo_codes: ["G6-MATH-LO1.2.1"],
    state: "registered",
    detail: null,
    visuals: null,
    has_report: false,
    questions: 0,
    progress: null,
    release: null,
    queued_at: null,
    started_at: null,
    finished_at: null,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, seq)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 0, 1, 0, seq)).toISOString(),
    ...overrides,
  };
}

const store = new Map<string, SourceView>();
const reports = new Map<string, string>();
const questions = new Map<string, QuestionsResponse>();
const releases = new Map<string, SourceRelease>();
const authoring = new Map<string, AuthoringResponse>();
/** Drafts the fake worker returns for the next suggestions request (they arrive on the next GET). */
const pendingDrafts = new Map<string, AuthoringResponse["authored"]["added"]>();
/** The last authored questions PUT, for asserting what the screen sent. */
export let lastAuthored: AuthoredQuestions | null = null;
/** The last release decisions POST, for asserting what the screen sent. */
export let lastReleaseDecisions: ReleaseDecision[] | null = null;
/** The last answers PUT, for asserting what the screen sent. */
export let lastAnswers: Record<string, RecordedAnswer> | null = null;
let strands: string[] = ["synthetic_existing"];
/** The last upload's multipart fields, for asserting what the form sent. */
export let lastUpload: Record<string, string | string[]> | null = null;

export const sourcesFixture = {
  /** Pass a factory so `makeSource` numbering restarts at 1 in every test. */
  reset(build?: () => SourceView[]) {
    store.clear();
    reports.clear();
    questions.clear();
    releases.clear();
    authoring.clear();
    pendingDrafts.clear();
    lastAuthored = null;
    lastReleaseDecisions = null;
    lastAnswers = null;
    seq = 0;
    strands = ["synthetic_existing"];
    lastUpload = null;
    for (const s of build?.() ?? []) store.set(s.source_id, s);
  },
  get: (id: string) => store.get(id),
  set: (s: SourceView) => void store.set(s.source_id, s),
  setState: (id: string, state: SourceState, detail: string | null = null) => {
    const s = store.get(id);
    if (s) store.set(id, { ...s, state, detail });
  },
  setStrands: (next: string[]) => void (strands = next),
  /** Make a source wait on reconciliation questions (state `review_needed`), as the worker does. */
  setQuestions: (id: string, q: QuestionsResponse) => {
    questions.set(id, q);
    const s = store.get(id);
    if (s) store.set(id, { ...s, state: "review_needed", questions: q.questions.length });
  },
  /** Give a source a staged release, as the worker does when a run ends ready. */
  /** Make a source a run that found too few questions the partner can complete (ADR 0036), as the worker does. */
  setAuthoring: (id: string, a: AuthoringResponse) => {
    authoring.set(id, structuredClone(a));
    const s = store.get(id);
    if (s) {
      store.set(id, {
        ...s,
        state: "invalid",
        has_authoring: true,
        outcome: {
          next_step: "add_questions",
          findings: [{ check: "single_component_share", count: 1, owner: "partner" }],
          can_run_again: false,
          run_again_blocked: "same_result",
        },
      });
    }
  },
  /** The drafts the fake worker writes for the next suggestions request. */
  setDrafts: (id: string, drafts: AuthoringResponse["authored"]["added"]) => void pendingDrafts.set(id, drafts),
  setRelease: (id: string, release: SourceRelease) => void releases.set(id, structuredClone(release)),
  getRelease: (id: string) => releases.get(id),
  /** Give a source a review report (and `has_report: true`), as the worker does when a run finishes. */
  setReport: (id: string, markdown: string) => {
    reports.set(id, markdown);
    const s = store.get(id);
    if (s) store.set(id, { ...s, has_report: true });
  },
};

const conflict = (message: string) =>
  HttpResponse.json({ error_code: "HTTP_409", message, request_id: "req-synthetic" }, { status: 409 });
const notFound = () => HttpResponse.json({ message: "This chapter was not found." }, { status: 404 });

const SINGLE_FIELDS = [
  "board", "publisher", "subject", "grade", "book_title", "edition_label", "chapter_ordinal", "chapter_title",
  "first_pdf_page", "last_pdf_page", "strand",
] as const;

const STARTABLE = new Set<SourceState>(["registered", "review_needed", "invalid", "ready", "failed"]);
const DELETABLE = new Set<SourceState>(["registered", "review_needed", "invalid", "ready", "failed"]);

export const sourcesHandlers = [
  http.get(`${SOURCES}/learning-outcomes`, ({ request }) => {
    const q = new URL(request.url).searchParams;
    const known = q.get("subject") === "Mathematics" && q.get("grade") === "6";
    return HttpResponse.json(known ? SYNTHETIC_OUTCOMES : []);
  }),

  http.get(`${SOURCES}/strands`, () => HttpResponse.json(strands)),

  http.get(SOURCES, ({ request }) => {
    const q = new URL(request.url).searchParams;
    const limit = Number(q.get("limit") ?? 20);
    const offset = Number(q.get("offset") ?? 0);
    const search = q.get("search")?.toLowerCase();
    const items = [...store.values()]
      .filter((s) => !q.get("state") || s.state === q.get("state"))
      .filter((s) => !q.get("subject") || s.subject === q.get("subject"))
      .filter((s) => !q.get("grade") || s.grade === Number(q.get("grade")))
      .filter((s) => !search || `${s.book_title} ${s.chapter.title}`.toLowerCase().includes(search))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return HttpResponse.json({ items: items.slice(offset, offset + limit), total_count: items.length, limit, offset });
  }),

  http.post(SOURCES, async ({ request }) => {
    const form = await request.formData();
    const fields: Record<string, string | string[]> = {};
    for (const key of SINGLE_FIELDS) {
      const [value] = form.getAll(key);
      if (value !== undefined) fields[key] = String(value);
    }
    fields.lo_codes = form.getAll("lo_codes").map(String);
    fields.full_coverage_codes = form.getAll("full_coverage_codes").map(String);
    lastUpload = fields;
    if (Number(fields.last_pdf_page) > 3) {
      return HttpResponse.json({ message: "The page range must be within 1 to 3, first page before last." }, { status: 422 });
    }
    const source = makeSource({
      subject: String(fields.subject),
      grade: Number(fields.grade),
      book_title: String(fields.book_title),
      chapter: {
        ordinal: Number(fields.chapter_ordinal),
        title: String(fields.chapter_title),
        first_pdf_page: Number(fields.first_pdf_page),
        last_pdf_page: Number(fields.last_pdf_page),
      },
      strand: String(fields.strand),
      lo_codes: fields.lo_codes as string[],
    });
    store.set(source.source_id, source);
    return HttpResponse.json(source, { status: 201 });
  }),

  http.get(`${SOURCES}/:id`, ({ params }) => {
    const s = store.get(String(params.id));
    return s ? HttpResponse.json(s) : notFound();
  }),

  http.post(`${SOURCES}/:id/ingestions`, ({ params }) => {
    const s = store.get(String(params.id));
    if (!s) return notFound();
    // A lost run comes back as `run_again` whatever its state says (backend: a stale `running` row).
    const lost = s.outcome?.next_step === "run_again" && s.outcome.can_run_again;
    if (!STARTABLE.has(s.state) && !lost) return conflict(`This chapter is already ${s.state}.`);
    const next = { ...s, state: "queued" as const, detail: null };
    store.set(s.source_id, next);
    return HttpResponse.json(next, { status: 202 });
  }),

  http.delete(`${SOURCES}/:id/ingestions`, ({ params }) => {
    const s = store.get(String(params.id));
    if (!s) return notFound();
    if (s.state !== "queued") return conflict("Only a chapter that is still waiting to start can be cancelled.");
    const next = { ...s, state: "registered" as const };
    store.set(s.source_id, next);
    return HttpResponse.json(next);
  }),

  http.delete(`${SOURCES}/:id`, ({ params }) => {
    const s = store.get(String(params.id));
    if (!s) return notFound();
    if (!DELETABLE.has(s.state)) return conflict(`A chapter that is ${s.state} cannot be deleted.`);
    // Mirrors the backend: a source a published release came from is kept, because learners study it.
    if (s.release?.state === "published" || releases.get(s.source_id)?.release.state === "published") {
      return conflict("A published chapter cannot be deleted: learners study it.");
    }
    store.delete(s.source_id);
    return new HttpResponse(null, { status: 204 });
  }),

  // Mirrors the backend: answer a pending cut only; including the pages widens the range and queues a re-run.
  http.put(`${SOURCES}/:id/excluded-pages`, async ({ params, request }) => {
    const s = store.get(String(params.id));
    if (!s) return notFound();
    const cut = s.excluded_pages;
    if (!cut || cut.status !== "pending") return conflict("This chapter has no left-out pages waiting for an answer.");
    const { decision } = (await request.json()) as { decision: "confirm" | "include" };
    if (decision === "confirm") {
      store.set(s.source_id, { ...s, excluded_pages: { ...cut, status: "confirmed" } });
    } else {
      if (!STARTABLE.has(s.state)) return conflict(`The pages can be added back once this chapter is no longer ${s.state}.`);
      store.set(s.source_id, {
        ...s,
        state: "queued",
        chapter: { ...s.chapter, last_pdf_page: cut.last_page },
        excluded_pages: { ...cut, status: "included" },
      });
    }
    return HttpResponse.json(store.get(s.source_id));
  }),

  http.get(`${SOURCES}/:id/reconciliation`, ({ params }) => {
    const q = questions.get(String(params.id));
    return q ? HttpResponse.json(q) : HttpResponse.json({ message: "This chapter has no questions waiting." }, { status: 404 });
  }),

  // Mirrors the backend's rules: `novel`, `same_as` an offered concept of this chapter, or `match` an offered published one.
  http.put(`${SOURCES}/:id/reconciliation`, async ({ params, request }) => {
    const q = questions.get(String(params.id));
    if (!q) return conflict("This chapter has no questions waiting.");
    const { decisions } = (await request.json()) as { decisions: Record<string, RecordedAnswer> };
    lastAnswers = decisions;
    for (const [key, answer] of Object.entries(decisions)) {
      const question = q.questions.find((x) => x.key === key);
      if (!question) return HttpResponse.json({ message: `There is no question about ${key} in this chapter's last run.` }, { status: 422 });
      if (!q.allowed_answers.includes(answer.decision)) {
        return HttpResponse.json({ message: "That answer is not allowed here." }, { status: 422 });
      }
      if (answer.decision === "match" && !question.candidates.some((c) => c.where === "catalogue" && c.component_id === answer.component_id)) {
        return HttpResponse.json({ message: `Pick one of the published concepts offered for ${question.proposal.title}.` }, { status: 422 });
      }
      if (answer.decision === "same_as" && !question.candidates.some((c) => c.where === "this_chapter" && c.proposal_key === answer.proposal_key)) {
        return HttpResponse.json({ message: `Pick one of the concepts of this chapter offered for ${question.proposal.title}.` }, { status: 422 });
      }
    }
    const next = { ...q, questions: q.questions.map((x) => (decisions[x.key] ? { ...x, answer: decisions[x.key] } : x)) };
    questions.set(String(params.id), next);
    return HttpResponse.json(next);
  }),

  http.get(`${SOURCES}/:id/authoring`, ({ params }) => {
    const id = String(params.id);
    const a = authoring.get(id);
    if (!a) return HttpResponse.json({ message: "This chapter has nothing to complete." }, { status: 404 });
    // The fake worker finishes a request between two reads.
    if (a.suggestions && a.suggestions.state !== "ready" && a.suggestions.state !== "failed") {
      a.suggestions = { ...a.suggestions, state: "ready", drafts: pendingDrafts.get(id) ?? [] };
      a.can_suggest = true;
    }
    return HttpResponse.json(a);
  }),

  // Mirrors the backend's check: answers only for removed questions, added questions for a concept of their section.
  http.put(`${SOURCES}/:id/authoring`, async ({ params, request }) => {
    const id = String(params.id);
    const a = authoring.get(id);
    if (!a) return conflict("This chapter has nothing to complete.");
    const body = (await request.json()) as AuthoredQuestions;
    lastAuthored = body;
    for (const key of Object.keys(body.answers)) {
      if (!a.removed.some((r) => r.item_key === key)) {
        return HttpResponse.json({ message: "That printed question is not one this chapter's last run removed." }, { status: 422 });
      }
    }
    for (const q of body.added) {
      if (a.concepts.find((c) => c.key === q.concept_key)?.section_key !== q.section_key) {
        return HttpResponse.json({ message: "It must check a concept from its own part of the chapter." }, { status: 422 });
      }
    }
    const next = { ...a, authored: body, authored_at: new Date().toISOString() };
    authoring.set(id, next);
    const s = store.get(id);
    if (s?.outcome) store.set(id, { ...s, outcome: { ...s.outcome, can_run_again: true, run_again_blocked: null } });
    return HttpResponse.json(next);
  }),

  http.post(`${SOURCES}/:id/authoring/suggestions`, ({ params }) => {
    const id = String(params.id);
    const a = authoring.get(id);
    if (!a?.can_suggest) return conflict("Suggestions are already being written.");
    const next: AuthoringResponse = {
      ...a,
      can_suggest: false,
      suggestions: { state: "requested", requested_at: new Date().toISOString(), drafts: [], detail: null },
    };
    authoring.set(id, next);
    return HttpResponse.json(next, { status: 202 });
  }),

  http.get(`${SOURCES}/:id/release`, ({ params }) => {
    if (!store.has(String(params.id))) return notFound();
    const r = releases.get(String(params.id));
    return r
      ? HttpResponse.json(r)
      : HttpResponse.json({ message: "This chapter has no release to review yet. A run that ends ready is sent for review automatically." }, { status: 404 });
  }),

  // Mirrors the backend: each decision is recorded on its own, bound to the content hash shown.
  http.post(`${SOURCES}/:id/release/decisions`, async ({ params, request }) => {
    const r = releases.get(String(params.id));
    if (!r) return notFound();
    const { decisions } = (await request.json()) as { decisions: ReleaseDecision[] };
    lastReleaseDecisions = decisions;
    const results = decisions.map((d) => {
      const p = r.proposals.find((x) => x.id === d.proposal_id);
      if (!p) return { proposal_id: d.proposal_id, recorded: false, error: "not a proposal of this batch" };
      if (p.content_hash !== d.content_hash) return { proposal_id: d.proposal_id, recorded: false, error: "content changed since it was reviewed" };
      if (p.state !== "pending") return { proposal_id: d.proposal_id, recorded: false, error: "already decided" };
      p.state = d.decision === "accept" ? "accepted" : "rejected";
      return { proposal_id: d.proposal_id, recorded: true, error: null };
    });
    const counts: Record<string, number> = {};
    for (const p of r.proposals) counts[p.state] = (counts[p.state] ?? 0) + 1;
    r.release.proposals = counts;
    return HttpResponse.json(results);
  }),

  http.post(`${SOURCES}/:id/release/publish`, async ({ params, request }) => {
    const r = releases.get(String(params.id));
    if (!r) return notFound();
    const { artifact_hash } = (await request.json()) as { artifact_hash: string };
    if (r.proposals.some((p) => p.state !== "accepted")) {
      return HttpResponse.json({ message: "every proposal needs a human acceptance before publication" }, { status: 409 });
    }
    if (artifact_hash !== r.release.artifact_hash) return HttpResponse.json({ message: "artifact hash mismatch" }, { status: 409 });
    r.release.state = "published";
    return HttpResponse.json({ batch_id: r.release.batch_id, state: "published" });
  }),

  http.get(`${SOURCES}/:id/report`, ({ params }) => {
    if (!store.has(String(params.id))) return notFound();
    const text = reports.get(String(params.id));
    return text === undefined
      ? HttpResponse.json({ message: "This chapter has no report yet." }, { status: 404 })
      : new HttpResponse(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
  }),

  http.get(`${SOURCES}/:id/pdf`, ({ params }) =>
    store.has(String(params.id))
      ? new HttpResponse("%PDF-SYNTHETIC", {
          headers: { "content-type": "application/pdf" },
        })
      : notFound(),
  ),
];
