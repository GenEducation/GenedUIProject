"use client";

import { Check } from "lucide-react";
import { useLessonStore } from "../useLessonStore";
import type { NodeOutline } from "../types";

type StepState = "done" | "current" | "todo";

interface Step {
  key: string;
  label: string;
  state: StepState;
  /** A summary row ("3 earlier steps"), not one titled step. */
  quiet?: boolean;
}

/** A stable empty list: a fresh `[]` from a store selector would re-render forever. */
const NO_NODES: NodeOutline[] = [];

const TYPE_LABEL = { teach: "Learn", practice: "Practice", assess: "Check" } as const;

function Marker({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--ls-primary)] text-white shadow-[0_3px_8px_-3px_rgb(7_94_99/0.7)]">
        <Check size={15} strokeWidth={3.2} aria-hidden />
      </span>
    );
  }
  if (state === "current") {
    return (
      // A solid citron disc with a deep-ocean dot: the step you're on.
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--ls-accent)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--ls-primary)]" />
      </span>
    );
  }
  return <span className="block h-7 w-7 rounded-full border-2 border-[var(--ls-border-strong)] bg-white" />;
}

/**
 * The lesson's steps: done, the current one, and what's next. The backend
 * serves no full plan list (plans also grow remediation steps as the learner
 * goes), so this is assembled from what it does say: done/total counts, the
 * active node, up to three upcoming nodes, and the steps finished while this
 * screen was open. Counts fill in for titles it can't know.
 */
export function LessonProgressRail() {
  const instance = useLessonStore((s) => s.instance);
  const nextNodes = useLessonStore((s) => s.payload?.student_context.next_nodes ?? NO_NODES);
  const completedSteps = useLessonStore((s) => s.completedSteps);

  if (!instance) return <div className="h-40 animate-pulse rounded-xl bg-[var(--ls-soft)]" />;

  const finished = instance.state === "completed";
  const active = instance.active_node;
  const steps: Step[] = [];

  const earlier = Math.max(0, instance.nodes_done - completedSteps.length);
  if (earlier > 0) {
    steps.push({ key: "earlier", label: `${earlier} ${earlier === 1 ? "step" : "steps"} done`, state: "done", quiet: true });
  }
  for (const step of completedSteps) steps.push({ key: step.instanceNodeId, label: step.title, state: "done" });

  if (!finished && active) {
    steps.push({ key: active.instance_node_id, label: active.title, state: "current" });
    nextNodes.forEach((n, i) => steps.push({ key: `next-${n.node_id}-${i}`, label: n.title, state: "todo" }));
    // The backend names only up to three upcoming steps; the rest are a count until it serves the full plan.
    const more = Math.max(0, instance.nodes_total - instance.nodes_done - 1 - nextNodes.length);
    if (more > 0) steps.push({ key: "more", label: `${more} more ${more === 1 ? "step" : "steps"}`, state: "todo", quiet: true });
  }

  const pct = instance.nodes_total ? Math.round((instance.nodes_done / instance.nodes_total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Lesson steps" className="relative flex flex-col">
        {steps.map((step, i) => (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex items-start gap-3.5 pb-5 last:pb-0"
          >
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${step.state === "done" ? "bg-[var(--ls-primary)]" : "bg-[var(--ls-border-strong)]"}`}
              />
            )}
            <span className="relative z-[1] shrink-0">
              <Marker state={step.state} />
            </span>
            <span className="min-w-0 pt-1">
              <span
                className={`block text-[15px] leading-snug ${
                  step.state === "current"
                    ? "font-bold text-[var(--ls-primary)]"
                    : step.quiet
                      ? "italic text-[var(--ls-ink-mid)]"
                      : step.state === "done"
                        ? "text-[var(--ls-ink)]"
                        : "text-[var(--ls-ink-mid)]"
                }`}
              >
                {step.label}
              </span>
              {step.state === "current" && active && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ls-ink-mid)]">
                  {TYPE_LABEL[active.type]}
                </span>
              )}
            </span>
            <span className="sr-only">{step.state === "done" ? " (done)" : step.state === "current" ? " (current)" : ""}</span>
          </li>
        ))}
        {finished && (
          <li className="flex items-center gap-3 font-bold text-[var(--ls-primary)]">
            <Marker state="done" /> Lesson complete
          </li>
        )}
      </ol>

      <div>
        <div
          role="progressbar"
          aria-label="Steps completed"
          aria-valuemin={0}
          aria-valuemax={instance.nodes_total}
          aria-valuenow={instance.nodes_done}
          className="h-2 overflow-hidden rounded-full bg-[var(--ls-soft)]"
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--ls-primary),var(--ls-accent-deep))] transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 flex justify-between text-[12px] text-[var(--ls-ink-mid)]">
          <span>{finished ? "All steps done" : `${instance.nodes_done} of ${instance.nodes_total} steps done`}</span>
          <span className="tabular-nums">{pct}%</span>
        </p>
      </div>
    </div>
  );
}
