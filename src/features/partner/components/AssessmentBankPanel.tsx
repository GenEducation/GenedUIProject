"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { KIND_LABEL, keyText } from "./QuestionFormats";
import { LearnerPreview } from "./LearnerPreview";
import type {
  AddedQuestion,
  BankNode,
  BankOpenSlot,
  BankPackage,
  BankQuestion,
  BankQuestionContent,
  RejectionReason,
} from "../types/sources";

/**
 * The chapter's AI-prepared assessment package (backend ADR 0047). GenEd designs, writes and checks the questions on its own; the
 * partner reviews the finished draft step by step: accept, edit, reject with a reason, ask for another, accept in bulk, then approve.
 * Nothing counts until accepted, and nothing reaches students until the chapter's release is reviewed and published.
 */

/** How often to look again while GenEd is still preparing questions. */
export const BANK_POLL_MS = 5000;

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
      <p className="text-sm font-bold text-[#122D30]">{body.prompt}</p>
      <LearnerPreview key={`${q.question_id}-${q.revision}`} question={body} />
      <p className="text-xs text-[#122D30]/70">
        <span className="font-bold text-[#122D30]">Answer: </span>
        {keyText(body)}
      </p>
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

function NodeSection({
  sourceId,
  node,
  questions,
  busy,
  act,
  editing,
  onEdit,
  renderEditor,
}: {
  sourceId: string;
  node: BankNode;
  questions: BankQuestion[];
  busy: string | null;
  act: (key: string, call: () => Promise<BankPackage>) => void;
  editing: string | null;
  onEdit: (q: BankQuestion) => void;
  renderEditor: (q: BankQuestion) => React.ReactNode;
}) {
  const [open, setOpen] = useState(!node.approved_ready);
  const [hint, setHint] = useState("");
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
  const ready = live.filter((q) => q.state === "draft" && !doubted(q));
  const status = node.publishable
    ? "Ready"
    : node.approved_ready
      ? node.status === "capability_gap"
        ? "Accepted · a writing or speaking objective can't be checked yet"
        : "Accepted"
      : node.status === "ready_for_review"
        ? "Ready for your review"
        : node.status === "capability_gap"
          ? "Writing or speaking objective can't be checked yet"
          : "Incomplete";
  return (
    <section
      aria-label={node.title}
      className="rounded-3xl bg-white/60 border border-[#122D30]/8"
    >
      {/* eslint-disable-next-line no-restricted-syntax -- a disclosure header, not an action button. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-black text-[#122D30] truncate">
            {node.title}
          </span>
          <span className="block text-[11px] text-[#122D30]/50">
            {live.length} questions ·{" "}
            {live.filter((q) => q.state === "accepted").length} accepted ·{" "}
            {status}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="rounded-2xl bg-white border border-[#122D30]/5 p-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#122D30]/40">
              What learners must show
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {obligations.map((o) => (
                <li
                  key={`${o.concept}-${o.key}`}
                  className="flex items-start gap-2 text-xs text-[#122D30]/80"
                >
                  {o.production ? (
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
                    <span
                      aria-hidden
                      className="mt-1 h-2 w-2 rounded-full bg-[#122D30]/20 shrink-0"
                    />
                  )}
                  <span>
                    <span className="font-bold">{o.concept}:</span>{" "}
                    {o.statement}
                    {o.production
                      ? " (writing or speaking can't be checked by these question types yet, so this step can't be published)"
                      : o.approved_covered
                        ? ""
                        : o.draft_covered
                          ? " (accept enough of the questions below)"
                          : " (GenEd needs more questions here)"}
                  </span>
                </li>
              ))}
              {blocked.map((c) => (
                <li
                  key={c.concept_key}
                  className="flex items-start gap-2 text-xs text-amber-800"
                >
                  <AlertTriangle
                    size={13}
                    className="mt-0.5 shrink-0"
                    aria-hidden
                  />
                  <span>
                    <span className="font-bold">{c.title}:</span>{" "}
                    {c.status === "held" ? "On hold. " : "Not planned yet. "}
                    {c.why}
                  </span>
                </li>
              ))}
            </ul>
            {openSlots.length > 0 && (
              <details className="mt-2 text-xs text-[#122D30]/70">
                <summary className="cursor-pointer font-bold">
                  Why {openSlots.length} question{" "}
                  {openSlots.length === 1 ? "slot is" : "slots are"} still open
                </summary>
                <ul className="mt-1 flex flex-col gap-1">
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
          <div className="flex flex-wrap items-end gap-2">
            {ready.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<Check size={14} />}
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
                Accept the {ready.length} checked questions
              </Button>
            )}
            <label className="flex-1 min-w-[200px] text-[11px] font-bold text-[#122D30]/60">
              Ask for another question (optional idea, e.g. &ldquo;a cricket
              example&rdquo;)
              <input
                className="mt-1 block w-full rounded-lg border border-[#122D30]/15 bg-white px-2 py-1.5 text-xs font-normal"
                maxLength={300}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
              />
            </label>
            <Button
              size="sm"
              variant="outline"
              leadingIcon={<RefreshCw size={14} />}
              loading={busy === `more:${node.section_key}`}
              onClick={() =>
                act(`more:${node.section_key}`, () =>
                  sourcesService.refillPart(
                    sourceId,
                    node.section_key,
                    hint.trim() ? [hint.trim()] : [],
                  ),
                )
              }
            >
              Ask for another
            </Button>
          </div>
        </div>
      )}
    </section>
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
  const [editing, setEditing] = useState<string | null>(null);

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
  useEffect(() => {
    if (!preparing) return;
    const t = setInterval(() => void load(), BANK_POLL_MS);
    return () => clearInterval(t);
  }, [preparing, load]);

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
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white border border-[#122D30]/8 p-4 flex flex-col gap-2">
        <p className="text-sm text-[#122D30]/80">
          GenEd read the chapter, planned what each step should check, and wrote
          and checked these questions. Review them: accept, edit or reject each
          one, then approve. Nothing counts until you accept it.
        </p>
        {(s.incomplete_nodes > 0 || s.capability_gap_nodes > 0) && (
          <p className="text-xs text-[#122D30]/70">
            Of {s.nodes} steps, {s.incomplete_nodes} are incomplete and{" "}
            {s.capability_gap_nodes} have a writing or speaking objective no
            question type can check yet. Each step below says why.
          </p>
        )}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            ["Questions", s.questions],
            ["Accepted", s.accepted],
            ["Need your check", s.needs_attention],
            ["Steps ready", `${s.approved_ready_nodes}/${s.nodes}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#F6F7F2] px-2 py-2">
              <dt className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">
                {label}
              </dt>
              <dd className="text-lg font-black text-[#122D30] tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {preparing && (
          <p
            role="status"
            className="flex items-center gap-2 text-xs font-bold text-violet-700"
          >
            <Sparkles size={14} aria-hidden /> GenEd is preparing questions.
            This page updates by itself.
          </p>
        )}
        {s.publishable_nodes < s.nodes && s.nodes > 0 && (
          <p className="text-xs text-[#122D30]/60">
            {s.publishable_nodes} of {s.nodes} steps can be published now. Every
            step needs enough accepted questions.
          </p>
        )}
      </div>

      {pkg.findings.length > 0 && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex flex-col gap-2"
          aria-label="Issues with the chapter"
        >
          <p className="text-sm font-black text-amber-900">
            Issues GenEd found in how the chapter was read
          </p>
          {pkg.findings.map((f) => (
            <div key={f.concept_key} className="text-xs text-amber-900">
              <p>{f.issue}</p>
              {f.resolution === "corrected" ? (
                <p className="text-amber-800">
                  GenEd used this corrected description: {f.proposed_definition}
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

      {pkg.nodes.map((node) => (
        <NodeSection
          key={node.section_key}
          sourceId={sourceId}
          node={node}
          questions={pkg.questions.filter(
            (q) => q.section_key === node.section_key,
          )}
          busy={busy}
          act={act}
          editing={editing}
          onEdit={(q) => setEditing(q.question_id)}
          renderEditor={(q) =>
            renderEditor(
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
            )
          }
        />
      ))}

      {s.accepted > 0 && (
        <div className="flex justify-end">
          <Button
            leadingIcon={<CheckCircle2 size={16} />}
            loading={busy === "approve"}
            onClick={() =>
              act("approve", async () => {
                const next = await sourcesService.approveBank(sourceId);
                onApproved();
                return next;
              })
            }
          >
            Approve {s.accepted} accepted questions and run the chapter
          </Button>
        </div>
      )}
    </div>
  );
}
