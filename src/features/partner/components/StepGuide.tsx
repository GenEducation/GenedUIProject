"use client";

import { CheckCircle2, ListChecks } from "lucide-react";
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
        : "Accept the questions you want this step to use.";
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

/** The list at the top of the review: every step that blocks publication, with its reason and the buttons that fix it. */
export function StepGuide({
  steps,
  generating = new Set<string>(),
  accepted,
  busy,
  onOpen,
  onKeep,
  onWrite,
  onAsk,
}: {
  steps: StepActions[];
  /** Steps GenEd is writing questions for right now (``*``: the whole chapter). */
  generating?: Set<string>;
  accepted: number;
  busy: string | null;
  onOpen: (sectionKey: string) => void;
  onKeep: (conceptKey: string) => void;
  onWrite: (target: WriteTarget) => void;
  onAsk: (sectionKey: string) => void;
}) {
  if (steps.length === 0) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-2 text-sm text-emerald-900"
      >
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Every lesson step is covered.{" "}
          {accepted > 0
            ? "Approve the accepted questions below; the chapter then runs once with them."
            : ""}
        </span>
      </div>
    );
  }
  return (
    <section
      aria-label="What to do to publish this chapter"
      className="rounded-2xl border border-[#075E63]/20 bg-white p-4 flex flex-col gap-3"
    >
      <p className="flex items-center gap-2 text-sm font-black text-[#122D30]">
        <ListChecks size={16} className="text-[#075E63]" aria-hidden />
        To publish this chapter, {plural(steps.length, "lesson step")}{" "}
        {steps.length === 1 ? "needs" : "need"} you
      </p>
      <ol className="flex flex-col gap-3">
        {steps.map((step) => (
          <li
            key={step.section_key}
            className="rounded-xl border border-[#122D30]/8 p-3 flex flex-col gap-2"
          >
            <p className="text-xs font-black text-[#122D30]">{step.title}</p>
            {(generating.has(step.section_key) || generating.has("*")) && (
              <p role="status" className="text-xs font-bold text-violet-700">
                GenEd is writing questions for this step. They appear here for
                your decision when ready; you can write your own meanwhile.
              </p>
            )}
            {step.actions.map((a, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <p className="text-xs text-[#122D30]/75">{describe(a)}</p>
                <div className="flex flex-wrap gap-2">
                  {a.kind === "decide_proposals" && (
                    <Button size="sm" onClick={() => onOpen(step.section_key)}>
                      Review this step
                    </Button>
                  )}
                  {a.kind === "keep_concept" && a.concept_key && (
                    <Button
                      size="sm"
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
                  {(a.kind === "add_activity" ||
                    a.kind === "add_question" ||
                    a.kind === "more_questions") && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy === `more:${step.section_key}`}
                      disabled={generating.has(step.section_key)}
                      onClick={() => onAsk(step.section_key)}
                    >
                      Ask GenEd to propose
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
