"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Loader2,
  PenLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { ACTIVITY_MODE, KIND_LABEL, keyText } from "./QuestionFormats";
import { LearnerPreview } from "./LearnerPreview";
import { GenerationStatus, pendingSteps } from "./GenerationStatus";
import {
  StepGuide,
  blankFor,
  partnerQuestion,
  type WriteTarget,
} from "./StepGuide";
import type {
  AddedQuestion,
  BankNode,
  BankOpenSlot,
  BankPackage,
  BankQuestion,
  BankQuestionContent,
  BankRun,
  RejectionReason,
} from "../types/sources";

/**
 * The chapter's AI-prepared assessment package (backend ADR 0047). GenEd designs, writes and checks the questions on its own; the
 * partner reviews the finished draft step by step: accept, edit, reject with a reason, ask for another, accept in bulk, then approve.
 * Nothing counts until accepted, and nothing reaches students until the chapter's release is reviewed and published.
 */

/** How often to look again while GenEd is still preparing questions. */
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
    <div className="flex flex-col gap-1 text-xs text-[#122D30]/70">
      <p>
        <span className="font-bold text-[#122D30]">The learner: </span>
        {ACTIVITY_MODE[body.activity_mode ?? "write"]}. A free answer: the tutor
        gives feedback, and the learner must try it to finish the step.
      </p>
      {body.passage && (
        <p className="whitespace-pre-line">
          <span className="font-bold text-[#122D30]">
            {body.activity_mode === "listen"
              ? "Passage (only heard, never shown): "
              : "Passage to read aloud: "}
          </span>
          {body.passage}
        </p>
      )}
      {body.rubric && (
        <p className="whitespace-pre-line">
          <span className="font-bold text-[#122D30]">A good answer: </span>
          {body.rubric}
        </p>
      )}
      {body.example_answer && (
        <p className="whitespace-pre-line">
          <span className="font-bold text-[#122D30]">Example: </span>
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
  return (
    <article
      aria-label={body.prompt}
      className="rounded-2xl bg-white border border-[#122D30]/8 p-4 flex flex-col gap-2.5"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${chip} bg-[#075E63]/10 text-[#075E63]`}>
          {KIND_LABEL[body.answer_kind]}
        </span>
        <span className={`${chip} bg-[#122D30]/5 text-[#122D30]/60`}>
          {DIFFICULTY[meta.difficulty]}
        </span>
        <span className={`${chip} bg-[#122D30]/5 text-[#122D30]/60`}>
          {PROVENANCE[meta.provenance]}
        </span>
        {doubted(q) ? (
          <span className={`${chip} bg-amber-50 text-amber-800`}>
            <AlertTriangle size={11} aria-hidden /> Please check
          </span>
        ) : (
          <span className={`${chip} bg-emerald-50 text-emerald-700`}>
            <ShieldCheck size={11} aria-hidden /> Answer checked
          </span>
        )}
        <span className="flex-1" />
        {q.state === "accepted" && (
          <span className={`${chip} bg-emerald-600 text-white`}>
            <Check size={11} aria-hidden /> Accepted
          </span>
        )}
        {q.state === "rejected" && (
          <span className={`${chip} bg-[#122D30]/10 text-[#122D30]/60`}>
            Rejected
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-[#122D30] whitespace-pre-line">
        {body.prompt}
      </p>
      {body.answer_kind === "activity" ? (
        <ActivityDetails body={body} />
      ) : (
        <>
          <LearnerPreview
            key={`${q.question_id}-${q.revision}`}
            question={body}
          />
          <p className="text-xs text-[#122D30]/70">
            <span className="font-bold text-[#122D30]">Answer: </span>
            {keyText(body)}
          </p>
        </>
      )}
      {body.explanation && (
        <p className="text-xs text-[#122D30]/70">
          <span className="font-bold text-[#122D30]">Why: </span>
          {body.explanation}
        </p>
      )}
      {(meta.distractors?.length ?? 0) > 0 && (
        <details className="text-xs text-[#122D30]/70">
          <summary className="cursor-pointer font-bold text-[#122D30]">
            Wrong answers and the mistake each shows
          </summary>
          <ul className="list-disc pl-5 mt-1">
            {meta.distractors!.map((d, i) => (
              <li key={i}>
                <span className="font-bold">{d.option}</span>: {d.misconception}
              </li>
            ))}
          </ul>
        </details>
      )}
      {meta.remediation && (
        <p className="text-xs text-[#122D30]/70">
          <span className="font-bold text-[#122D30]">
            If a student gets it wrong:{" "}
          </span>
          {meta.remediation}
        </p>
      )}
      {(meta.findings?.length ?? 0) > 0 && (
        <ul
          className="text-xs text-amber-800 list-disc pl-5"
          aria-label="Things to check"
        >
          {meta.findings!.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      {!q.concept_in_chapter && (
        <p className="text-xs text-amber-800">
          The latest run of the chapter no longer has this question&rsquo;s
          concept.
        </p>
      )}
      {rejecting ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[#122D30]/10 p-3">
          <label className="text-xs font-bold text-[#122D30]">
            Why reject it?
            <select
              className="mt-1 block w-full rounded-lg border border-[#122D30]/15 bg-white px-2 py-1.5 text-xs"
              value={reason}
              onChange={(e) => setReason(e.target.value as RejectionReason)}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[#122D30]">
            Anything GenEd should know for the replacement (optional)
            <input
              className="mt-1 block w-full rounded-lg border border-[#122D30]/15 bg-white px-2 py-1.5 text-xs"
              maxLength={500}
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
          <div className="flex flex-wrap gap-2">
            {q.state !== "accepted" && (
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
    pill: "bg-amber-300 text-[#122D30]",
    bar: "bg-amber-300",
    badge: "bg-amber-300 text-[#122D30]",
  },
  waiting: {
    label: "Being written",
    pill: "bg-[#075E63]/8 text-[#075E63]",
    bar: "bg-[#075E63]/25 animate-pulse",
    badge: "bg-[#075E63]/10 text-[#075E63]",
  },
  gap: {
    label: "Needs an activity",
    pill: "bg-[#122D30]/6 text-amber-800",
    bar: "bg-[repeating-linear-gradient(135deg,#D97706_0_3px,#FCD34D_3px_6px)]",
    badge: "bg-amber-100 text-amber-800",
  },
  incomplete: {
    label: "Incomplete",
    pill: "bg-[#122D30]/6 text-[#122D30]/65",
    bar: "bg-[#122D30]/15",
    badge: "bg-[#122D30]/8 text-[#122D30]/60",
  },
};

/** Objectives of a step that accepted questions (or an accepted activity) don't cover yet, plus held or unplanned concepts. */
function uncoveredCount(node: BankNode): number {
  return node.concepts.reduce(
    (n, c) =>
      n +
      (c.status === "held" || c.status === "not_planned"
        ? 1
        : c.obligations.filter((o) => !o.approved_covered).length),
    0,
  );
}

/** "Parent step.: Child" (how the backend names a sub-step) reads as a breadcrumb and a title. */
function splitTitle(title: string): { parent: string | null; name: string } {
  const m = /^(.*?[.?!]):\s+(.+)$/.exec(title);
  return m ? { parent: m[1], name: m[2] } : { parent: null, name: title };
}

function NodeSection({
  index,
  sourceId,
  node,
  questions,
  phase,
  queued,
  open,
  onToggle,
  busy,
  act,
  editing,
  onEdit,
  renderEditor,
}: {
  index: number;
  sourceId: string;
  node: BankNode;
  questions: BankQuestion[];
  phase: StepPhase;
  /** The run that writes this step's questions hasn't started yet. */
  queued: boolean;
  open: boolean;
  onToggle: () => void;
  busy: string | null;
  act: (key: string, call: () => Promise<BankPackage>) => void;
  editing: string | null;
  onEdit: (q: BankQuestion) => void;
  renderEditor: (q: BankQuestion) => React.ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  const [hint, setHint] = useState("");
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
  const accepted = live.filter((q) => q.state === "accepted").length;
  const ready = live.filter((q) => q.state === "draft" && !doubted(q));
  const floor = Math.max(node.review_floor, 1);
  const checked = Math.min(node.reviewable, floor);
  const { parent, name } = splitTitle(node.title);
  const look = PHASE[phase];
  const done = phase === "ready" || phase === "accepted";
  const panelId = `bank-step-${node.section_key}`;
  return (
    <section
      id={`bank-step-row-${node.section_key}`}
      aria-label={node.title}
      className={`scroll-mt-4 rounded-3xl border transition-colors ${
        open
          ? "bg-white border-[#122D30]/12 shadow-[0_1px_0_rgba(18,45,48,0.04),0_8px_24px_-12px_rgba(18,45,48,0.18)]"
          : "bg-white/60 border-[#122D30]/8 hover:bg-white hover:border-[#122D30]/12"
      }`}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- a disclosure header, not an action button. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075E63]"
      >
        <span
          aria-hidden
          className={`grid place-items-center h-8 w-8 shrink-0 rounded-full text-xs font-black tabular-nums ${look.badge}`}
        >
          {done ? (
            <Check size={15} strokeWidth={3} />
          ) : waiting ? (
            queued ? (
              <Clock size={14} />
            ) : (
              <Loader2 size={14} className="animate-spin" />
            )
          ) : (
            index + 1
          )}
        </span>
        <span className="flex-1 min-w-0">
          {parent && (
            <span className="block text-[10.5px] font-bold text-[#122D30]/45 truncate">
              {parent}
            </span>
          )}
          <span className="block text-sm font-black text-[#122D30] truncate">
            {name}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[11px] text-[#122D30]/55">
            {waiting ? (
              <span>
                {queued
                  ? "Waiting for GenEd to start writing questions"
                  : "GenEd is still writing questions for this step"}
              </span>
            ) : (
              <>
                <span
                  className="flex gap-0.5"
                  role="img"
                  aria-label={`${node.reviewable} of ${node.review_floor} checked, distinct questions`}
                >
                  {Array.from({ length: floor }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-4 rounded-full ${i < checked ? "bg-[#075E63]" : "bg-[#122D30]/12"}`}
                    />
                  ))}
                </span>
                <span className="tabular-nums">
                  {node.reviewable}/{node.review_floor} checked
                  {" · "}
                  {live.length} question{live.length === 1 ? "" : "s"}
                  {accepted > 0 && ` · ${accepted} accepted`}
                </span>
              </>
            )}
          </span>
        </span>
        <span className={`${chip} ${look.pill} shrink-0 hidden sm:inline-flex`}>
          {waiting && queued ? "Waiting to start" : look.label}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#122D30]/40 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 flex flex-col gap-3">
          <div className="rounded-2xl bg-[#F6F7F2] p-3.5">
            <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-[#122D30]/45">
              What learners must show
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {obligations.map((o) => (
                <li
                  key={`${o.concept}-${o.key}`}
                  className="flex items-start gap-2 text-xs text-[#122D30]/80"
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
                      className="mt-0.5 text-[#122D30]/25 shrink-0"
                      aria-hidden
                    />
                  )}
                  <span>
                    <span className="font-bold text-[#122D30]">
                      {o.concept}
                    </span>
                    <span className="text-[#122D30]/40"> — </span>
                    {o.statement}
                    <span className="block text-[11px] text-[#122D30]/50">
                      {o.production
                        ? o.approved_covered
                          ? "Answered by an accepted activity."
                          : o.draft_covered
                            ? "Accept the activity below."
                            : "Needs an activity: GenEd proposes one, or write your own."
                        : o.approved_covered
                          ? "Covered by accepted questions."
                          : o.draft_covered
                            ? "Accept enough of the questions below."
                            : waiting
                              ? "Questions are on the way."
                              : "GenEd needs more questions here."}
                    </span>
                  </span>
                </li>
              ))}
              {blocked.map((c) => (
                <li
                  key={c.concept_key}
                  className={`flex items-start gap-2 text-xs ${waiting ? "text-[#122D30]/80" : "text-amber-900"}`}
                >
                  {waiting ? (
                    <Clock
                      size={13}
                      className="mt-0.5 shrink-0 text-[#075E63]/60"
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
                          ? "Not planned yet; GenEd plans it while it writes."
                          : `Not planned. ${c.why ?? ""}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {openSlots.length > 0 && !waiting && (
              <details className="mt-2.5 text-xs text-[#122D30]/70 group">
                <summary className="cursor-pointer font-bold text-[#122D30]/70 hover:text-[#122D30]">
                  Why {openSlots.length} question{" "}
                  {openSlots.length === 1 ? "slot is" : "slots are"} still open
                </summary>
                <ul className="mt-1.5 flex flex-col gap-1 pl-1">
                  {openSlots.map((s) => (
                    <li key={s.slot}>
                      <span className="font-bold">{s.concept}:</span>{" "}
                      {SLOT_REASON[s.category]} {s.detail}
                      {s.last_reasons && s.last_reasons.length > 0 && (
                        <span className="text-[#122D30]/50">
                          {" "}
                          ({s.last_reasons[0]})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {waiting && (
            <div
              className="rounded-2xl border border-dashed border-[#075E63]/25 p-4 flex flex-col gap-2"
              aria-hidden
            >
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  <span className="h-2.5 w-24 rounded-full bg-[#075E63]/10" />
                  <span className="h-3 w-4/5 rounded-full bg-[#122D30]/8" />
                  <span className="h-3 w-3/5 rounded-full bg-[#122D30]/6" />
                </div>
              ))}
            </div>
          )}

          {live.map((q) =>
            editing === q.question_id ? (
              <div key={q.question_id}>{renderEditor(q)}</div>
            ) : (
              <QuestionCard
                key={q.question_id}
                q={q}
                busy={busy === q.question_id}
                onAccept={() =>
                  act(q.question_id, () =>
                    sourcesService.acceptQuestion(
                      sourceId,
                      q.question_id,
                      q.version,
                    ),
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
            ),
          )}

          {!waiting && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
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
                {!asking && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    leadingIcon={<Plus size={14} />}
                    onClick={() => setAsking(true)}
                  >
                    Ask GenEd for another question
                  </Button>
                )}
              </div>
              {asking && (
                <form
                  className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#122D30]/10 bg-white p-3"
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
                  <label className="flex-1 min-w-[200px] text-[11px] font-bold text-[#122D30]/60">
                    An idea for it (optional)
                    <input
                      autoFocus
                      className="mt-1 block w-full rounded-lg border border-[#122D30]/15 bg-white px-2.5 py-1.5 text-xs font-normal focus:outline-none focus:border-[#075E63] focus:ring-2 focus:ring-[#075E63]/15"
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
        </div>
      )}
    </section>
  );
}

type Filter = "all" | "review" | "todo" | "done";
const FILTERS: Record<Filter, { label: string; phases?: StepPhase[] }> = {
  all: { label: "All steps" },
  review: { label: "To review", phases: ["review"] },
  todo: { label: "Not ready", phases: ["waiting", "incomplete", "gap"] },
  done: { label: "Accepted", phases: ["accepted", "ready"] },
};

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
          className="text-[#122D30]/8"
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
      <span className="text-[13px] font-black text-[#122D30] tabular-nums">
        {done}
        <span className="text-[#122D30]/35">/{total}</span>
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
  retries_exhausted: "GenEd's attempts didn't pass its checks.",
  generation_defect:
    "GenEd didn't produce a usable question; asking for another may fix it.",
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
  /** Steps the partner opened; null until they open or close one. */
  const [openKeys, setOpenKeys] = useState<Set<string> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
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
  const phaseLabel = (ph: StepPhase) =>
    ph === "waiting" && queuedOnly ? "Waiting to start" : PHASE[ph].label;
  useEffect(() => {
    if (!preparing) return;
    const t = setInterval(() => {
      setNow(Date.now());
      void load();
    }, BANK_POLL_MS);
    return () => clearInterval(t);
  }, [preparing, load]);

  const steps = useMemo(
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
        };
      }),
    [pkg, preparing],
  );
  // Until the partner opens or closes a step, the first step to review is the open one.
  const firstToReview = (
    steps.find((st) => st.phase === "review") ??
    steps.find(
      (st) =>
        st.phase === "incomplete" &&
        st.questions.some((q) => q.state === "draft"),
    )
  )?.node.section_key;
  const opened = useMemo(
    () => openKeys ?? new Set(firstToReview ? [firstToReview] : []),
    [openKeys, firstToReview],
  );

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
        className="text-sm font-bold text-[#122D30]/70 py-10 text-center"
      >
        {error}
      </p>
    );
  if (!pkg)
    return (
      <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#122D30]/40 py-10">
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
  const shown = steps.filter(
    (st) => FILTERS[filter].phases?.includes(st.phase) ?? true,
  );
  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev ?? opened);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // What still stops the release: every step must be publishable (backend `bank_approval`'s coverage_ready).
  const blocked = steps.filter((st) => !st.node.publishable);
  // The approval already feeds the chapter: don't ask for it again. A later change voids it (the server says so).
  const approvedNow =
    !!pkg.approval?.approved &&
    pkg.approval.coverage_ready &&
    blocked.length === 0;
  const approvalVoided = !pkg.approval?.approved && !!pkg.approval?.approved_at;
  const goTo = (key: string) => {
    setFilter("all");
    setOpenKeys((prev) => new Set(prev ?? opened).add(key));
    requestAnimationFrame(() =>
      document
        .getElementById(`bank-step-row-${key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const openStep = goTo;
  const allOpen =
    shown.length > 0 && shown.every((st) => opened.has(st.node.section_key));
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-white border border-[#122D30]/8 p-5 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <ProgressRing done={doneCount} total={s.nodes} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-[#122D30] leading-tight">
              {s.nodes === 0
                ? "No steps yet"
                : doneCount === s.nodes
                  ? "Every step is accepted"
                  : `${doneCount} of ${s.nodes} steps accepted`}
            </p>
            <p className="mt-1 text-xs text-[#122D30]/65 leading-relaxed">
              GenEd planned what each step should check and wrote questions for
              it. Accept, edit or reject each one, then approve. Nothing counts
              until you accept it.
            </p>
            <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {(
                [
                  ["questions", s.questions, "text-[#122D30]"],
                  ["accepted", s.accepted, "text-emerald-700"],
                  [
                    "need your check",
                    s.needs_attention,
                    s.needs_attention > 0 ? "text-amber-700" : "text-[#122D30]",
                  ],
                ] as const
              ).map(([label, value, tone]) => (
                <div key={label} className="flex items-baseline gap-1">
                  <dd className={`font-black tabular-nums ${tone}`}>{value}</dd>
                  <dt className="text-[#122D30]/55">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {steps.length > 0 && (
          <div className="flex flex-col gap-2">
            <div
              className="flex gap-1"
              role="img"
              aria-label={`${doneCount} of ${s.nodes} steps accepted`}
            >
              {steps.map((st) => (
                <span
                  key={st.node.section_key}
                  title={`${st.index + 1}. ${splitTitle(st.node.title).name} — ${phaseLabel(st.phase)}`}
                  className={`h-2 flex-1 rounded-full ${PHASE[st.phase].bar}`}
                />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#122D30]/60">
              {(Object.keys(PHASE) as StepPhase[])
                .filter((ph) => counts[ph] > 0)
                .map((ph) => (
                  <li key={ph} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={`h-2 w-2 rounded-full ${PHASE[ph].bar}`}
                    />
                    {phaseLabel(ph)}{" "}
                    <span className="font-black tabular-nums text-[#122D30]/80">
                      {counts[ph]}
                    </span>
                  </li>
                ))}
            </ul>
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
            <span className="text-xs text-[#122D30]/75">
              <span className="block font-black text-red-800">
                {lastFailed.state === "stopped"
                  ? "GenEd stopped writing questions"
                  : "GenEd couldn’t write questions for this chapter"}
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
            <span className="text-xs text-[#122D30]/75">
              <span className="block font-black text-amber-900">
                Question writing hasn&rsquo;t started
              </span>
              This chapter has waited {waitedMin} min and no GenEd writer has
              picked it up. Question writing may be switched off on this server;
              ask GenEd to check. This page updates by itself when it starts.
            </span>
          </div>
        )}

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
          onShow={openStep}
        />

        {!preparing && s.capability_gap_nodes > 0 && (
          <p className="text-xs text-amber-800 flex items-start gap-1.5">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {s.capability_gap_nodes === 1
                ? "1 step has a writing, speaking, reading or listening objective that still needs an activity."
                : `${s.capability_gap_nodes} steps have a writing, speaking, reading or listening objective that still needs an activity.`}
            </span>
          </p>
        )}
      </div>

      {pkg.actions && (
        <StepGuide
          steps={pkg.actions}
          generating={pendingSteps(pkg.runs)}
          accepted={s.accepted}
          busy={busy}
          onOpen={openStep}
          onKeep={(conceptKey) =>
            act(`keep:${conceptKey}`, () =>
              sourcesService.keepConcept(sourceId, conceptKey),
            )
          }
          onWrite={setWriting}
          onAsk={(sectionKey) =>
            act(`more:${sectionKey}`, () =>
              sourcesService.refillPart(sourceId, sectionKey),
            )
          }
        />
      )}
      {writing && (
        <div
          aria-label="Write your own"
          className="rounded-2xl border border-[#075E63]/20 bg-white p-4 flex flex-col gap-2"
        >
          <p className="text-xs text-[#122D30]/70">
            For &ldquo;{writing.statement}&rdquo;. It counts for this step as
            soon as you save it.
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
                    (q.question_id === body.id ||
                      q.question.body.id === body.id),
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
      )}

      {pkg.findings.length > 0 && (
        <details
          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 group"
          aria-label="Issues with the chapter"
        >
          <summary className="cursor-pointer text-sm font-black text-amber-900 flex items-center gap-2">
            <AlertTriangle size={14} aria-hidden />
            {pkg.findings.length} issue{pkg.findings.length === 1 ? "" : "s"}{" "}
            GenEd found in how the chapter was read
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {pkg.findings.map((f) => (
              <div key={f.concept_key} className="text-xs text-amber-900">
                <p>{f.issue}</p>
                {f.resolution === "corrected" ? (
                  <p className="text-amber-800">
                    GenEd used this corrected description:{" "}
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

      {notice && (
        <p role="status" className="text-xs font-bold text-amber-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      {pkg.nodes.length === 0 && !preparing && (
        <p className="text-sm text-[#122D30]/60 text-center py-6">
          GenEd hasn&rsquo;t prepared questions for this chapter yet.
        </p>
      )}

      {steps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Show steps"
            className="flex flex-wrap gap-1 rounded-full bg-[#122D30]/5 p-1"
          >
            {(Object.keys(FILTERS) as Filter[]).map((f) => {
              const n =
                f === "all"
                  ? steps.length
                  : steps.filter((st) => FILTERS[f].phases!.includes(st.phase))
                      .length;
              if (f !== "all" && n === 0) return null;
              const on = filter === f;
              return (
                // eslint-disable-next-line no-restricted-syntax -- a segmented filter tab, not an action button.
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition-colors ${
                    on
                      ? "bg-white text-[#122D30] shadow-sm"
                      : "text-[#122D30]/55 hover:text-[#122D30]"
                  }`}
                >
                  {FILTERS[f].label}{" "}
                  <span className="tabular-nums opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
          <span className="flex-1" />
          <Button
            size="sm"
            variant="tertiary"
            onClick={() =>
              setOpenKeys((prev) => {
                const next = new Set(prev ?? opened);
                for (const st of shown) {
                  if (allOpen) next.delete(st.node.section_key);
                  else next.add(st.node.section_key);
                }
                return next;
              })
            }
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      )}

      {shown.map(({ node, index, questions, phase }) => (
        <NodeSection
          key={node.section_key}
          index={index}
          sourceId={sourceId}
          node={node}
          questions={questions}
          phase={phase}
          queued={queuedOnly}
          open={opened.has(node.section_key)}
          onToggle={() => toggle(node.section_key)}
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
        />
      ))}
      {shown.length === 0 && steps.length > 0 && (
        <p className="text-sm text-[#122D30]/55 text-center py-6">
          No steps here.
        </p>
      )}

      {s.accepted > 0 && approvedNow && (
        <div
          role="status"
          className="sticky bottom-0 z-10 rounded-3xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 shadow-[0_-8px_24px_-12px_rgba(18,45,48,0.25)]"
        >
          <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-emerald-600 text-white">
            <Check size={16} strokeWidth={3} aria-hidden />
          </span>
          <span className="text-xs text-[#122D30]/70">
            <span className="block text-sm font-black text-[#122D30]">
              Approved
              {pkg.approval?.approved_at
                ? ` · ${new Date(pkg.approval.approved_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                : ""}
            </span>
            The chapter uses these {s.accepted} accepted questions. Nothing more
            to do here: review and publish the chapter from its row. If you
            change a question, you&rsquo;ll be asked to approve again.
          </span>
        </div>
      )}
      {s.accepted > 0 && !approvedNow && (
        <div
          className={`sticky bottom-0 z-10 rounded-3xl p-4 flex flex-col gap-3 shadow-[0_-8px_24px_-12px_rgba(18,45,48,0.4)] ${
            blocked.length > 0
              ? "bg-white border border-amber-200"
              : "bg-[#122D30] text-white"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`flex-1 min-w-[180px] text-xs ${blocked.length > 0 ? "text-[#122D30]/70" : "text-white/75"}`}
            >
              {blocked.length > 0 ? (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-black text-amber-900">
                    <AlertTriangle size={14} aria-hidden />
                    {blocked.length === 1
                      ? "1 step still needs accepted questions"
                      : `${blocked.length} steps still need accepted questions`}
                  </span>
                  Every step must be covered before you approve; approving
                  earlier sends the chapter straight back to review. Accept
                  enough questions in:
                </>
              ) : (
                <>
                  <span className="block text-sm font-black text-white">
                    {s.nodes === 1 ? "The step is" : `All ${s.nodes} steps are`}{" "}
                    covered · {s.accepted} accepted question
                    {s.accepted === 1 ? "" : "s"}
                  </span>
                  {approvalVoided
                    ? "You changed questions after your last approval, so it no longer applies. Approve again to run the chapter with them."
                    : "Approving runs the chapter with exactly these questions. Any change afterwards needs a new approval."}
                </>
              )}
            </span>
            <Button
              tone={blocked.length > 0 ? "light" : "onDark"}
              variant={blocked.length > 0 ? "secondary" : "primary"}
              leadingIcon={<CheckCircle2 size={16} />}
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
          {blocked.length > 0 && (
            <ul
              aria-label="Steps that still need accepted questions"
              className="flex flex-wrap gap-1.5"
            >
              {blocked.map((st) => (
                <li key={st.node.section_key}>
                  {/* eslint-disable-next-line no-restricted-syntax -- a jump link to a step, not an action button. */}
                  <button
                    type="button"
                    onClick={() => goTo(st.node.section_key)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11.5px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075E63]"
                  >
                    <span className="tabular-nums">{st.index + 1}.</span>
                    <span className="max-w-[220px] truncate">
                      {splitTitle(st.node.title).name}
                    </span>
                    <span className="font-normal text-amber-800/80">
                      · {uncoveredCount(st.node)} to cover
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
