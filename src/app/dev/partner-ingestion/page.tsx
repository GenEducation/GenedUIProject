"use client";

/**
 * Dev-only harness for the partner registry's ingestion progress. Mounts the real SubjectRegistry with
 * `GET /v1/sources` answered from fixtures (no auth, no backend): one chapter's run advances through the stages
 * in about a minute, one is queued, one has just started and not reported yet, one is ready. 404s in production.
 */
import { useEffect, useState } from "react";
import { SubjectRegistry } from "@/features/partner/components/SubjectRegistry";
import type { IngestionCount, IngestionStage, SourceView } from "@/features/partner/types/sources";

// Stage shares as the backend weighs them (gened_ingestion.progress.STAGES).
const STAGES: [IngestionStage, number, number][] = [
  ["render", 2, 0],
  ["read_pages", 34, 36],
  ["components", 7, 0],
  ["reconcile", 2, 0],
  ["questions", 11, 0],
  ["figures", 4, 0],
  ["lesson", 2, 0],
  ["visuals", 36, 12],
  ["submit", 2, 0],
];
const RUN_MS = 60_000;

// What each finished stage hands on (gened_ingestion.pipeline.run), as SYNTHETIC numbers.
const COUNTS_AFTER: Partial<Record<IngestionStage, Partial<Record<IngestionCount, number>>>> = {
  render: { pages: 36 },
  read_pages: { unreadable_pages: 1, model_calls: 36 },
  components: { components: 9, model_calls: 44 },
  reconcile: { components_new: 7, components_matched: 2 },
  questions: { questions: 41, questions_computed: 12, question_variants: 6, questions_skipped: 2, questions_removed: 1, misconceptions: 5, model_calls: 96 },
  figures: { figure_groups: 8, model_calls: 104 },
  lesson: { lesson_nodes: 22, plan_steps: 18, questions_held: 3, violations: 0, warnings: 2 },
};

/** Where a run that started `startedAt` would be now, shaped like the backend's report. */
function progressAt(startedAt: number) {
  const f = Math.min(0.995, (Date.now() - startedAt) / RUN_MS);
  let before = 0;
  for (let i = 0; i < STAGES.length; i++) {
    const [stage, share, total] = STAGES[i];
    if (f * 100 < before + share || i === STAGES.length - 1) {
      const within = Math.max(0, Math.min(1, (f * 100 - before) / share));
      const reached = STAGES.slice(0, i + 1);
      let at = 0;
      const stage_started_at = Object.fromEntries(reached.map(([name, s]) => {
        const when = new Date(startedAt + (at / 100) * RUN_MS).toISOString();
        at += s;
        return [name, when];
      }));
      const counts = Object.assign({}, ...reached.slice(0, -1).map(([name]) => COUNTS_AFTER[name] ?? {}));
      return {
        stage, step: i + 1, steps: STAGES.length,
        done: total ? Math.floor(within * total) : 0, total,
        percent: Math.round(f * 1000) / 10,
        updated_at: new Date().toISOString(),
        counts, stage_started_at,
      };
    }
    before += share;
  }
  return null;
}

function source(n: number, title: string, over: Partial<SourceView>): SourceView {
  const at = new Date(Date.UTC(2026, 9, 13, 9, n)).toISOString();
  return {
    source_id: `preview-${n}`, board: "CBSE", publisher: "ncert", subject: "Mathematics", grade: 6,
    book_title: "Ganita Prakash", edition_label: "2024", chapter: { ordinal: n, title, first_pdf_page: 1, last_pdf_page: 36 },
    pdf_file_name: "chapter.pdf", page_count: 36, strand: "number", lo_codes: [], state: "ready", detail: null,
    visuals: null, has_report: false, questions: 0, progress: null, queued_at: null, finished_at: null,
    created_at: at, updated_at: at, ...over,
  };
}

export default function PartnerIngestionHarness() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    const real = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const api = process.env.NEXT_PUBLIC_API_URL;
      if (!api || !url.startsWith(api)) return real(input, init);
      await new Promise((r) => setTimeout(r, 200));
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      if (new URL(url).pathname.endsWith("/v1/sources")) {
        const items = [
          source(4, "Fractions", { state: "running", progress: progressAt(startedAt), created_at: new Date(startedAt - 90_000).toISOString(), queued_at: new Date(startedAt - 30_000).toISOString(), started_at: new Date(startedAt).toISOString() }),
          source(5, "Playing with Constructions", { state: "running" }),
          source(6, "Symmetry", { state: "queued", queued_at: new Date().toISOString() }),
          source(3, "Number Play", {
            state: "ready", has_report: true, visuals: { submitted: 12 },
            created_at: "2026-10-13T07:58:00Z", queued_at: "2026-10-13T08:00:00Z", started_at: "2026-10-13T08:01:00Z", finished_at: "2026-10-13T08:39:00Z",
            progress: {
              stage: "submit", step: 9, steps: 9, done: 1, total: 1, percent: 100, updated_at: "2026-10-13T08:39:00Z",
              counts: Object.assign({}, ...Object.values(COUNTS_AFTER)),
              stage_started_at: { render: "2026-10-13T08:01:00Z", submit: "2026-10-13T08:38:00Z" },
            },
            release: { batch_id: "preview-batch", state: "ready", staged_at: "2026-10-13T08:39:30Z", published_at: null },
          }),
        ];
        return json({ items, total_count: items.length, limit: 20, offset: 0 });
      }
      return json(url.includes("strands") ? [] : { items: [], total_count: 0, limit: 20, offset: 0 });
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount the registry only once the fixtures answer
    setReady(true);
    return () => {
      window.fetch = real;
    };
  }, []);

  if (process.env.NODE_ENV === "production") return null;
  return <div className="min-h-screen bg-[#F6F7F2] p-4 md:p-8">{ready && <SubjectRegistry onUploadClick={() => {}} />}</div>;
}
