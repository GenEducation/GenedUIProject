"use client";

import { Button } from "@/components/ui/Button";
import type {
  AddedQuestion,
  BankQuestionContent,
  StepAction,
  StepActions,
} from "../types/sources";

/** What the partner writes for one objective: a question, or an activity for a writing, speaking, reading or listening one. */
export interface WriteTarget {
  sectionKey: string;
  conceptKey: string;
  /** The objective's key; absent for a kept concept GenEd's plan has no objectives for. */
  obligationKey?: string;
  statement: string;
  activity: boolean;
}

/** A blank question or activity for the objective, for the question form. */
export function blankFor(target: WriteTarget): AddedQuestion {
  return {
    id: crypto.randomUUID(),
    section_key: target.sectionKey,
    concept_key: target.conceptKey,
    prompt: "",
    answer_kind: target.activity ? "activity" : "mcq",
    ...(target.activity ? { activity_mode: "write" as const } : {}),
    origin: "partner",
  };
}

const STRONG_KINDS = new Set([
  "matching",
  "sequence",
  "grouping",
  "blanks",
  "multi_select",
]);

/** The bank entry for the partner's own question or activity: it covers exactly the objective it was written for. */
export function partnerQuestion(
  body: AddedQuestion,
  target: WriteTarget,
): BankQuestionContent {
  const activity = body.answer_kind === "activity";
  return {
    body: { ...body, origin: "partner" },
    meta: {
      obligation_keys: [target.obligationKey ?? "concept"],
      evidence_kind: activity
        ? body.activity_mode === "write"
          ? "produce_written"
          : "produce_spoken"
        : "recognise",
      strength:
        !activity && STRONG_KINDS.has(body.answer_kind) ? "strong" : "weak",
      strength_reason: "Written by the partner for this objective.",
      family_key: `partner-${body.id}`.slice(0, 64),
      difficulty: "medium",
      provenance: "original_curriculum_aligned",
      source_basis: target.statement.slice(0, 2000),
      verification: "unverified",
    },
  } as BankQuestionContent;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** The action in plain words: what is wrong with the step, then what to do. */
export function describe(action: StepAction): string {
  switch (action.kind) {
    case "decide_proposals":
      return action.count
        ? `${plural(action.count, "proposal")} ${action.count === 1 ? "is" : "are"} waiting for your decision${action.activities ? ` (${plural(action.activities, "activity", "activities")})` : ""}. Accept, edit or reject ${action.count === 1 ? "it" : "each one"}.`
        : "GenEd has no assessment plan for this step, so accepted questions can't count towards it yet. There is nothing to accept: GenEd has to plan the chapter's questions again.";
    case "keep_concept":
      return `GenEd put “${action.concept}” on hold: ${action.detail ?? ""} If it belongs in this lesson, keep it, then give it questions.`;
    case "add_activity":
      return `“${action.concept}” asks learners to write, speak, read aloud or listen (${action.detail}), and has no activity yet. Write one, or ask GenEd to propose one.`;
    case "add_question":
      return action.obligation_key
        ? `“${action.concept}” needs ${action.needed ? plural(action.needed, "more question") : "more questions"} to check “${action.detail}” (three different questions, or two if one is a matching, ordering, grouping, fill-in or pick-several question). Write one, or ask GenEd for more.`
        : `You kept “${action.concept}”, and it has no questions yet. Write one; it counts once you accept it.`;
    case "more_questions":
      return `This step needs ${plural(action.count ?? 1, "more checked question")}. Accept or write ${action.count === 1 ? "one" : "some"}, or ask GenEd for more.`;
  }
}

/**
 * A step that is blocked only because GenEd has no plan for it: the backend's bare ``decide_proposals`` with nothing to decide
 * (ADR 0049's fallback when no objective exists to cover). Nothing the partner accepts unblocks it.
 */
export function waitsOnPlan(step: StepActions | undefined): boolean {
  return (
    step?.actions.length === 1 &&
    step.actions[0].kind === "decide_proposals" &&
    !step.actions[0].count
  );
}

/** A short label for a blocked step's main need, for the step list ("3 to decide", "Needs an activity"). */
export function needLabel(step: StepActions | undefined): string | null {
  const a = step?.actions[0];
  if (!a) return null;
  switch (a.kind) {
    case "decide_proposals":
      return a.count ? `${a.count} to decide` : "Waiting on GenEd's plan";
    case "keep_concept":
      return "Concept on hold";
    case "add_activity":
      return "Needs an activity";
    case "add_question":
      return a.needed
        ? `Needs ${plural(a.needed, "question")}`
        : "Needs questions";
    case "more_questions":
      return `Needs ${a.count ?? 1} more`;
  }
}

/**
 * What one blocked step needs: one line per need, with its own button beside it (keep the concept, write a question or an
 * activity). Asking GenEd refills the whole step, so it is offered once, under the list. Proposals to decide are on the step
 * itself, so they get no button here.
 */
export function StepTodo({
  step,
  generating = new Set<string>(),
  busy,
  onKeep,
  onWrite,
  onAsk,
}: {
  step: StepActions;
  /** Steps GenEd is writing questions for right now (``*``: the whole chapter). */
  generating?: Set<string>;
  busy: string | null;
  onKeep: (conceptKey: string) => void;
  onWrite: (target: WriteTarget) => void;
  onAsk: (sectionKey: string) => void;
}) {
  const writingHere = generating.has(step.section_key) || generating.has("*");
  const canAsk = step.actions.some(
    (a) =>
      a.kind === "add_activity" ||
      a.kind === "add_question" ||
      a.kind === "more_questions",
  );
  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label="What this step needs"
        className="flex flex-col divide-y divide-amber-200/70"
      >
        {writingHere && (
          <li role="status" className="pb-2 text-xs font-bold text-violet-700">
            GenEd is writing questions for this step. They appear here for your
            decision when ready; you can write your own meanwhile.
          </li>
        )}
        {step.actions.map((a, i) => (
          <li
            key={i}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 first:pt-0 last:pb-0"
          >
            <p className="min-w-[220px] flex-1 text-xs leading-relaxed text-[#122D30]/80">
              {describe(a)}
            </p>
            {a.kind === "keep_concept" && a.concept_key && (
              <Button
                size="sm"
                variant="outline"
                loading={busy === `keep:${a.concept_key}`}
                onClick={() => onKeep(a.concept_key!)}
              >
                Keep this concept
              </Button>
            )}
            {(a.kind === "add_activity" || a.kind === "add_question") &&
              a.concept_key && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onWrite({
                      sectionKey: step.section_key,
                      conceptKey: a.concept_key!,
                      obligationKey: a.obligation_key,
                      statement: a.detail ?? "",
                      activity: a.kind === "add_activity",
                    })
                  }
                >
                  {a.kind === "add_activity"
                    ? "Write an activity"
                    : "Write a question"}
                </Button>
              )}
          </li>
        ))}
      </ul>
      {canAsk && (
        <div className="flex flex-wrap items-center gap-2 border-t border-amber-200/70 pt-3">
          <Button
            size="sm"
            loading={busy === `more:${step.section_key}`}
            disabled={generating.has(step.section_key)}
            onClick={() => onAsk(step.section_key)}
          >
            Ask GenEd to propose
          </Button>
          <span className="text-[11px] text-[#122D30]/55">
            GenEd writes what this step still needs; you decide on each one.
          </span>
        </div>
      )}
    </div>
  );
}
