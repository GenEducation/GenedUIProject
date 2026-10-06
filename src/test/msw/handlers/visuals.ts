import { http, HttpResponse } from "msw";
import type {
  CandidateState,
  ReasonCode,
  VisualDecisionIn,
  VisualDetail,
  VisualRegenerateIn,
  VisualSummary,
} from "@/features/partner/types/visuals";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const VISUALS = `${BASE}/v1/visuals`;

/**
 * SYNTHETIC visual-library fixture. Every title, caption and passage is
 * labelled SYNTHETIC: the backend's rule is no invented curriculum content,
 * not even in UI fixtures.
 */
export const SYNTHETIC_SOURCE = "synthetic-source-g6-ch1";
export const SYNTHETIC_SUBJECT = "Mathematics";
export const SYNTHETIC_GRADE = 6;

let seq = 0;

export function makeVisual(overrides: Partial<VisualDetail> = {}): VisualDetail {
  seq += 1;
  const id = overrides.id ?? `vis-${seq}`;
  return {
    id,
    content_hash: `hash-${id}`,
    component_id: `cmp-${seq}`,
    source_id: SYNTHETIC_SOURCE,
    subject: SYNTHETIC_SUBJECT,
    grade: SYNTHETIC_GRADE,
    chapter: "SYNTHETIC chapter",
    title: `SYNTHETIC shape ${seq}`,
    image_sha256: `sha-${id}`,
    width: 1600,
    height: 1200,
    state: "pending",
    parent_id: null,
    // Newest first in lists: later fixtures get later timestamps.
    created_at: new Date(Date.UTC(2026, 0, 1, 0, seq)).toISOString(),
    critique: { passes: true, problems: [] },
    image_url: `/v1/visual-images/${id}?exp=1&sig=synthetic`,
    concept: {
      component_id: `cmp-${seq}`,
      source_id: SYNTHETIC_SOURCE,
      subject: SYNTHETIC_SUBJECT,
      grade: SYNTHETIC_GRADE,
      chapter: "SYNTHETIC chapter",
      section_title: "SYNTHETIC section",
      title: `SYNTHETIC concept ${seq}`,
      definition: "SYNTHETIC definition text.",
      passages: [
        { ref: "p1", text: "SYNTHETIC passage one." },
        { ref: "p2", text: "SYNTHETIC passage two." },
      ],
      figure_descriptions: [],
      feedback: null,
    },
    spec: {
      title: `SYNTHETIC shape ${seq}`,
      purpose: "SYNTHETIC purpose",
      layout: "SYNTHETIC layout",
      caption: "SYNTHETIC caption",
      objects: [],
      texts: [],
      source_refs: ["p1"],
      checklist: ["SYNTHETIC checklist item"],
    },
    checks: {},
    provenance: {},
    decision: null,
    regeneration: null,
    family: [],
    ...overrides,
  };
}

const store = new Map<string, VisualDetail>();
/** How a queued regeneration ends when the detail is polled: each GET advances it one step. */
let regenOutcome: "done" | "failed" = "done";

export const visualsFixture = {
  /**
   * Pass a factory, not an array, so `makeVisual` numbering restarts at 1
   * (`vis-1`, "SYNTHETIC shape 1", ...) in every test.
   */
  reset(build?: () => VisualDetail[]) {
    store.clear();
    seq = 0;
    regenOutcome = "done";
    const initial = build?.() ?? [
      makeVisual({ critique: { passes: false, problems: ["SYNTHETIC problem: label overlaps"] } }),
      makeVisual({ parent_id: "vis-old" }),
      makeVisual({ state: "accepted" }),
    ];
    for (const v of initial) store.set(v.id, v);
  },
  get: (id: string) => store.get(id),
  set: (v: VisualDetail) => void store.set(v.id, v),
  all: () => [...store.values()],
  setRegenOutcome: (outcome: "done" | "failed") => void (regenOutcome = outcome),
};

visualsFixture.reset();

function summary(v: VisualDetail): VisualSummary {
  return {
    id: v.id,
    content_hash: v.content_hash,
    component_id: v.component_id,
    source_id: v.source_id,
    subject: v.subject,
    grade: v.grade,
    chapter: v.chapter,
    title: v.title,
    caption: v.spec.caption,
    image_sha256: v.image_sha256,
    width: v.width,
    height: v.height,
    state: v.state,
    parent_id: v.parent_id,
    created_at: v.created_at,
    critique: v.critique,
    image_url: v.image_url,
  };
}

function list(url: URL, forceState?: CandidateState) {
  const q = url.searchParams;
  const state = forceState ?? (q.get("state") as CandidateState | null) ?? "pending";
  const limit = Number(q.get("limit") ?? 50);
  const before = q.get("before");
  const items = visualsFixture
    .all()
    .filter((v) => v.state === state)
    .filter((v) => !q.get("source_id") || v.source_id === q.get("source_id"))
    .filter((v) => !q.get("subject") || v.subject === q.get("subject"))
    .filter((v) => !q.get("grade") || v.grade === Number(q.get("grade")))
    .filter((v) => !before || v.created_at < before)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
  return HttpResponse.json(items.map(summary));
}

const conflict = (message: string) =>
  HttpResponse.json({ error_code: "VIS_409", message, request_id: "req-synthetic" }, { status: 409 });

function startRegeneration(v: VisualDetail) {
  v.regeneration = {
    id: `regen-${v.id}`,
    state: "queued",
    attempts: (v.regeneration?.attempts ?? 0) + 1,
    result_candidate_id: null,
    error: null,
    created_at: new Date().toISOString(),
    finished_at: null,
  };
  return v.regeneration.id;
}

/** queued → claimed → done/failed, one step per detail read. */
function advanceRegeneration(v: VisualDetail) {
  const r = v.regeneration;
  if (!r) return;
  if (r.state === "queued") r.state = "claimed";
  else if (r.state === "claimed") {
    r.finished_at = new Date().toISOString();
    if (regenOutcome === "failed") {
      r.state = "failed";
      r.error = "SYNTHETIC: the drawing could not be rendered.";
    } else {
      const next = makeVisual({ parent_id: v.id, concept: { ...v.concept, feedback: null } });
      store.set(next.id, next);
      r.state = "done";
      r.result_candidate_id = next.id;
    }
  }
}

export const visualsHandlers = [
  http.get(`${VISUALS}/candidates`, ({ request }) => list(new URL(request.url))),
  http.get(`${VISUALS}/library`, ({ request }) => list(new URL(request.url), "accepted")),

  http.get(`${VISUALS}/candidates/:id`, ({ params }) => {
    const v = store.get(String(params.id));
    if (!v) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    const snapshot = structuredClone(v);
    advanceRegeneration(v);
    return HttpResponse.json(snapshot);
  }),

  http.post(`${VISUALS}/candidates/:id/decision`, async ({ params, request }) => {
    const v = store.get(String(params.id));
    if (!v) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    const body = (await request.json()) as VisualDecisionIn;
    if (v.state !== "pending") return conflict("This visual was already decided.");
    if (body.content_hash !== v.content_hash) return conflict("This visual changed since you opened it.");
    if (body.decision === "reject" && !body.reason_codes?.length) {
      return HttpResponse.json({ message: "Pick at least one reason." }, { status: 422 });
    }
    v.state = body.decision === "accept" ? "accepted" : "rejected";
    v.decision = {
      decision: body.decision,
      reason_codes: (body.reason_codes ?? []) as ReasonCode[],
      note: body.note ?? null,
      actor_role: "PARTNER",
      decided_at: new Date().toISOString(),
    };
    const regeneration_id = body.decision === "reject" && body.regenerate ? startRegeneration(v) : null;
    return HttpResponse.json({ id: v.id, state: v.state, regeneration_id });
  }),

  http.post(`${VISUALS}/candidates/:id/regenerate`, async ({ params, request }) => {
    const v = store.get(String(params.id));
    if (!v) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    const body = (await request.json()) as VisualRegenerateIn;
    if (v.state !== "rejected") return conflict("Only a rejected visual can be made again.");
    if (v.regeneration && v.regeneration.state !== "failed") return conflict("A new version is already on its way.");
    if (!body.reason_codes?.length) return HttpResponse.json({ message: "Pick at least one reason." }, { status: 422 });
    return HttpResponse.json({ regeneration_id: startRegeneration(v), state: "queued" }, { status: 202 });
  }),
];
