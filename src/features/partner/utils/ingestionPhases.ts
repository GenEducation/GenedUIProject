import { INGESTION_STAGES, type IngestionCount, type IngestionStage, type SourceProgress, type SourceState } from "../types/sources";
import { pathSteps, type PathStep } from "./ingestionPath";

/**
 * The run's nine stages as four phases a partner reads at a glance: Read the PDF, Understand what it teaches, Build
 * the lesson from it, Deliver it for review. The stages stay one click away (`pathSteps`); the phases are the summary.
 */
export type PhaseKey = "read" | "understand" | "build" | "deliver";

export const PHASES: { key: PhaseKey; label: string; stages: IngestionStage[]; does: string }[] = [
  { key: "read", label: "Read", stages: ["render", "read_pages"], does: "Every page of your PDF, read by AI." },
  { key: "understand", label: "Understand", stages: ["components", "reconcile"], does: "The concepts the chapter teaches, checked against GenEd's." },
  { key: "build", label: "Build", stages: ["questions", "figures", "lesson", "visuals"], does: "Practice questions, figures, the lesson plan and teaching visuals." },
  { key: "deliver", label: "Deliver", stages: ["submit"], does: "Saved and sent to you for review. Nothing reaches students until you publish." },
];

export type PhaseStatus = "done" | "current" | "stopped" | "pending" | "not_reached";

export interface Phase {
  key: PhaseKey;
  label: string;
  does: string;
  status: PhaseStatus;
  /** 0–1: how much of the phase is done (a counting stage counts its units). */
  fill: number;
  steps: PathStep[];
  /** The phase's step running now. */
  current: PathStep | null;
  /** What the phase produced, in one line: "36 pages · 1 unreadable". Null before it produced anything. */
  summary: string | null;
  /** The time from the phase's first stage starting to the next phase starting (or now / the run's end). */
  startedAt: string | null;
  endedAt: string | null;
}

const n = (counts: Partial<Record<IngestionCount, number>> | undefined, key: IngestionCount) => {
  const v = counts?.[key];
  return typeof v === "number" ? v : null;
};

const plural = (v: number, one: string, many = `${one}s`) => `${v} ${v === 1 ? one : many}`;

/** One line of what a phase produced, from the run's counts. */
export function phaseSummary(key: PhaseKey, counts: Partial<Record<IngestionCount, number>> | undefined, visualsSent = 0): string | null {
  const parts: string[] = [];
  if (key === "read") {
    const pages = n(counts, "pages");
    const unreadable = n(counts, "unreadable_pages");
    if (pages !== null) parts.push(plural(pages, "page"));
    if (unreadable) parts.push(`${unreadable} unreadable`);
  } else if (key === "understand") {
    const found = n(counts, "components");
    const fresh = n(counts, "components_new");
    const matched = n(counts, "components_matched");
    if (found !== null) parts.push(plural(found, "concept"));
    if (fresh !== null || matched !== null) parts.push(`${fresh ?? 0} new, ${matched ?? 0} already in GenEd`);
  } else if (key === "build") {
    const questions = n(counts, "questions");
    const figures = n(counts, "figure_groups");
    const steps = n(counts, "lesson_nodes");
    if (questions !== null) parts.push(plural(questions, "question"));
    if (figures !== null) parts.push(plural(figures, "figure"));
    if (steps !== null) parts.push(plural(steps, "lesson step"));
    if (visualsSent > 0) parts.push(plural(visualsSent, "teaching visual"));
  }
  return parts.length ? parts.join(" · ") : null;
}

/** The four phases of a run, from its state and progress. */
export function runPhases(state: SourceState, reported: SourceProgress | null, visualsSent = 0): Phase[] {
  // A queued run has not begun: what progress there is belongs to the previous run.
  const progress = state === "queued" ? null : reported;
  const steps = pathSteps(state, progress);
  const byStage = new Map(steps.map((s) => [s.stage, s]));
  const startOf = (stage: IngestionStage) => progress?.stage_started_at?.[stage] ?? null;
  return PHASES.map((phase, i) => {
    const own = phase.stages.map((st) => byStage.get(st)).filter((s): s is PathStep => !!s);
    const statuses = own.map((s) => s.status);
    let status: PhaseStatus = "pending";
    if (statuses.includes("current")) status = "current";
    else if (statuses.includes("stopped")) status = "stopped";
    else if (own.length && statuses.every((s) => s === "done" || s === "skipped")) status = "done";
    else if (statuses.some((s) => s === "done")) status = state === "running" ? "current" : "not_reached";
    else if (statuses.includes("not_reached")) status = "not_reached";

    let fill = status === "done" ? 1 : 0;
    if (status === "current" || status === "stopped") {
      const doneCount = own.filter((s) => s.status === "done" || s.status === "skipped").length;
      const at = own.find((s) => s.status === "current" || s.status === "stopped");
      const partial = at && progress && progress.stage === at.stage && progress.total > 0 ? Math.min(progress.done, progress.total) / progress.total : 0;
      fill = own.length ? (doneCount + partial) / own.length : 0;
    }

    const next = PHASES[i + 1];
    const startedAt = phase.stages.map(startOf).find(Boolean) ?? null;
    const nextStart = next ? next.stages.map(startOf).find(Boolean) ?? null : null;
    return {
      key: phase.key,
      label: phase.label,
      does: phase.does,
      status,
      fill,
      steps: own,
      current: own.find((s) => s.status === "current") ?? null,
      summary: status === "pending" ? null : phaseSummary(phase.key, progress?.counts, visualsSent),
      startedAt,
      endedAt: status === "done" ? nextStart : null,
    };
  });
}

/** What a queued or running chapter is doing, for its row (the bar under it names the phase): "Reading pages · 12 of
 * 36 pages", "Writing practice questions". */
export function nowLine(state: SourceState, progress: SourceProgress | null): string {
  if (state === "queued") return "Waiting in line to start";
  if (!progress) return "Starting up";
  const stage = INGESTION_STAGES[progress.stage];
  const label = stage?.label ?? "Working";
  if (!(progress.total > 0)) return label;
  return `${label} · ${Math.min(progress.done, progress.total)} of ${progress.total}${stage?.unit ? ` ${stage.unit}` : ""}`;
}

/** What a count that needs the partner's attention means, as a sentence. */
export function attentionLine(name: IngestionCount, value: number): string {
  if (name === "unreadable_pages") return value === 1 ? "1 page couldn't be read" : `${value} pages couldn't be read`;
  if (name === "questions_held") return `${plural(value, "question")} waiting on a redrawn picture`;
  if (name === "violations") return `${plural(value, "problem")} blocking publishing`;
  return `${value} ${name}`;
}

