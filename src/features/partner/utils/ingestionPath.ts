import {
  INGESTION_STAGES,
  type IngestionCount,
  type IngestionStage,
  type NextStep,
  type SourceProgress,
  type SourceReleaseRef,
  type SourceState,
} from "../types/sources";

/** Who does a stage's work: the AI model (its output is a proposal you review) or fixed rules in GenEd's code. */
export type StageKind = "ai" | "automatic";

/** What each stage does, who does it, and which counts it produces. Mirrors `gened_ingestion.pipeline.run`. */
export const STAGE_DETAILS: Record<IngestionStage, { kind: StageKind; does: string; counts: IngestionCount[] }> = {
  render: { kind: "automatic", does: "Turns each page of your PDF into an image.", counts: ["pages"] },
  read_pages: {
    kind: "ai",
    does: "Reads the text, headings, exercises and figures on every page.",
    counts: ["unreadable_pages"],
  },
  components: { kind: "ai", does: "Proposes the key concepts the chapter teaches.", counts: ["components"] },
  reconcile: {
    kind: "automatic",
    does: "Matches each concept against concepts GenEd already has, so nothing is duplicated.",
    counts: ["components_new", "components_matched"],
  },
  questions: {
    kind: "ai",
    does: "Extracts the chapter's questions and answers; a second, independent check verifies every answer key.",
    counts: ["questions", "questions_computed", "question_variants", "questions_skipped", "questions_removed", "misconceptions"],
  },
  figures: { kind: "ai", does: "Finds the textbook's figures and what each one is for.", counts: ["figure_groups"] },
  lesson: {
    kind: "automatic",
    does: "Builds the lesson plan and checks the whole chapter against GenEd's publishing rules.",
    counts: ["lesson_nodes", "plan_steps", "questions_held", "violations", "warnings"],
  },
  visuals: { kind: "ai", does: "Draws GenEd's own teaching visuals for the lesson.", counts: [] },
  submit: { kind: "automatic", does: "Saves the result and sends it to you for review.", counts: [] },
};

export const COUNT_LABELS: Record<IngestionCount, string> = {
  pages: "pages",
  unreadable_pages: "unreadable",
  model_calls: "AI requests",
  sections: "sections",
  components: "concepts proposed",
  components_new: "new concepts",
  components_matched: "matched existing concepts",
  questions: "questions",
  questions_computed: "answer keys computed",
  question_variants: "number variants",
  questions_skipped: "questions skipped",
  questions_removed: "removed by the answer check",
  questions_held: "waiting on a redrawn picture",
  misconceptions: "common mistakes",
  figure_groups: "figures found",
  lesson_nodes: "lesson steps",
  plan_steps: "steps in the plan",
  violations: "problems blocking publishing",
  warnings: "warnings",
};

/** Counts that mean something needs the partner's attention when above zero. */
export const ATTENTION_COUNTS: ReadonlySet<IngestionCount> = new Set([
  "unreadable_pages",
  "questions_held",
  "violations",
]);

export type StepStatus = "done" | "current" | "stopped" | "pending" | "not_reached" | "skipped";

export interface PathStep {
  stage: IngestionStage;
  label: string;
  kind: StageKind;
  does: string;
  status: StepStatus;
  startedAt: string | null;
  counts: { name: IngestionCount; value: number }[];
  /** "12 of 36 pages" while the stage is counting its units. */
  unitLine: string | null;
}

const ORDER = Object.keys(INGESTION_STAGES) as IngestionStage[];

/**
 * Every stage of the run as a step: finished, running, where a run stopped, or still to come. Before a run
 * reports, every stage is pending. A run without visuals (8 steps) leaves `visuals` out.
 */
export function pathSteps(state: SourceState, progress: SourceProgress | null): PathStep[] {
  const stages = progress && progress.steps < ORDER.length ? ORDER.filter((s) => s !== "visuals") : ORDER;
  const at = progress ? stages.indexOf(progress.stage) : -1;
  const finished = state === "ready" || state === "invalid";
  return stages.map((stage, i) => {
    let status: StepStatus = "pending";
    if (progress && at >= 0) {
      if (i < at || (i === at && finished)) status = "done";
      else if (i === at) status = state === "running" ? "current" : "stopped";
      else if (state !== "running" && state !== "queued") status = finished ? "done" : "not_reached";
    }
    // A run that cannot pass draws no visuals (the costliest step); it never reports the stage.
    if (stage === "visuals" && state === "invalid" && !progress?.stage_started_at?.visuals) status = "skipped";
    const detail = STAGE_DETAILS[stage];
    const counts = detail.counts
      .map((name) => ({ name, value: progress?.counts?.[name] }))
      .filter((c): c is { name: IngestionCount; value: number } => typeof c.value === "number");
    const counting = status === "current" && progress && progress.stage === stage && progress.total > 0;
    const unit = INGESTION_STAGES[stage].unit;
    return {
      stage,
      label: INGESTION_STAGES[stage].label,
      kind: detail.kind,
      does: detail.does,
      status,
      startedAt: progress?.stage_started_at?.[stage] ?? null,
      counts,
      unitLine: counting ? `${Math.min(progress.done, progress.total)} of ${progress.total}${unit ? ` ${unit}` : ""}` : null,
    };
  });
}

export type Milestone = { key: string; label: string; at: string | null; status: "done" | "current" | "pending" | "problem"; note?: string };

/**
 * The milestones around the run: uploaded, queued, picked up, staged for review, published. The stages in
 * between come from `pathSteps`.
 */
export function milestones(input: {
  state: SourceState;
  created_at: string;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  release: SourceReleaseRef | null;
}): { before: Milestone[]; after: Milestone[] } {
  const { state, release } = input;
  const ran = input.started_at !== null && state !== "queued" && state !== "registered";
  const before: Milestone[] = [
    { key: "uploaded", label: "PDF uploaded and checked", at: input.created_at, status: "done" },
    {
      key: "queued",
      label: "Waiting in line",
      at: input.queued_at,
      status: state === "queued" ? "current" : input.queued_at || ran ? "done" : "pending",
    },
    {
      key: "started",
      label: "Picked up for processing",
      at: ran ? input.started_at : null,
      status: ran ? "done" : "pending",
    },
  ];
  const reviewNote: Record<SourceReleaseRef["state"], string> = {
    staging: "Being saved for review",
    ready: "Waiting for your review — nothing reaches students until you publish",
    blocked: "Did not pass the server's checks; see the report",
    published: "Published",
    abandoned: "Replaced by a later run",
  };
  const after: Milestone[] = [
    {
      key: "review",
      label: "Sent for your review",
      at: release?.staged_at ?? null,
      status: !release ? "pending" : release.state === "blocked" ? "problem" : release.state === "published" ? "done" : "current",
      note: release ? reviewNote[release.state] : state === "review_needed" ? "Waiting on your answers before it can continue" : undefined,
    },
    {
      key: "published",
      label: "Live for students",
      at: release?.published_at ?? null,
      status: release?.state === "published" ? "done" : "pending",
    },
  ];
  return { before, after };
}

/** "13 Oct, 09:04" in the viewer's locale. */
export function shortTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "4 min" / "1 h 12 min" between two instants; null when either is missing. */
export function elapsed(fromIso: string | null, toIso: string | null): string | null {
  if (!fromIso || !toIso) return null;
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.round(ms / 60_000);
  if (min < 1) return "under a minute";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** What each next step says to the partner. `tone` colours it; `upload` steps open the upload form prefilled. */
export const NEXT_STEP_COPY: Record<NextStep, { title: string; body: string; tone: "info" | "action" | "problem" | "done" }> = {
  start: { title: "Ready to process", body: "Start the run when you are ready.", tone: "action" },
  wait: { title: "Processing", body: "Nothing to do yet; this updates on its own.", tone: "info" },
  answer_questions: {
    title: "Tell us which concepts are the same",
    body: "Some concepts look alike. Answer the questions, then run the chapter again.",
    tone: "action",
  },
  review_release: {
    title: "Ready for your review",
    body: "Review and publish it. Nothing reaches students until you publish.",
    tone: "action",
  },
  none: { title: "Live for students", body: "This chapter is published.", tone: "done" },
  review_visuals: {
    title: "Accept the redrawn pictures, then run again",
    body: "Some questions need their picture. Once you accept the redraws, the next run can include them.",
    tone: "action",
  },
  redraw_pictures: {
    title: "Run again to redraw a picture",
    body: "Some questions are about a picture, and GenEd's redraw of it didn't pass its own checks, so there is nothing for you to accept yet. Run the chapter again to draw it again.",
    tone: "action",
  },
  add_questions: {
    title: "Add questions to finish this chapter",
    body: "This run didn't pass: GenEd found too few questions it can check, and a chapter can't be published without them. Give the answers of printed questions, write your own, or let AI suggest some. Every question is reviewed before students see it.",
    tone: "action",
  },
  upload_pages_with_questions: {
    title: "Upload pages that include the exercises",
    body: "These pages have no questions GenEd can check, and a chapter needs them to be taught. Running the same upload again would end the same way.",
    tone: "problem",
  },
  upload_clearer_pdf: {
    title: "Upload a clearer scan",
    body: "Some pages could not be read, so they are missing from this run. Running the same upload again would end the same way.",
    tone: "problem",
  },
  upload_again: {
    title: "Upload the chapter again",
    body: "The pages or learning outcomes do not fit this chapter. Upload the whole chapter, or choose fewer learning outcomes.",
    tone: "problem",
  },
  contact_gened: {
    title: "GenEd needs to look at this",
    body: "This is not something your upload can fix. GenEd has the report; you can run it again after a fix.",
    tone: "info",
  },
  run_again: { title: "Something went wrong", body: "The run stopped before it finished. Run it again.", tone: "problem" },
};

/** Plain words for the checks a partner can act on; any other check reads as a generic failed check. */
export const CHECK_LABELS: Record<string, string> = {
  single_component_share: "Too few questions GenEd can check",
  unassessed_component: "A concept has no question to check it",
  plan_lo_uncovered: "A chosen learning outcome is not covered",
  lo_coverage_scope: "The learning outcomes do not fit these pages",
  page_range: "The page range does not fit the PDF",
  manifest_chapter_coverage: "The pages do not cover the chapter",
};

export function checkLabel(check: string): string {
  return CHECK_LABELS[check] ?? "A GenEd check did not pass";
}

export const UPLOAD_STEPS: ReadonlySet<NextStep> = new Set(["upload_pages_with_questions", "upload_clearer_pdf", "upload_again"]);

/** Why a printed question was removed, in plain words. */
export function removedReason(reason: string): string {
  if (reason === "answer_check_disagreed") return "GenEd's answer check couldn't confirm the answer (often a picture question)";
  if (reason === "not_machine_scorable" || reason === "needs_a_concept") return "An open question: give the exact answers to accept";
  return "GenEd couldn't mark it automatically";
}
