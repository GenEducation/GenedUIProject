"use client";

import React from "react";
import { AlertCircle, Check, Circle, Cog, FileText, Images, Loader2, Minus, PenLine, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Subject } from "../store/usePartnerStore";
import {
  ATTENTION_COUNTS,
  NEXT_STEP_COPY,
  UPLOAD_STEPS,
  checkLabel,
  COUNT_LABELS,
  elapsed,
  milestones,
  pathSteps,
  shortTime,
  type Milestone,
  type PathStep,
} from "../utils/ingestionPath";

const sectionTitle = "text-[10px] font-black text-[#122D30]/50 uppercase tracking-widest mb-2";

function StatusDot({ status }: { status: PathStep["status"] | Milestone["status"] }) {
  const base = "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border";
  if (status === "done") return <span className={`${base} border-[#075E63] bg-[#075E63] text-white`}><Check size={11} aria-hidden /></span>;
  if (status === "current") return <span className={`${base} border-[#075E63] bg-white text-[#075E63]`}><Loader2 size={11} aria-hidden className="motion-safe:animate-spin" /></span>;
  if (status === "skipped") return <span className={`${base} border-[#122D30]/15 bg-white text-[#122D30]/30`}><Minus size={11} aria-hidden /></span>;
  if (status === "stopped" || status === "problem") return <span className={`${base} border-red-400 bg-red-50 text-red-600`}><X size={11} aria-hidden /></span>;
  return <span className={`${base} border-[#122D30]/15 bg-white text-[#122D30]/20`}><Circle size={6} aria-hidden /></span>;
}

const STATUS_WORDS: Record<PathStep["status"] | Milestone["status"], string> = {
  done: "done",
  current: "in progress",
  stopped: "stopped here",
  problem: "needs attention",
  pending: "not started",
  not_reached: "not reached",
  skipped: "skipped",
};

function MilestoneRow({ m }: { m: Milestone }) {
  return (
    <li className="flex items-start gap-2.5">
      <StatusDot status={m.status} />
      <div className="min-w-0">
        <p className={`text-xs font-bold ${m.status === "pending" ? "text-[#122D30]/40" : "text-[#122D30]"}`}>
          {m.label}
          <span className="sr-only"> ({STATUS_WORDS[m.status]})</span>
          {m.at && <span className="ml-2 font-semibold text-[#122D30]/40">{shortTime(m.at)}</span>}
        </p>
        {m.note && <p className={`text-[11px] ${m.status === "problem" ? "text-red-600/80" : "text-[#122D30]/60"}`}>{m.note}</p>}
      </div>
    </li>
  );
}

function StepRow({ step }: { step: PathStep }) {
  const muted = step.status === "pending" || step.status === "not_reached" || step.status === "skipped";
  return (
    <li className="flex items-start gap-2.5">
      <StatusDot status={step.status} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className={`text-xs font-bold ${muted ? "text-[#122D30]/40" : "text-[#122D30]"}`}>
            {step.label}
            <span className="sr-only"> ({STATUS_WORDS[step.status]})</span>
          </p>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-black uppercase tracking-wider ${
              step.kind === "ai" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-[#122D30]/10 bg-[#F6F7F2] text-[#122D30]/60"
            }`}
          >
            {step.kind === "ai" ? <Sparkles size={9} aria-hidden /> : <Cog size={9} aria-hidden />}
            {step.kind === "ai" ? "AI" : "Automatic"}
          </span>
          {step.startedAt && !muted && <span className="text-[10px] font-semibold text-[#122D30]/40">{shortTime(step.startedAt)}</span>}
        </div>
        <p className={`text-[11px] ${muted ? "text-[#122D30]/35" : "text-[#122D30]/60"}`}>
          {step.status === "skipped" ? "Skipped: the chapter did not pass its checks, so nothing was drawn." : step.does}
        </p>
        {(step.unitLine || step.counts.length > 0) && (
          <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={`${step.label}: what it produced`}>
            {step.unitLine && (
              <li className="rounded-md bg-[#075E63]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#075E63] tabular-nums">{step.unitLine}</li>
            )}
            {step.counts.map((c) => (
              <li
                key={c.name}
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  ATTENTION_COUNTS.has(c.name) && c.value > 0 ? "bg-amber-50 text-amber-800" : "bg-[#DCEBE7]/50 text-[#122D30]/80"
                }`}
              >
                {c.value} {COUNT_LABELS[c.name]}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#122D30]/40">{label}</dt>
      <dd className="break-words text-xs font-semibold text-[#122D30]">{children}</dd>
    </div>
  );
}

const NEXT_TONE = {
  action: "border-[#075E63]/20 bg-[#075E63]/5",
  problem: "border-red-200 bg-red-50/70",
  info: "border-[#122D30]/10 bg-white",
  done: "border-[#122D30]/10 bg-[#DCEBE7]/40",
} as const;

/** The server's next step for the chapter, the failed checks behind it and who can fix each. */
function NextStepBox({ subject, onUploadAgain, onReviewVisuals, onAddQuestions }: {
  subject: Subject;
  onUploadAgain?: () => void;
  onReviewVisuals?: () => void;
  onAddQuestions?: () => void;
}) {
  const outcome = subject.outcome;
  if (!outcome || outcome.next_step === "wait" || outcome.next_step === "start") return null;
  const copy = NEXT_STEP_COPY[outcome.next_step];
  const yours = outcome.findings.filter((f) => f.owner === "partner");
  const ours = outcome.findings.filter((f) => f.owner === "gened");
  return (
    <div role="note" aria-label="What to do next" className={`md:col-span-3 rounded-xl border p-3 ${NEXT_TONE[copy.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/50">What to do next</p>
          <p className="text-sm font-black text-[#122D30]">{copy.title}</p>
          <p className="text-[11px] text-[#122D30]/70">{copy.body}</p>
        </div>
        {outcome.next_step === "add_questions" && onAddQuestions && (
          <Button size="sm" pill leadingIcon={<PenLine size={13} />} onClick={onAddQuestions}>
            Add questions
          </Button>
        )}
        {UPLOAD_STEPS.has(outcome.next_step) && onUploadAgain && (
          <Button size="sm" pill variant={outcome.next_step === "add_questions" ? "outline" : undefined} leadingIcon={<Upload size={13} />} onClick={onUploadAgain}>
            Upload again
          </Button>
        )}
        {outcome.next_step === "review_visuals" && onReviewVisuals && (
          <Button size="sm" pill leadingIcon={<Images size={13} />} onClick={onReviewVisuals}>
            Review pictures
          </Button>
        )}
      </div>
      {(yours.length > 0 || ours.length > 0) && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Checks that did not pass">
          {yours.map((f) => (
            <li key={f.check} className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              {checkLabel(f.check)}{f.count > 1 ? ` (${f.count})` : ""} · you can fix this
            </li>
          ))}
          {ours.map((f) => (
            <li key={f.check} className="rounded-md bg-[#122D30]/5 px-1.5 py-0.5 text-[10px] font-bold text-[#122D30]/60" title={f.check}>
              {checkLabel(f.check)}{f.count > 1 ? ` (${f.count})` : ""} · GenEd will look at this
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The whole ingestion path of one chapter, for its partner: what is being ingested, every step the run takes (who
 * does it, when it started, what it produced) and where the result goes, up to students.
 */
export function IngestionPathPanel({ subject, onOpenReport, onUploadAgain, onReviewVisuals, onAddQuestions }: {
  subject: Subject;
  onOpenReport?: () => void;
  onUploadAgain?: () => void;
  onReviewVisuals?: () => void;
  onAddQuestions?: () => void;
}) {
  const steps = pathSteps(subject.state, subject.progress);
  const { before, after } = milestones(subject);
  const pages = subject.last_pdf_page - subject.first_pdf_page + 1;
  const cut = subject.excluded_pages && subject.excluded_pages.status !== "included" ? subject.excluded_pages : null;
  const aiCalls = subject.progress?.counts?.model_calls;
  const took = elapsed(subject.started_at, subject.state === "running" ? subject.progress?.updated_at ?? null : subject.finished_at);
  const visualsSent = subject.visuals?.submitted ?? 0;
  const ranBefore = subject.progress && subject.state !== "running";

  return (
    <section
      aria-label={`${subject.title}: ingestion path`}
      onClick={(e) => e.stopPropagation()}
      className="mx-1 mb-1 -mt-1 grid gap-4 rounded-b-2xl border border-t-0 border-[#122D30]/5 bg-[#F6F7F2]/70 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]"
    >
      <NextStepBox subject={subject} onUploadAgain={onUploadAgain} onReviewVisuals={onReviewVisuals} onAddQuestions={onAddQuestions} />

      {/* WHAT */}
      <div>
        <h4 className={sectionTitle}>What is being ingested</h4>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          <div className="col-span-2 min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#122D30]/40">File</dt>
            <dd className="flex items-center gap-1 truncate text-xs font-semibold text-[#122D30]">
              <FileText size={12} aria-hidden className="shrink-0 text-[#122D30]/40" />
              <span className="truncate">{subject.pdf_file_name}</span>
            </dd>
          </div>
          <Fact label="Book">{subject.book_title}</Fact>
          <Fact label="Edition">{subject.edition_label}</Fact>
          <Fact label="Chapter">{`${subject.chapter_ordinal}. ${subject.title}`}</Fact>
          <Fact label="Pages read">{`PDF pages ${subject.first_pdf_page}–${subject.last_pdf_page} (${pages})`}</Fact>
          <Fact label="Subject">{`${subject.subject} · Grade ${subject.grade}`}</Fact>
          <Fact label="Board">{subject.board}</Fact>
          <Fact label="Strand">{subject.strand}</Fact>
          <Fact label="Learning outcomes">{subject.lo_codes.length || "None chosen"}</Fact>
        </dl>
        {cut && (
          <p className="mt-2 flex items-start gap-1 text-[11px] text-amber-800">
            <AlertCircle size={12} aria-hidden className="mt-px shrink-0" />
            Pages {cut.first_page}–{cut.last_page} left out as the solutions appendix
            {cut.status === "pending" ? " (waiting for your answer)" : ""}.
          </p>
        )}
      </div>

      {/* HOW */}
      <div>
        <h4 className={sectionTitle}>
          How it is processed
          {ranBefore && <span className="ml-2 normal-case tracking-normal font-semibold text-[#122D30]/40">last run</span>}
        </h4>
        <ol className="space-y-2.5" aria-label="Ingestion steps">
          {before.map((m) => <MilestoneRow key={m.key} m={m} />)}
          {steps.map((s) => <StepRow key={s.stage} step={s} />)}
        </ol>
        <p className="mt-3 text-[10px] text-[#122D30]/50">
          <Sparkles size={9} aria-hidden className="mr-1 inline text-violet-600" />
          AI steps only propose content; nothing reaches students until you review and publish it.
          {typeof aiCalls === "number" && ` ${aiCalls} AI requests so far.`}
          {took && ` ${subject.state === "running" ? "Running for" : "Took"} ${took}.`}
        </p>
      </div>

      {/* WHERE */}
      <div>
        <h4 className={sectionTitle}>Where it goes</h4>
        <ol className="space-y-2.5" aria-label="Where the result goes">
          <MilestoneRow
            m={{ key: "stored", label: "Your PDF", at: null, status: "done", note: "Stored privately on GenEd's servers; only you and GenEd admins can open it." }}
          />
          {after.map((m) => <MilestoneRow key={m.key} m={m} />)}
        </ol>
        {visualsSent > 0 && (
          <p className="mt-2 text-[11px] text-[#122D30]/60">
            {visualsSent} teaching {visualsSent === 1 ? "visual" : "visuals"} sent to your visual library for review.
          </p>
        )}
        {subject.has_report && onOpenReport && (
          // eslint-disable-next-line no-restricted-syntax -- inline text link, not a sized action button
          <button
            type="button"
            onClick={onOpenReport}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-[#122D30] underline decoration-[#122D30]/30 underline-offset-2 hover:decoration-[#122D30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#122D30]/40 rounded"
          >
            <FileText size={12} aria-hidden /> Full report of this run
          </button>
        )}
      </div>
    </section>
  );
}
