"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Info,
  ListChecks,
  Loader2,
  PenLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { ACTIVITY_MODE, KIND_LABEL, keyText } from "./QuestionFormats";
import { LearnerPreview } from "./LearnerPreview";
import {
  DeviceReadiness,
  DeviceRefusalNote,
  QuestionDeviceChips,
} from "./DeviceFit";
import { GenerationStatus, pendingSteps } from "./GenerationStatus";
import {
  StepTodo,
  blankFor,
  needLabel,
  waitsOnPlan,
  partnerQuestion,
  type WriteTarget,
} from "./StepGuide";
import type {
  AddedQuestion,
  BankNode,
  BankOpenSlot,
  BankPackage,
  DeviceLimits,
  BankQuestion,
  BankQuestionContent,
  BankRun,
  RejectionReason,
  StepActions,
} from "../types/sources";

/**
 * The chapter's AI-prepared assessment package (backend ADR 0047). Zoovi designs, writes and checks the questions on its own; the
 * partner reviews the finished draft step by step: accept, edit, reject with a reason, ask for another, accept in bulk, then approve.
 * Nothing counts until accepted, and nothing reaches students until the chapter's release is reviewed and published.
 */

/** How often to look again while Zoovi is still preparing questions. */
export const BANK_POLL_MS = 5000;
/** A queued run no worker has claimed after this long is called out: writing is likely switched off on the server. */
const STUCK_AFTER_MIN = 5;

const REASONS: { value: RejectionReason; label: string }[] = [
  { value: "incorrect", label: "The answer is wrong" },
  { value: "ambiguous", label: "More than one answer could be right" },
  { value: "off_objective", label: "Doesn't test this part of the chapter" },
  { value: "too_easy", label: "Too easy" },
  { value: "too_hard", label: "Too hard for this grade" },
  { value: "duplicate", label: "Repeats another question" },
  { value: "unclear_language", label: "Unclear wording" },
  { value: "inappropriate", label: "Not suitable for students" },
  { value: "other", label: "Something else" },
];

const PROVENANCE: Record<BankQuestionContent["meta"]["provenance"], string> = {
  textbook_printed: "From the textbook",
  textbook_adapted: "Based on the textbook",
  original_curriculum_aligned: "Original question",
  real_world_external: "Uses a real-world fact",
};

const DIFFICULTY = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

/** An activity's mode and, when given, what a good answer includes (ADR 0048): there is no fixed answer to show. */
function ActivityDetails({ body }: { body: BankQuestion["question"]["body"] }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-[#1D6315]/70">
      <p>
        <span className="font-bold text-[#1D6315]">The learner: </span>
        {ACTIVITY_MODE[body.activity_mode ?? "write"]}. A free answer: the tutor
        gives feedback, and the learner must try it to finish the step.
      </p>
      {body.passage && (
        <p className="whitespace-pre-line">
          <span className="font-bold text-[#1D6315]">
            {body.activity_mode === "listen"
              ? "Passage (only heard, never shown): "
              : "Passage to read aloud: "}
          </span>
          {body.passage}
        </p>
      )}
      {body.rubric && (
        <p className="whitespace-pre-line">
          <span className="font-bold text-[#1D6315]">A good answer: </span>
          {body.rubric}
        </p>
      )}
      {body.example_answer && (
        <p className="whitespace-pre-line">
          <span className="font-bold text-[#1D6315]">Example: </span>
          {body.example_answer}
        </p>
      )}
    </div>
  );
}

const doubted = (q: BankQuestion) =>
  q.verification === "needs_partner_check" || q.verification === "unverified";
const chip =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-black";

function QuestionCard({
  q,
  busy,
  onAccept,
  onReject,
  onEdit,
}: {
  q: BankQuestion;
  busy: boolean;
  onAccept: () => void;
  onReject: (reason: RejectionReason, note: string) => void;
  onEdit: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RejectionReason>("incorrect");
  const [note, setNote] = useState("");
  const { body, meta } = q.question;
  const activity = body.answer_kind === "activity";
  const blanks = body.answer_kind === "blanks";
  const accepted = q.state === "accepted";
  const distractors = meta.distractors ?? [];
  const hasDetails =
    !!body.explanation || distractors.length > 0 || !!meta.remediation;
  return (
    <article
      aria-label={body.prompt}
      className={`rounded-2xl border bg-white flex flex-col ${
        accepted
          ? "border-emerald-200"
          : doubted(q)
            ? "border-amber-200"
            : "border-[#1D6315]/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3.5">
        <span className={`${chip} bg-[#287624]/10 text-[#287624]`}>
          {KIND_LABEL[body.answer_kind]}
        </span>
        <span className={`${chip} bg-[#1D6315]/5 text-[#1D6315]/60`}>
          {DIFFICULTY[meta.difficulty]}
        </span>
        <span className={`${chip} bg-[#1D6315]/5 text-[#1D6315]/60`}>
          {PROVENANCE[meta.provenance]}
        </span>
        <QuestionDeviceChips q={q} />
        <span className="flex-1" />
        {accepted ? (
          <span className={`${chip} bg-emerald-600 text-white`}>
            <Check size={11} aria-hidden /> Accepted
          </span>
        ) : doubted(q) ? (
          <span className={`${chip} bg-amber-100 text-amber-900`}>
            <AlertTriangle size={11} aria-hidden /> Please check
          </span>
        ) : (
          <span className={`${chip} bg-emerald-50 text-emerald-700`}>
            <ShieldCheck size={11} aria-hidden /> Answer checked
          </span>
        )}
      </div>

      <div className="px-4 pt-2 pb-3 flex flex-col gap-2.5">
        {/* The prompt once. Usually it's the card's heading and the learner's view shows only what they answer with; a
            fill-in question's view is the sentence itself, so there the view alone says it. */}
        {(activity || !blanks) && (
          <p className="text-[15px] font-bold leading-snug text-[#1D6315] whitespace-pre-line">
            {body.prompt}
          </p>
        )}
        {activity ? (
          <ActivityDetails body={body} />
        ) : (
          <>
            {/* The lesson's own renderers, drawn smaller: a preview beside the review, not the lesson's full size. */}
            <div className="[zoom:0.8]">
              <LearnerPreview
                key={`${q.question_id}-${q.revision}`}
                question={body}
                showPrompt={false}
              />
            </div>
            <p className="rounded-xl bg-emerald-50/70 px-3 py-2 text-xs text-[#1D6315]/80">
              <span className="font-black text-emerald-800">Answer: </span>
              {keyText(body)}
            </p>
          </>
        )}
        {(meta.findings?.length ?? 0) > 0 && (
          <ul
            className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 list-disc pl-7"
            aria-label="Things to check"
          >
            {meta.findings!.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
        <DeviceRefusalNote q={q} />
        {!q.concept_in_chapter && (
          <p className="text-xs text-amber-800">
            The latest run of the chapter no longer has this question&rsquo;s
            concept.
          </p>
        )}
        {hasDetails && (
          <details className="group text-xs text-[#1D6315]/70">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-bold text-[#1D6315]/60 hover:text-[#1D6315] [&::-webkit-details-marker]:hidden">
              <ChevronRight
                size={13}
                className="transition-transform group-open:rotate-90"
                aria-hidden
              />
              Why it&rsquo;s right, wrong answers and feedback
            </summary>
            <div className="mt-2 flex flex-col gap-2 border-l-2 border-[#1D6315]/8 pl-3">
              {body.explanation && (
                <p>
                  <span className="font-bold text-[#1D6315]">Why: </span>
                  {body.explanation}
                </p>
              )}
              {distractors.length > 0 && (
                <div>
                  <p className="font-bold text-[#1D6315]">
                    Wrong answers and the mistake each shows
                  </p>
                  <ul className="list-disc pl-5 mt-1">
                    {distractors.map((d, i) => (
                      <li key={i}>
                        <span className="font-bold">{d.option}</span>:{" "}
                        {d.misconception}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {meta.remediation && (
                <p>
                  <span className="font-bold text-[#1D6315]">
                    If a student gets it wrong:{" "}
                  </span>
                  {meta.remediation}
                </p>
              )}
            </div>
          </details>
        )}
      </div>

      {rejecting ? (
        <div className="flex flex-col gap-3 border-t border-[#1D6315]/8 bg-[#F7F4EA] px-4 py-3.5 rounded-b-2xl">
          {/* The app's own select, in the review's teal: not the browser's native menu. */}
          <Select<RejectionReason>
            label="Why reject it?"
            size="sm"
            accentColor="#287624"
            value={reason}
            onChange={setReason}
            options={REASONS}
          />
          <label className="block text-[12.5px] font-semibold text-[var(--text-mid)]">
            Anything Zoovi should know for the replacement{" "}
            <span className="font-normal text-[#1D6315]/45">(optional)</span>
            <input
              className="mt-1.5 block w-full rounded-xl border border-[#1D6315]/12 bg-white px-3 py-2 text-xs font-normal text-[#1D6315] placeholder:text-[#1D6315]/35 focus:outline-none focus:border-[#287624] focus:ring-2 focus:ring-[#287624]/15"
              maxLength={500}
              placeholder="e.g. keep it about the second stanza"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={() => onReject(reason, note)}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => setRejecting(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        q.state !== "rejected" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#1D6315]/8 px-4 py-2.5">
            {!accepted && (
              <Button
                size="sm"
                leadingIcon={<Check size={14} />}
                loading={busy}
                onClick={onAccept}
              >
                Accept
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              leadingIcon={<PenLine size={14} />}
              onClick={onEdit}
            >
              Edit
            </Button>
            <span className="flex-1" />
            <Button
              size="sm"
              variant="tertiary"
              leadingIcon={<X size={14} />}
              onClick={() => setRejecting(true)}
            >
              Reject
            </Button>
          </div>
        )
      )}
    </article>
  );
}

/** An accepted question folded to one line: the step's open decisions stay in view. It opens to the full card. */
function AcceptedRow({
  q,
  children,
}: {
  q: BankQuestion;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (open)
    return (
      <div className="flex flex-col gap-1">
        {children}
        <Button
          size="sm"
          variant="tertiary"
          className="self-start"
          onClick={() => setOpen(false)}
        >
          Fold it away
        </Button>
      </div>
    );
  return (
    // eslint-disable-next-line no-restricted-syntax -- a folded row that opens its card, not an action.
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3.5 py-2.5 text-left hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287624]"
    >
      <CheckCircle2
        size={16}
        className="shrink-0 text-emerald-600"
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1D6315]">
        {q.question.body.prompt}
      </span>
      <span className="shrink-0 text-[11px] font-bold text-[#1D6315]/45">
        {KIND_LABEL[q.question.body.answer_kind]}
      </span>
      <ChevronRight
        size={14}
        className="shrink-0 text-[#1D6315]/35 group-hover:text-[#1D6315]/70"
        aria-hidden
      />
    </button>
  );
}

/** One step's place in the review, from the partner's point of view. */
type StepPhase =
  "ready" | "accepted" | "review" | "waiting" | "gap" | "incomplete";

function phaseOf(
  node: BankNode,
  live: BankQuestion[],
  preparing: boolean,
): StepPhase {
  if (node.publishable) return "ready";
  if (node.approved_ready)
    return node.status === "capability_gap" ? "gap" : "accepted";
  if (preparing && live.length === 0) return "waiting";
  if (node.status === "capability_gap") return "gap";
  return node.status === "ready_for_review" ? "review" : "incomplete";
}

const PHASE: Record<
  StepPhase,
  { label: string; pill: string; bar: string; badge: string }
> = {
  ready: {
    label: "Ready",
    pill: "bg-emerald-600 text-white",
    bar: "bg-emerald-500",
    badge: "bg-emerald-600 text-white",
  },
  accepted: {
    label: "Accepted",
    pill: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-300",
    badge: "bg-emerald-100 text-emerald-700",
  },
  review: {
    label: "To review",
    pill: "bg-amber-300 text-[#1D6315]",
    bar: "bg-amber-300",
    badge: "bg-amber-300 text-[#1D6315]",
  },
  waiting: {
    label: "Being written",
    pill: "bg-[#287624]/8 text-[#287624]",
    bar: "bg-[#287624]/25 animate-pulse",
    badge: "bg-[#287624]/10 text-[#287624]",
  },
  gap: {
    label: "Needs an activity",
    pill: "bg-[#1D6315]/6 text-amber-800",
    bar: "bg-[repeating-linear-gradient(135deg,#D97706_0_3px,#FCD34D_3px_6px)]",
    badge: "bg-amber-100 text-amber-800",
  },
  incomplete: {
    label: "Incomplete",
    pill: "bg-[#1D6315]/6 text-[#1D6315]/65",
    bar: "bg-[#1D6315]/15",
    badge: "bg-[#1D6315]/8 text-[#1D6315]/60",
  },
};

/** "Parent step.: Child" (how the backend names a sub-step) reads as a breadcrumb and a title. */
function splitTitle(title: string): { parent: string | null; name: string } {
  const m = /^(.*?[.?!]):\s+(.+)$/.exec(title);
  return m ? { parent: m[1], name: m[2] } : { parent: null, name: title };
}

/**
 * The common start of every step's title ("CHANGE OF HEART: "), said once above the list instead of on every step. Empty when
 * the titles don't share one.
 */
function sharedParent(titles: string[]): string {
  if (titles.length < 2) return "";
  const head = /^(.{2,80}?):\s+/.exec(titles[0])?.[1];
  return head && titles.every((t) => t.startsWith(`${head}: `)) ? head : "";
}

/** A step's own name, without the chapter title every step repeats or the parent step's breadcrumb. */
function stepName(
  title: string,
  parent: string,
): { crumb: string | null; name: string } {
  const own =
    parent && title.startsWith(`${parent}: `)
      ? title.slice(parent.length + 2)
      : title;
  const { parent: crumb, name } = splitTitle(own);
  return { crumb, name };
}

interface Step {
  node: BankNode;
  index: number;
  questions: BankQuestion[];
  phase: StepPhase;
  todo: StepActions | undefined;
}

/** The step's mark in the list: done, being written, or how much it still needs. */
function StepMark({
  step,
  queued,
  current,
}: {
  step: Step;
  queued: boolean;
  current: boolean;
}) {
  const { phase, index } = step;
  const done = phase === "ready" || phase === "accepted";
  return (
    <span
      aria-hidden
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black tabular-nums ${
        done
          ? "bg-emerald-600 text-white"
          : current
            ? "bg-[#287624] text-white"
            : phase === "waiting"
              ? "bg-[#287624]/10 text-[#287624]"
              : waitsOnPlan(step.todo)
                ? "bg-white text-[#1D6315]/50 ring-2 ring-inset ring-[#1D6315]/15"
                : "bg-white text-[#1D6315]/70 ring-2 ring-inset ring-amber-300"
      }`}
    >
      {done ? (
        <Check size={14} strokeWidth={3} />
      ) : phase === "waiting" ? (
        queued ? (
          <Clock size={13} />
        ) : (
          <Loader2 size={13} className="animate-spin" />
        )
      ) : (
        index + 1
      )}
    </span>
  );
}

/** What the step list says under a step's name. */
function stepNeed(step: Step, queued: boolean): string {
  if (step.phase === "ready" || step.phase === "accepted")
    return step.node.publishable ? "Ready" : PHASE[step.phase].label;
  if (step.phase === "waiting")
    return queued ? "Waiting to start" : "Being written";
  const drafts = step.questions.filter((q) => q.state === "draft").length;
  return (
    needLabel(step.todo) ??
    (drafts ? `${drafts} to decide` : PHASE[step.phase].label)
  );
}

function StepList({
  steps,
  parent,
  current,
  queued,
  onPick,
}: {
  steps: Step[];
  parent: string;
  current: string;
  queued: boolean;
  onPick: (key: string) => void;
}) {
  return (
    <nav aria-label="Lesson steps" className="min-w-0">
      {parent && (
        <p className="mb-2 hidden truncate px-1 text-[10.5px] font-black uppercase tracking-[0.14em] text-[#1D6315]/45 @[46rem]:block">
          {parent}
        </p>
      )}
      <ol className="flex gap-1.5 overflow-x-auto pb-1 @[46rem]:flex-col @[46rem]:gap-0.5 @[46rem]:overflow-visible @[46rem]:pb-0">
        {steps.map((st) => {
          const on = st.node.section_key === current;
          const { name } = stepName(st.node.title, parent);
          const done = st.phase === "ready" || st.phase === "accepted";
          return (
            <li key={st.node.section_key} className="shrink-0 @[46rem]:shrink">
              {/* eslint-disable-next-line no-restricted-syntax -- a step in the list, opening it beside. */}
              <button
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => onPick(st.node.section_key)}
                title={st.node.title}
                className={`flex w-full max-w-[240px] items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#287624] @[46rem]:max-w-none ${
                  on
                    ? "bg-white shadow-[0_1px_2px_rgba(29,99,21,0.08),0_0_0_1px_rgba(40,118,36,0.25)]"
                    : "hover:bg-white/70"
                }`}
              >
                <StepMark step={st} queued={queued} current={on} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13px] leading-tight ${on ? "font-black text-[#1D6315]" : "font-bold text-[#1D6315]/80"}`}
                  >
                    {name}
                  </span>
                  <span
                    className={`block truncate text-[11px] ${done ? "text-emerald-700" : st.phase === "waiting" ? "text-[#287624]/70" : waitsOnPlan(st.todo) ? "text-[#1D6315]/50" : "text-amber-800"}`}
                  >
                    {stepNeed(st, queued)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepWorkspace({
  step,
  total,
  parent,
  sourceId,
  queued,
  generating,
  busy,
  act,
  editing,
  onEdit,
  renderEditor,
  writer,
  onKeep,
  onWrite,
  onAsk,
  prev,
  next,
  onPick,
  limits,
}: {
  step: Step;
  total: number;
  parent: string;
  sourceId: string;
  /** The run that writes this step's questions hasn't started yet. */
  queued: boolean;
  generating: Set<string>;
  busy: string | null;
  act: (key: string, call: () => Promise<BankPackage>) => void;
  editing: string | null;
  onEdit: (q: BankQuestion) => void;
  renderEditor: (q: BankQuestion) => React.ReactNode;
  /** The partner's own question or activity being written for this step, if any. */
  writer: React.ReactNode;
  onKeep: (conceptKey: string) => void;
  onWrite: (target: WriteTarget) => void;
  onAsk: (sectionKey: string) => void;
  prev: Step | null;
  next: Step | null;
  onPick: (key: string) => void;
  /** The device limits the review sends, for the limits text. */
  limits?: DeviceLimits;
}) {
  const { node, questions, phase, todo, index } = step;
  const [asking, setAsking] = useState(false);
  const [hint, setHint] = useState("");
  // Questions still to decide when the step opened stay as cards here once decided, so a decision never moves what you look at.
  const [openedAsDraft] = useState(
    () =>
      new Set(
        questions.filter((q) => q.state === "draft").map((q) => q.question_id),
      ),
  );
  const waiting = phase === "waiting";
  const obligations = node.concepts
    .filter((c) => c.status === "planned" || c.status === "capability_gap")
    .flatMap((c) => c.obligations.map((o) => ({ ...o, concept: c.title })));
  const blocked = node.concepts.filter(
    (c) => c.status === "held" || c.status === "not_planned",
  );
  const openSlots = node.concepts.flatMap((c) =>
    c.open_slots.map((s) => ({ ...s, concept: c.title })),
  );
  const live = questions.filter((q) => q.state !== "rejected");
  const rejected = questions.length - live.length;
  const toDecide = live.filter(
    (q) => q.state === "draft" || openedAsDraft.has(q.question_id),
  );
  const acceptedBefore = live.filter(
    (q) => q.state === "accepted" && !openedAsDraft.has(q.question_id),
  );
  const accepted = live.filter((q) => q.state === "accepted").length;
  const ready = live.filter((q) => q.state === "draft" && !doubted(q));
  const floor = Math.max(node.review_floor, 1);
  const checked = Math.min(node.reviewable, floor);
  const covered = obligations.filter((o) => o.approved_covered).length;
  const { crumb, name } = stepName(node.title, parent);
  const look = PHASE[phase];
  const done = phase === "ready" || phase === "accepted";

  const card = (q: BankQuestion) =>
    editing === q.question_id ? (
      <div key={q.question_id}>{renderEditor(q)}</div>
    ) : (
      <QuestionCard
        key={q.question_id}
        q={q}
        busy={busy === q.question_id}
        onAccept={() =>
          act(q.question_id, () =>
            sourcesService.acceptQuestion(sourceId, q.question_id, q.version),
          )
        }
        onReject={(reason, note) =>
          act(q.question_id, () =>
            sourcesService.rejectQuestion(
              sourceId,
              q.question_id,
              q.version,
              reason,
              note,
            ),
          )
        }
        onEdit={() => onEdit(q)}
      />
    );

  return (
    <section
      id={`bank-step-row-${node.section_key}`}
      aria-label={node.title}
      className="min-w-0 scroll-mt-4 flex flex-col gap-4"
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#1D6315]/50">
          <span className="tabular-nums">
            Step {index + 1} of {total}
          </span>
          {crumb && <span className="truncate">· {crumb}</span>}
          <span className="flex-1" />
          {waitsOnPlan(todo) ? (
            <span className={`${chip} bg-[#1D6315]/6 text-[#1D6315]/60`}>
              Waiting on Zoovi
            </span>
          ) : (
            <span className={`${chip} ${look.pill}`}>
              {waiting && queued ? "Waiting to start" : look.label}
            </span>
          )}
        </div>
        <h3 className="text-xl font-black leading-tight text-[#1D6315]">
          {name}
        </h3>
        {!waiting && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#1D6315]/60">
            <span className="flex items-center gap-1.5">
              <span
                className="flex gap-0.5"
                role="img"
                aria-label={`${node.reviewable} of ${node.review_floor} checked, distinct questions`}
              >
                {Array.from({ length: floor }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-4 rounded-full ${i < checked ? "bg-[#287624]" : "bg-[#1D6315]/12"}`}
                  />
                ))}
              </span>
              <span className="tabular-nums">
                {node.reviewable}/{node.review_floor} checked
              </span>
            </span>
            <span className="tabular-nums">
              {live.length} question{live.length === 1 ? "" : "s"}
              {accepted > 0 && ` · ${accepted} accepted`}
              {rejected > 0 && ` · ${rejected} rejected`}
            </span>
          </p>
        )}
      </header>

      {/* What to do here: the one place a step says what it needs. */}
      {waitsOnPlan(todo) ? (
        // Blocked on GenEd's side, not the partner's: say so, and ask for nothing that can't help.
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[#1D6315]/10 bg-[#F7F4EA] p-3.5"
        >
          <Info
            size={16}
            className="mt-0.5 shrink-0 text-[#287624]"
            aria-hidden
          />
          <span className="text-xs leading-relaxed text-[#1D6315]/75">
            <span className="block text-sm font-black text-[#1D6315]">
              Nothing for you to do here
            </span>
            {accepted > 0
              ? `Your ${accepted} accepted question${accepted === 1 ? " is" : "s are"} kept. `
              : ""}
            Zoovi has no assessment plan for this step, so accepted questions
            can&rsquo;t count towards it yet and the step can&rsquo;t be
            approved. Zoovi has to plan the chapter&rsquo;s questions again; ask
            GenEd to check.
          </span>
        </div>
      ) : todo && todo.actions.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-amber-900">
            <ListChecks size={13} aria-hidden /> To finish this step
          </p>
          <StepTodo
            step={todo}
            generating={generating}
            busy={busy}
            onKeep={onKeep}
            onWrite={onWrite}
            onAsk={onAsk}
          />
        </div>
      ) : done ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800"
        >
          <CheckCircle2 size={15} aria-hidden /> This step is covered by
          accepted questions.
        </p>
      ) : null}

      {writer}

      {/* Whether a learner can finish each concept on the touch device, from the backend's pool counts. */}
      {!waiting && <DeviceReadiness concepts={node.concepts} limits={limits} />}

      {/* Only a step with objectives (or a held concept) has anything to list here. */}
      {(obligations.length > 0 || blocked.length > 0) && (
        <details
          open={!done}
          className="group rounded-2xl bg-[#F7F4EA] px-3.5 py-3"
        >
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#1D6315]/55 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              size={13}
              className="transition-transform group-open:rotate-90"
              aria-hidden
            />
            What learners must show
            {obligations.length > 0 && (
              <span className="ml-auto normal-case tracking-normal font-bold tabular-nums text-[#1D6315]/50">
                {covered} of {obligations.length} covered
              </span>
            )}
          </summary>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {obligations.map((o) => (
              <li
                key={`${o.concept}-${o.key}`}
                className="flex items-start gap-2 text-xs text-[#1D6315]/80"
              >
                {o.production && !o.approved_covered ? (
                  <AlertTriangle
                    size={13}
                    className="mt-0.5 text-amber-600 shrink-0"
                    aria-hidden
                  />
                ) : o.approved_covered ? (
                  <CheckCircle2
                    size={13}
                    className="mt-0.5 text-emerald-600 shrink-0"
                    aria-hidden
                  />
                ) : (
                  <Circle
                    size={13}
                    className="mt-0.5 text-[#1D6315]/25 shrink-0"
                    aria-hidden
                  />
                )}
                <span>
                  <span className="font-bold text-[#1D6315]">{o.concept}</span>
                  <span className="text-[#1D6315]/40"> — </span>
                  {o.statement}
                  <span className="block text-[11px] text-[#1D6315]/50">
                    {o.production
                      ? o.approved_covered
                        ? "Answered by an accepted activity."
                        : o.draft_covered
                          ? "Accept the activity below."
                          : "Needs an activity: Zoovi proposes one, or write your own."
                      : o.approved_covered
                        ? "Covered by accepted questions."
                        : o.draft_covered
                          ? "Accept enough of the questions below."
                          : waiting
                            ? "Questions are on the way."
                            : "Zoovi needs more questions here."}
                  </span>
                </span>
              </li>
            ))}
            {blocked.map((c) => (
              <li
                key={c.concept_key}
                className={`flex items-start gap-2 text-xs ${waiting ? "text-[#1D6315]/80" : "text-amber-900"}`}
              >
                {waiting ? (
                  <Clock
                    size={13}
                    className="mt-0.5 shrink-0 text-[#287624]/60"
                    aria-hidden
                  />
                ) : (
                  <AlertTriangle
                    size={13}
                    className="mt-0.5 shrink-0 text-amber-600"
                    aria-hidden
                  />
                )}
                <span>
                  <span className="font-bold">{c.title}</span>
                  <span className="block text-[11px] opacity-70">
                    {c.status === "held"
                      ? `On hold. ${c.why ?? ""}`
                      : waiting
                        ? "Not planned yet; Zoovi plans it while it writes."
                        : `Not planned. ${c.why ?? ""}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {openSlots.length > 0 && !waiting && (
            <details className="mt-2.5 text-xs text-[#1D6315]/70">
              <summary className="cursor-pointer font-bold text-[#1D6315]/70 hover:text-[#1D6315]">
                Why {openSlots.length} question{" "}
                {openSlots.length === 1 ? "slot is" : "slots are"} still open
              </summary>
              <ul className="mt-1.5 flex flex-col gap-1 pl-1">
                {openSlots.map((s) => (
                  <li key={s.slot}>
                    <span className="font-bold">{s.concept}:</span>{" "}
                    {SLOT_REASON[s.category]} {s.detail}
                    {s.last_reasons && s.last_reasons.length > 0 && (
                      <span className="text-[#1D6315]/50">
                        {" "}
                        ({s.last_reasons[0]})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </details>
      )}

      {waiting && (
        <div
          className="rounded-2xl border border-dashed border-[#287624]/25 p-4 flex flex-col gap-2"
          aria-hidden
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <span className="h-2.5 w-24 rounded-full bg-[#287624]/10" />
              <span className="h-3 w-4/5 rounded-full bg-[#1D6315]/8" />
              <span className="h-3 w-3/5 rounded-full bg-[#1D6315]/6" />
            </div>
          ))}
        </div>
      )}

      {toDecide.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-black text-[#1D6315]">
              To decide{" "}
              <span className="tabular-nums text-[#1D6315]/40">
                {live.filter((q) => q.state === "draft").length}
              </span>
            </h4>
            <span className="flex-1" />
            {ready.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<CheckCheck size={14} />}
                loading={busy === `all:${node.section_key}`}
                onClick={() =>
                  act(`all:${node.section_key}`, () =>
                    sourcesService.acceptQuestions(
                      sourceId,
                      ready.map((q) => ({
                        question_id: q.question_id,
                        version: q.version,
                      })),
                    ),
                  )
                }
              >
                Accept the {ready.length} checked question
                {ready.length === 1 ? "" : "s"}
              </Button>
            )}
          </div>
          {toDecide.map(card)}
        </div>
      )}

      {acceptedBefore.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-black text-[#1D6315]">
            Accepted{" "}
            <span className="tabular-nums text-[#1D6315]/40">
              {acceptedBefore.length}
            </span>
          </h4>
          {acceptedBefore.map((q) =>
            editing === q.question_id ? (
              card(q)
            ) : (
              <AcceptedRow key={q.question_id} q={q}>
                {card(q)}
              </AcceptedRow>
            ),
          )}
        </div>
      )}

      {!waiting && (
        <div className="flex flex-col gap-2">
          {!asking ? (
            <Button
              size="sm"
              variant="tertiary"
              className="self-start"
              leadingIcon={<Plus size={14} />}
              onClick={() => setAsking(true)}
            >
              Ask Zoovi for another question
            </Button>
          ) : (
            <form
              className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#1D6315]/10 bg-white p-3"
              onSubmit={(e) => {
                e.preventDefault();
                act(`more:${node.section_key}`, () =>
                  sourcesService.refillPart(
                    sourceId,
                    node.section_key,
                    hint.trim() ? [hint.trim()] : [],
                  ),
                );
                setHint("");
                setAsking(false);
              }}
            >
              <label className="flex-1 min-w-[200px] text-[11px] font-bold text-[#1D6315]/60">
                An idea for it (optional)
                <input
                  autoFocus
                  className="mt-1 block w-full rounded-lg border border-[#1D6315]/15 bg-white px-2.5 py-1.5 text-xs font-normal focus:outline-none focus:border-[#287624] focus:ring-2 focus:ring-[#287624]/15"
                  maxLength={300}
                  placeholder="e.g. a cricket example"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                />
              </label>
              <Button
                size="sm"
                type="submit"
                leadingIcon={<RefreshCw size={14} />}
                loading={busy === `more:${node.section_key}`}
              >
                Ask
              </Button>
              <Button
                size="sm"
                variant="tertiary"
                onClick={() => setAsking(false)}
              >
                Cancel
              </Button>
            </form>
          )}
        </div>
      )}

      {(prev || next) && (
        <div className="flex items-center gap-2 border-t border-[#1D6315]/8 pt-3">
          {prev && (
            <Button
              size="sm"
              variant="tertiary"
              leadingIcon={<ChevronLeft size={14} />}
              onClick={() => onPick(prev.node.section_key)}
            >
              Step {prev.index + 1}
            </Button>
          )}
          <span className="flex-1" />
          {next && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPick(next.node.section_key)}
            >
              Step {next.index + 1}: {stepName(next.node.title, parent).name}
              <ChevronRight size={14} aria-hidden />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** Accepted steps out of all, as a ring. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const share = total > 0 ? done / total : 0;
  return (
    <span
      className="relative grid place-items-center h-14 w-14 shrink-0"
      aria-hidden
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90">
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-[#1D6315]/8"
        />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
          className="text-emerald-500 transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="text-[13px] font-black text-[#1D6315] tabular-nums">
        {done}
        <span className="text-[#1D6315]/35">/{total}</span>
      </span>
    </span>
  );
}

/**
 * ``renderEditor`` shows the partner's question form for a question being edited (the authoring popup's own form); ``onSave`` there
 * should call the returned ``saveEdit``.
 */
const SLOT_REASON: Record<BankOpenSlot["category"], string> = {
  curriculum_issue: "The chapter reading needs fixing first.",
  unresolved_correctness:
    "A question exists but its answer isn't proved unique; check it yourself.",
  retries_exhausted: "Zoovi's attempts didn't pass its checks.",
  generation_defect:
    "Zoovi didn't produce a usable question; asking for another may fix it.",
};

export function AssessmentBankPanel({
  sourceId,
  onApproved,
  renderEditor,
}: {
  sourceId: string;
  /** The package was approved and the chapter queued to run with the accepted questions. */
  onApproved: () => void;
  renderEditor: (
    body: AddedQuestion,
    save: (body: AddedQuestion) => void,
    cancel: () => void,
  ) => React.ReactNode;
}) {
  const [pkg, setPkg] = useState<BankPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<BankQuestion | null>(null);
  /** The step the partner opened; until they pick one, the first that needs them. */
  const [picked, setPicked] = useState<string | null>(null);
  const [writing, setWriting] = useState<WriteTarget | null>(null);

  const load = useCallback(
    () =>
      sourcesService
        .bank(sourceId)
        .then(setPkg)
        .catch((e) =>
          setError(
            asError(e).message || "Couldn't load the prepared questions.",
          ),
        ),
    [sourceId],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const preparing =
    pkg?.runs.some((r) => r.state === "queued" || r.state === "running") ??
    false;
  // Queued and nobody has claimed it: say "waiting", not "being written", and say so plainly once it waits too long.
  const queuedOnly = preparing && !pkg!.runs.some((r) => r.state === "running");
  const queuedSince = queuedOnly
    ? Math.min(
        ...pkg!.runs
          .filter((r) => r.state === "queued")
          .map((r) => new Date(r.created_at).getTime())
          .filter(Number.isFinite),
      )
    : NaN;
  const [now, setNow] = useState(() => Date.now());
  const waitedMin = Number.isFinite(queuedSince)
    ? Math.max(0, Math.round((now - queuedSince) / 60_000))
    : 0;
  const stuck = queuedOnly && waitedMin >= STUCK_AFTER_MIN;
  // The newest run ended without questions: say so, or the steps just read as empty.
  const lastRun = pkg?.runs.reduce<BankRun | null>(
    (a, r) => (!a || r.created_at > a.created_at ? r : a),
    null,
  );
  const lastFailed =
    !preparing &&
    lastRun &&
    (lastRun.state === "failed" || lastRun.state === "stopped")
      ? lastRun
      : null;
  useEffect(() => {
    if (!preparing) return;
    const t = setInterval(() => {
      setNow(Date.now());
      void load();
    }, BANK_POLL_MS);
    return () => clearInterval(t);
  }, [preparing, load]);

  const steps = useMemo<Step[]>(
    () =>
      (pkg?.nodes ?? []).map((node, index) => {
        const questions = pkg!.questions.filter(
          (q) => q.section_key === node.section_key,
        );
        const live = questions.filter((q) => q.state !== "rejected");
        return {
          node,
          index,
          questions,
          phase: phaseOf(node, live, preparing),
          todo: pkg!.actions?.find((t) => t.section_key === node.section_key),
        };
      }),
    [pkg, preparing],
  );
  // Until the partner picks a step, the first one with questions to decide is open; failing that, the first that needs them.
  const firstToReview = (
    steps.find((st) => st.phase === "review") ??
    steps.find(
      (st) =>
        !st.node.publishable && st.questions.some((q) => q.state === "draft"),
    ) ??
    steps.find((st) => !st.node.publishable && st.phase !== "waiting") ??
    steps[0]
  )?.node.section_key;
  const currentKey =
    picked && steps.some((st) => st.node.section_key === picked)
      ? picked
      : firstToReview;
  const current =
    steps.find((st) => st.node.section_key === currentKey) ?? null;

  const act = (key: string, call: () => Promise<BankPackage>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    call()
      .then((next) => {
        setPkg(next);
        if (next.skipped?.length)
          setNotice(
            `${next.skipped.length} question${next.skipped.length === 1 ? "" : "s"} need your check first and were not accepted.`,
          );
        if (next.stale?.length)
          setNotice(
            "Some questions changed since you opened them. Check them again.",
          );
      })
      .catch((e) =>
        setError(asError(e).message || "That didn't work. Please try again."),
      )
      .finally(() => setBusy(null));
  };

  if (error && !pkg)
    return (
      <p
        role="alert"
        className="text-sm font-bold text-[#1D6315]/70 py-10 text-center"
      >
        {error}
      </p>
    );
  if (!pkg)
    return (
      <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#1D6315]/40 py-10">
        <Loader2 size={16} className="animate-spin" aria-hidden /> Loading the
        prepared questions…
      </p>
    );

  const s = pkg.summary;
  const counts: Record<StepPhase, number> = {
    ready: 0,
    accepted: 0,
    review: 0,
    waiting: 0,
    gap: 0,
    incomplete: 0,
  };
  for (const st of steps) counts[st.phase] += 1;
  const doneCount = counts.ready + counts.accepted;
  // What still stops the release: every step must be publishable (backend `bank_approval`'s coverage_ready).
  const blocked = steps.filter((st) => !st.node.publishable);
  // Steps only Zoovi can unblock: it has no plan for them (see ``waitsOnPlan``).
  const planless = blocked.filter((st) => waitsOnPlan(st.todo));
  // No step has a single objective and none is publishable: Zoovi's plan for the whole chapter is missing, so no decision here
  // can make a step approvable, though the questions can still be reviewed.
  const noPlan =
    steps.length > 0 &&
    !preparing &&
    steps.every(
      (st) =>
        !st.node.publishable &&
        st.node.concepts.every((c) => c.obligations.length === 0),
    );
  // The approval already feeds the chapter: don't ask for it again. A later change voids it (the server says so).
  const approvedNow =
    !!pkg.approval?.approved &&
    pkg.approval.coverage_ready &&
    blocked.length === 0;
  const approvalVoided = !pkg.approval?.approved && !!pkg.approval?.approved_at;
  const parent = sharedParent(steps.map((st) => st.node.title));
  const generating = pendingSteps(pkg.runs);
  const runsActive = pkg.runs.some(
    (r) => r.state === "queued" || r.state === "running",
  );

  const goTo = (key: string) => {
    setPicked(key);
    setWriting((w) => (w && w.sectionKey !== key ? null : w));
    requestAnimationFrame(() =>
      document
        .getElementById("bank-workspace")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  // The next step that still needs the partner, after the one open now (wrapping round), never the open one itself.
  const nextBlocked = (() => {
    const open = blocked.filter(
      (st) => st.phase !== "waiting" && !waitsOnPlan(st.todo) && st !== current,
    );
    if (!current) return open[0] ?? null;
    return open.find((st) => st.index > current.index) ?? open[0] ?? null;
  })();

  const writer =
    writing && current && writing.sectionKey === current.node.section_key ? (
      <div
        aria-label="Write your own"
        className="rounded-2xl border border-[#287624]/20 bg-white p-4 flex flex-col gap-2"
      >
        <p className="text-xs text-[#1D6315]/70">
          For &ldquo;{writing.statement}&rdquo;. It counts for this step as soon
          as you save it.
        </p>
        {renderEditor(
          blankFor(writing),
          (body) => {
            const target = writing;
            setWriting(null);
            act("write", async () => {
              const created = await sourcesService.createQuestion(
                sourceId,
                partnerQuestion(body, target),
              );
              const mine = created.questions.find(
                (q) =>
                  q.state === "draft" &&
                  (q.question_id === body.id || q.question.body.id === body.id),
              );
              return mine
                ? sourcesService.acceptQuestion(
                    sourceId,
                    mine.question_id,
                    mine.version,
                  )
                : created;
            });
          },
          () => setWriting(null),
        )}
      </div>
    ) : null;

  return (
    <div className="@container flex flex-col gap-4">
      {/* The chapter at a glance: how far the review is, and anything wrong on GenEd's side. */}
      <div className="rounded-3xl bg-white border border-[#1D6315]/8 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <ProgressRing done={doneCount} total={s.nodes} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-[#1D6315] leading-tight">
              {s.nodes === 0
                ? "No steps yet"
                : doneCount === s.nodes
                  ? "Every step is accepted"
                  : `${doneCount} of ${s.nodes} steps accepted`}
            </p>
            <p className="mt-0.5 text-xs text-[#1D6315]/60">
              Go through the steps: accept, edit or reject Zoovi&rsquo;s
              questions, then approve. Nothing counts until you accept it.
            </p>
          </div>
          <dl className="hidden shrink-0 gap-4 text-right text-xs @[40rem]:flex">
            {(
              [
                ["questions", s.questions, "text-[#1D6315]"],
                ["accepted", s.accepted, "text-emerald-700"],
                [
                  "need your check",
                  s.needs_attention,
                  s.needs_attention > 0 ? "text-amber-700" : "text-[#1D6315]",
                ],
              ] as const
            ).map(([label, value, tone]) => (
              <div key={label} className="flex flex-col">
                <dd
                  className={`text-lg font-black leading-none tabular-nums ${tone}`}
                >
                  {value}
                </dd>
                <dt className="mt-1 text-[11px] text-[#1D6315]/50">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {steps.length > 0 && (
          <div
            className="flex gap-1"
            role="img"
            aria-label={`${doneCount} of ${s.nodes} steps accepted`}
          >
            {steps.map((st) => (
              <span
                key={st.node.section_key}
                title={`${st.index + 1}. ${st.node.title} — ${stepNeed(st, queuedOnly)}`}
                className={`h-1.5 flex-1 rounded-full ${PHASE[st.phase].bar} ${
                  st.node.section_key === currentKey
                    ? "outline-2 outline-offset-1 outline-[#287624]"
                    : ""
                }`}
              />
            ))}
          </div>
        )}

        {(noPlan || planless.length > 0) && (
          <div
            role="status"
            className="rounded-2xl border border-[#1D6315]/10 bg-[#F7F4EA] px-3.5 py-3 flex items-start gap-3"
          >
            <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-[#287624] text-white">
              <Info size={14} aria-hidden />
            </span>
            <span className="text-xs text-[#1D6315]/75">
              <span className="block font-black text-[#1D6315]">
                {noPlan
                  ? "Zoovi has no assessment plan for this chapter"
                  : `Zoovi has no assessment plan for ${planless.length} ${planless.length === 1 ? "step" : "steps"}`}
              </span>
              {noPlan
                ? "You can still accept, edit and reject questions, and they're kept, but they can't count until Zoovi plans what each step should check, so no step can be approved yet. "
                : "Accepted questions are kept, but they can't count until Zoovi plans what each step should check, so those steps can't be approved yet. "}
              This is on GenEd&rsquo;s side; ask GenEd to check.
            </span>
          </div>
        )}

        {lastFailed && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50/70 px-3.5 py-3 flex items-start gap-3"
          >
            <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-red-600 text-white">
              <AlertTriangle size={14} aria-hidden />
            </span>
            <span className="text-xs text-[#1D6315]/75">
              <span className="block font-black text-red-800">
                {lastFailed.state === "stopped"
                  ? "Zoovi stopped writing questions"
                  : "Zoovi couldn’t write questions for this chapter"}
              </span>
              {lastFailed.detail ? `${lastFailed.detail}. ` : ""}
              This is on GenEd&rsquo;s side; ask GenEd to check. Once it&rsquo;s
              fixed, open a step and ask for another question to try again.
            </span>
          </div>
        )}

        {preparing && stuck && (
          <div
            role="status"
            className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 flex items-start gap-3"
          >
            <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-amber-600 text-white">
              <AlertTriangle size={14} aria-hidden />
            </span>
            <span className="text-xs text-[#1D6315]/75">
              <span className="block font-black text-amber-900">
                Question writing hasn&rsquo;t started
              </span>
              This chapter has waited {waitedMin} min and no Zoovi writer has
              picked it up. Question writing may be switched off on this server;
              ask GenEd to check. This page updates by itself when it starts.
            </span>
          </div>
        )}

        {pkg.runs.length > 0 &&
          (() => {
            const status = (
              <GenerationStatus
                runs={pkg.runs}
                titles={Object.fromEntries(
                  pkg.nodes.map((n) => [n.section_key, n.title]),
                )}
                waiting={pkg.nodes
                  .map((n) => n.section_key)
                  .filter((k) =>
                    pkg.questions.some(
                      (q) => q.section_key === k && q.state === "draft",
                    ),
                  )}
                onShow={goTo}
              />
            );
            // While Zoovi writes, its progress shows; afterwards the request log folds away.
            return runsActive ? (
              status
            ) : (
              <details className="group text-xs">
                <summary className="flex cursor-pointer list-none items-center gap-1 font-bold text-[#1D6315]/50 hover:text-[#1D6315] [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    size={13}
                    className="transition-transform group-open:rotate-90"
                    aria-hidden
                  />
                  Zoovi&rsquo;s question requests
                </summary>
                <div className="mt-2">{status}</div>
              </details>
            );
          })()}

        {pkg.findings.length > 0 && (
          <details
            className="group rounded-2xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5"
            aria-label="Issues with the chapter"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-black text-amber-900 [&::-webkit-details-marker]:hidden">
              <AlertTriangle size={13} aria-hidden />
              {pkg.findings.length} issue{pkg.findings.length === 1 ? "" : "s"}{" "}
              Zoovi found in how the chapter was read
              <ChevronRight
                size={13}
                className="ml-auto transition-transform group-open:rotate-90"
                aria-hidden
              />
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {pkg.findings.map((f) => (
                <div key={f.concept_key} className="text-xs text-amber-900">
                  <p>{f.issue}</p>
                  {f.resolution === "corrected" ? (
                    <p className="text-amber-800">
                      Zoovi used this corrected description:{" "}
                      {f.proposed_definition}
                    </p>
                  ) : (
                    <p className="text-amber-800">
                      On hold: no questions were written for it.
                      {f.proposed_definition
                        ? ` Suggested description: ${f.proposed_definition}`
                        : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {pkg.nodes.length === 0 && !preparing && (
        <p className="text-sm text-[#1D6315]/60 text-center py-6">
          Zoovi hasn&rsquo;t prepared questions for this chapter yet.
        </p>
      )}

      {current && (
        <div className="grid grid-cols-1 gap-4 @[46rem]:grid-cols-[minmax(210px,250px)_minmax(0,1fr)] @[46rem]:items-start">
          <div className="rounded-2xl bg-[#F7F4EA] p-1.5 @[46rem]:sticky @[46rem]:top-0 @[46rem]:max-h-[calc(100dvh-14rem)] @[46rem]:overflow-y-auto @[46rem]:p-2">
            <StepList
              steps={steps}
              parent={parent}
              current={current.node.section_key}
              queued={queuedOnly}
              onPick={goTo}
            />
          </div>
          <div
            id="bank-workspace"
            className="min-w-0 scroll-mt-4 rounded-3xl border border-[#1D6315]/8 bg-white p-4 @[46rem]:p-5 flex flex-col gap-3"
          >
            {notice && (
              <p
                role="status"
                className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"
              >
                {notice}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
              >
                {error}
              </p>
            )}
            <StepWorkspace
              limits={pkg?.device_limits}
              key={current.node.section_key}
              step={current}
              total={steps.length}
              parent={parent}
              sourceId={sourceId}
              queued={queuedOnly}
              generating={generating}
              busy={busy}
              act={act}
              editing={editing?.question_id ?? null}
              onEdit={(q) => setEditing(q)}
              renderEditor={() => {
                const q = editing!;
                return renderEditor(
                  q.question.body,
                  (body) => {
                    setEditing(null);
                    act(q.question_id, () =>
                      sourcesService.editQuestion(
                        sourceId,
                        q.question_id,
                        q.version,
                        {
                          body: { ...body, origin: q.question.body.origin },
                          meta: q.question.meta,
                        },
                      ),
                    );
                  },
                  () => setEditing(null),
                );
              }}
              writer={writer}
              onKeep={(conceptKey) =>
                act(`keep:${conceptKey}`, () =>
                  sourcesService.keepConcept(sourceId, conceptKey),
                )
              }
              onWrite={(target) => {
                setWriting(target);
                if (target.sectionKey !== current.node.section_key)
                  goTo(target.sectionKey);
              }}
              onAsk={(sectionKey) =>
                act(`more:${sectionKey}`, () =>
                  sourcesService.refillPart(sourceId, sectionKey),
                )
              }
              prev={steps[current.index - 1] ?? null}
              next={steps[current.index + 1] ?? null}
              onPick={goTo}
            />
          </div>
        </div>
      )}

      {/* One slim bar: how far the chapter is, where to go next, and the approval. */}
      {steps.length > 0 &&
        (approvedNow ? (
          <div
            role="status"
            className="sticky bottom-0 z-10 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3 shadow-[0_-8px_24px_-12px_rgba(29,99,21,0.25)]"
          >
            <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-emerald-600 text-white">
              <Check size={14} strokeWidth={3} aria-hidden />
            </span>
            <span className="text-xs text-[#1D6315]/70">
              <span className="block text-sm font-black text-[#1D6315]">
                Approved
                {pkg.approval?.approved_at
                  ? ` · ${new Date(pkg.approval.approved_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                  : ""}
              </span>
              The chapter uses these {s.accepted} accepted questions. Review and
              publish it from its row. Changing a question asks for approval
              again.
            </span>
          </div>
        ) : (
          <div
            className={`sticky bottom-0 z-10 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-[0_-8px_24px_-12px_rgba(29,99,21,0.35)] ${
              blocked.length > 0
                ? "bg-white border border-[#1D6315]/10"
                : "bg-[#1D6315] text-white"
            }`}
          >
            <span className="min-w-[200px] flex-1 text-xs">
              {blocked.length > 0 ? (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-black text-[#1D6315]">
                    <AlertTriangle
                      size={14}
                      className="text-amber-600"
                      aria-hidden
                    />
                    {blocked.length === 1
                      ? "1 step still needs accepted questions"
                      : `${blocked.length} steps still need accepted questions`}
                  </span>
                  <span className="text-[#1D6315]/55">
                    {noPlan
                      ? "None can be approved until Zoovi plans the chapter's questions."
                      : `${
                          planless.length > 0
                            ? `${planless.length} of them ${planless.length === 1 ? "waits" : "wait"} on Zoovi's plan, not on you. `
                            : ""
                        }You can approve once every step is covered.`}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-sm font-black text-white">
                    {s.nodes === 1 ? "The step is" : `All ${s.nodes} steps are`}{" "}
                    covered · {s.accepted} accepted question
                    {s.accepted === 1 ? "" : "s"}
                  </span>
                  <span className="text-white/70">
                    {approvalVoided
                      ? "You changed questions after your last approval, so it no longer applies. Approve again to run the chapter with them."
                      : "Approving runs the chapter with exactly these questions. Any change afterwards needs a new approval."}
                  </span>
                </>
              )}
            </span>
            {nextBlocked && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => goTo(nextBlocked.node.section_key)}
              >
                Next to do: step {nextBlocked.index + 1}
                <ChevronRight size={14} aria-hidden />
              </Button>
            )}
            <Button
              size="sm"
              tone={blocked.length > 0 ? "light" : "onDark"}
              variant={blocked.length > 0 ? "secondary" : "primary"}
              leadingIcon={<CheckCircle2 size={15} />}
              loading={busy === "approve"}
              disabled={blocked.length > 0}
              title={blocked.length > 0 ? "Cover every step first" : undefined}
              onClick={() =>
                act("approve", async () => {
                  const next = await sourcesService.approveBank(
                    sourceId,
                    pkg.version,
                  );
                  onApproved();
                  return next;
                })
              }
            >
              Approve and run the chapter
            </Button>
          </div>
        ))}
    </div>
  );
}
