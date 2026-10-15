"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle, BookOpen, CheckCircle2, ChevronDown, ClipboardList, FileWarning, Images, Loader2, PenLine, ShieldCheck,
  Upload, UserRound, Wrench, X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { parseReport, summarizeReport, type ReportProblem, type ReportQuestion } from "../utils/reportSummary";
import { NEXT_STEP_COPY, UPLOAD_STEPS } from "../utils/ingestionPath";
import type { Subject } from "../store/usePartnerStore";
import type { NextStep } from "../types/sources";

interface SourceReportModalProps {
  /** The chapter whose report to show; null keeps the popup closed. */
  subject: Subject | null;
  onClose: () => void;
  /** The next step's actions, so the report ends in what to do (the server's `outcome`), not only what failed. */
  onAddQuestions?: (subject: Subject) => void;
  onUploadAgain?: (subject: Subject) => void;
  onReviewVisuals?: (subject: Subject) => void;
  onReviewRelease?: (subject: Subject) => void;
}

/** react-markdown hands each component its AST `node`; it must not reach the DOM. */
type Passed<T> = T & { node?: unknown };
const dom = <T extends object>(props: Passed<T>): T => {
  const rest = { ...props };
  delete rest.node;
  return rest;
};

/** The raw report, for GenEd, styled to sit inside the portal. */
const MARKDOWN: Components = {
  h1: (p) => <h3 className="text-sm font-black text-[#122D30] mt-2 mb-2" {...dom(p)} />,
  h2: (p) => <h4 className="text-[11px] font-black uppercase tracking-widest text-[#122D30]/60 mt-5 mb-2" {...dom(p)} />,
  h3: (p) => <h5 className="text-xs font-black text-[#122D30]/70 mt-4 mb-1" {...dom(p)} />,
  p: (p) => <p className="text-xs leading-relaxed text-[#122D30]/75 my-1.5" {...dom(p)} />,
  ul: (p) => <ul className="list-disc pl-5 space-y-0.5 text-xs text-[#122D30]/75" {...dom(p)} />,
  ol: (p) => <ol className="list-decimal pl-5 space-y-0.5 text-xs text-[#122D30]/75" {...dom(p)} />,
  li: (p) => <li className="break-words" {...dom(p)} />,
  code: (p) => <code className="font-mono text-[11px] bg-[#075E63]/5 rounded px-1 py-px break-all" {...dom(p)} />,
  pre: (p) => <pre className="text-[11px] bg-[#075E63]/5 rounded-xl p-3 overflow-x-auto" {...dom(p)} />,
  table: (p) => <table className="text-xs border-collapse my-2" {...dom(p)} />,
  th: (p) => <th className="border border-[#122D30]/10 px-2 py-1 text-left" {...dom(p)} />,
  td: (p) => <td className="border border-[#122D30]/10 px-2 py-1" {...dom(p)} />,
};

const sectionTitle = "flex items-center gap-2 text-[11px] lg:text-xs font-black uppercase tracking-widest text-[#122D30]/50 mb-2";
const card = "rounded-2xl bg-white border border-[#122D30]/5";

export function SourceReportModal(props: SourceReportModalProps) {
  const { subject, onClose } = props;
  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      size="full"
      title={subject ? `Report for ${subject.title}` : "Report"}
      panelStyle={{ maxWidth: "min(920px, 100%)", background: "#F6F7F2" }}
    >
      {/* Keyed so each chapter's report starts from an empty, loading state. */}
      {subject && <ReportBody key={subject.source_id} {...props} subject={subject} />}
    </Modal>
  );
}

const TONE = {
  action: { box: "border-[#075E63]/20 bg-[#075E63]/5", icon: "text-[#075E63]" },
  problem: { box: "border-red-200 bg-red-50/70", icon: "text-red-600" },
  info: { box: "border-[#122D30]/10 bg-white", icon: "text-[#122D30]/50" },
  done: { box: "border-emerald-200 bg-emerald-50/70", icon: "text-emerald-600" },
} as const;

/** Where the chapter stands and its one action, first: the server's next step (the row says the same). */
function Outcome({ subject, onClose, onAddQuestions, onUploadAgain, onReviewVisuals, onReviewRelease }: SourceReportModalProps & { subject: Subject }) {
  const step: NextStep | undefined =
    subject.outcome?.next_step ?? (subject.state === "ready" ? (subject.release?.state === "published" ? "none" : "review_release") : undefined);
  if (!step || step === "wait" || step === "start") return null;
  const copy = NEXT_STEP_COPY[step];
  const act = (fn?: (s: Subject) => void) => (fn ? () => { onClose(); fn(subject); } : undefined);
  const action =
    step === "review_release" ? { label: "Review & publish", icon: <ShieldCheck size={16} />, run: act(onReviewRelease) }
    : step === "add_questions" ? { label: "Add questions", icon: <PenLine size={16} />, run: act(onAddQuestions) }
    : UPLOAD_STEPS.has(step) ? { label: "Upload again", icon: <Upload size={16} />, run: act(onUploadAgain) }
    : step === "review_visuals" ? { label: "Review pictures", icon: <Images size={16} />, run: act(onReviewVisuals) }
    : null;
  const tone = TONE[copy.tone];
  return (
    <section aria-label="What to do next" className={`flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center ${tone.box}`}>
      <span className={`shrink-0 ${tone.icon}`} aria-hidden>
        {copy.tone === "problem" ? <AlertTriangle size={22} /> : copy.tone === "done" ? <CheckCircle2 size={22} /> : <ClipboardList size={22} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-[#122D30]/50">What to do next</p>
        <p className="text-[15px] lg:text-base font-black text-[#122D30]">{copy.title}</p>
        <p className="text-xs lg:text-[13px] text-[#122D30]/70">{copy.body}</p>
      </div>
      {action?.run && (
        <Button pill leadingIcon={action.icon} onClick={action.run}>
          {action.label}
        </Button>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | undefined; sub?: string | null }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <dt className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-[#122D30]/40">{label}</dt>
      <dd className="text-2xl font-black tabular-nums text-[#122D30]">{value ?? "—"}</dd>
      {sub && <dd className="text-[11px] text-[#122D30]/55">{sub}</dd>}
    </div>
  );
}

function Problem({ problem }: { problem: ReportProblem }) {
  const yours = problem.fixedBy === "you";
  return (
    <li className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${yours ? "border-amber-200 bg-amber-50/70" : "border-[#122D30]/10 bg-white"}`}>
      <span className={`mt-0.5 shrink-0 ${yours ? "text-amber-600" : "text-[#122D30]/40"}`} aria-hidden>
        {yours ? <UserRound size={18} /> : <ShieldCheck size={18} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-[#122D30] leading-snug">{problem.text}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">
          {yours ? "You can fix this" : "GenEd will look at this"}
          {problem.count > 1 ? ` · ${problem.count} times` : ""}
        </p>
      </div>
    </li>
  );
}

/** A section of what the run made, closed until asked for, with how many it holds. */
function Disclosure({ title, count, hint, children }: { title: string; count: number; hint?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = `report-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={card}>
      {/* eslint-disable-next-line no-restricted-syntax -- a full-width disclosure header, not a sized action button */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        disabled={count === 0}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left hover:bg-[#075E63]/[0.03] disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075E63]/40"
      >
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold ${count ? "text-[#122D30]" : "text-[#122D30]/40"}`}>{title}</span>
          {hint && <span className="block text-[11px] text-[#122D30]/50">{hint}</span>}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums ${count ? "bg-[#075E63]/10 text-[#075E63]" : "bg-[#122D30]/5 text-[#122D30]/35"}`}>{count}</span>
        {count > 0 && <ChevronDown size={18} aria-hidden className={`shrink-0 text-[#122D30]/50 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && count > 0 && (
        <div id={id} className="border-t border-[#122D30]/5 px-4 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

function QuestionList({ items }: { items: ReportQuestion[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((q, i) => (
        <li key={i} className="text-[13px] leading-snug text-[#122D30]">
          <p>{q.prompt}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-[#122D30]/55">
            {q.answer && <span>Answer: <b className="font-semibold text-[#075E63]">{q.answer}</b></span>}
            {q.note && <span>{q.note}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}

const RESOLUTION: Record<string, { label: string; cls: string }> = {
  novel: { label: "New", cls: "bg-[#075E63]/10 text-[#075E63]" },
  match: { label: "Already in GenEd", cls: "bg-[#122D30]/5 text-[#122D30]/60" },
  same_as: { label: "Merged", cls: "bg-[#122D30]/5 text-[#122D30]/60" },
};

/**
 * A run's review report, for its partner: where the chapter stands and what to do, the headline numbers, the checks
 * (and who fixes each), pages to look at, then everything the run made, section by section, closed until asked
 * for. The operator's raw report stays at the end under technical details.
 */
function ReportBody(props: SourceReportModalProps & { subject: Subject }) {
  const { subject, onClose } = props;
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [technical, setTechnical] = useState(false);
  const sourceId = subject.source_id;

  useEffect(() => {
    let cancelled = false;
    sourcesService
      .report(sourceId)
      .then((text) => !cancelled && setReport(text))
      .catch((e) => !cancelled && setError(asError(e).message || "Couldn't load the report."));
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const findings = subject.outcome?.findings;
  const summary = useMemo(
    () => (report ? summarizeReport(report, Object.fromEntries((findings ?? []).map((f) => [f.check, f.owner]))) : null),
    [report, findings],
  );
  const parsed = useMemo(() => (report ? parseReport(report) : null), [report]);
  const fresh = parsed?.concepts.filter((c) => c.resolution === "novel").length ?? 0;
  const known = (parsed?.concepts.length ?? 0) - fresh;

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 flex items-start gap-4 px-5 md:px-7 pt-6 pb-4 bg-white border-b border-[#122D30]/5">
        <div className="h-11 w-11 lg:h-12 lg:w-12 shrink-0 rounded-2xl bg-[#075E63] text-white flex items-center justify-center">
          <ClipboardList size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-[#122D30]/40">Ingestion report</p>
          <h2 className="text-lg md:text-xl lg:text-2xl font-black text-[#122D30] tracking-tight truncate">{subject.title}</h2>
          <p className="text-[11px] lg:text-xs font-bold text-[#122D30]/50 uppercase tracking-wider truncate">
            {subject.book_title} · Ch {subject.chapter_ordinal} · Grade {subject.grade} · {subject.subject}
          </p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </Button>
      </header>

      <div className="flex-1 px-5 md:px-7 py-5 flex flex-col gap-6">
        {error ? (
          <p role="alert" className="text-sm font-bold text-[#122D30]/70 py-10 text-center">{error}</p>
        ) : !report || !parsed ? (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#122D30]/40 py-10">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading the report…
          </p>
        ) : (
          <>
            <Outcome {...props} />

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Concepts" value={parsed.concepts.length || summary?.counts.concepts} sub={parsed.concepts.length ? `${fresh} new · ${known} already in GenEd` : null} />
              <Stat label="Questions" value={parsed.questions.length || summary?.counts.questions} sub={parsed.variants.length ? `+ ${parsed.variants.length} number-changed ${parsed.variants.length === 1 ? "version" : "versions"}` : null} />
              <Stat label="Lesson steps" value={summary?.counts.steps} />
              <Stat label="Figures" value={parsed.figures.length || undefined} sub={parsed.figures.length ? "redrawn by GenEd" : null} />
            </dl>

            <section aria-label="Checks">
              <h3 className={sectionTitle}><ShieldCheck size={14} aria-hidden /> Checks</h3>
              {summary && summary.problems.length > 0 ? (
                <ul className="flex flex-col gap-2" aria-label="What needs attention">
                  {summary.problems.map((p) => <Problem key={p.code} problem={p} />)}
                </ul>
              ) : parsed.passed ? (
                <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-[#122D30]">
                  <CheckCircle2 size={18} aria-hidden className="shrink-0 text-emerald-600" />
                  Every check passed.
                  {parsed.warnings > 0 && <span className="text-[#122D30]/55"> {parsed.warnings} minor {parsed.warnings === 1 ? "note" : "notes"} for GenEd.</span>}
                </p>
              ) : (
                // A report without a validation result says nothing about the checks, so neither does this.
                <p className={`${card} px-4 py-3 text-sm text-[#122D30]/60`}>This report doesn&apos;t include the checks&apos; result.</p>
              )}
            </section>

            {(parsed.unreadablePages.length > 0 || parsed.visualCheck.length > 0) && (
              <section aria-label="Pages to look at">
                <h3 className={sectionTitle}><FileWarning size={14} aria-hidden /> Pages to look at</h3>
                <div className={`${card} flex flex-col gap-3 px-4 py-3`}>
                  {parsed.unreadablePages.length > 0 && (
                    <p className="text-sm text-[#122D30]">
                      <b>{parsed.unreadablePages.length === 1 ? "Page" : "Pages"} {parsed.unreadablePages.join(", ")} couldn&apos;t be read</b>
                      <span className="text-[#122D30]/60"> and {parsed.unreadablePages.length === 1 ? "is" : "are"} missing from this run. Check {parsed.unreadablePages.length === 1 ? "it" : "them"} before you publish.</span>
                    </p>
                  )}
                  {parsed.visualCheck.length > 0 && (
                    <div>
                      <p className="text-sm text-[#122D30]">
                        <b>Some text was hard to read.</b>
                        <span className="text-[#122D30]/60"> Compare it with the page:</span>
                      </p>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {parsed.visualCheck.map((v, i) => (
                          <li key={i} className="flex gap-2 text-[12px] text-[#122D30]/75">
                            <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">p. {v.page}</span>
                            <span className="min-w-0">{v.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section aria-label="What the run made" className="flex flex-col gap-2">
              <h3 className={sectionTitle}><BookOpen size={14} aria-hidden /> What the run made</h3>
              <Disclosure title="Concepts" count={parsed.concepts.length} hint="What the chapter teaches, as GenEd will track it">
                <ul className="flex flex-col gap-2.5">
                  {parsed.concepts.map((c, i) => (
                    <li key={i} className="text-[13px] leading-snug text-[#122D30]">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        {c.title}
                        <span className={`rounded-full px-2 py-px text-[10px] font-black ${(RESOLUTION[c.resolution] ?? RESOLUTION.match).cls}`}>{(RESOLUTION[c.resolution] ?? RESOLUTION.match).label}</span>
                        {c.lo && <span className="text-[11px] font-semibold text-[#122D30]/45">{c.lo}</span>}
                      </p>
                      <p className="text-[12px] text-[#122D30]/65">{c.definition}</p>
                    </li>
                  ))}
                </ul>
              </Disclosure>
              <Disclosure title="Practice questions" count={parsed.questions.length} hint="From the chapter's exercises, each answer checked twice">
                <QuestionList items={parsed.questions} />
              </Disclosure>
              <Disclosure title="Number-changed versions" count={parsed.variants.length} hint="Made from a printed question for a second try">
                <QuestionList items={parsed.variants} />
              </Disclosure>
              <Disclosure title="Removed by the answer check" count={parsed.removed.length} hint="A second, independent check didn't get the same answer">
                <QuestionList items={parsed.removed} />
              </Disclosure>
              <Disclosure title="Skipped questions" count={parsed.skipped.length} hint="Questions GenEd can't mark on its own">
                <ul className="flex flex-col gap-2">
                  {parsed.skipped.map((q, i) => (
                    <li key={i} className="text-[13px] leading-snug text-[#122D30]">
                      {q.prompt}
                      {q.reason && <span className="ml-2 text-[11px] text-[#122D30]/50">{q.reason}</span>}
                    </li>
                  ))}
                </ul>
              </Disclosure>
              <Disclosure title="Waiting for a picture" count={parsed.held.length} hint="Shown once you accept their redrawn pictures">
                <ul className="flex flex-col gap-2 text-[13px] text-[#122D30]">
                  {parsed.held.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </Disclosure>
              <Disclosure title="Figures" count={parsed.figures.length} hint="Textbook figures are never published; GenEd redraws them">
                <ul className="flex flex-col gap-2">
                  {parsed.figures.map((f, i) => (
                    <li key={i} className="text-[12.5px] leading-snug text-[#122D30]">
                      <span className="mr-2 rounded-md bg-[#122D30]/5 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#122D30]/60">{f.role}</span>
                      {f.reason}
                      {f.target && <span className="block text-[11px] text-[#122D30]/50">{f.target}</span>}
                    </li>
                  ))}
                </ul>
              </Disclosure>
            </section>

            <section aria-label="Technical details">
              <Button size="sm" variant="outline" pill aria-expanded={technical} leadingIcon={<Wrench size={14} aria-hidden />} onClick={() => setTechnical((v) => !v)}>
                {technical ? "Hide technical details" : "Technical details for GenEd"}
                <ChevronDown size={14} aria-hidden className={`transition-transform ${technical ? "rotate-180" : ""}`} />
              </Button>
              {technical && (
                <div className={`${card} mt-2 overflow-x-auto px-4 py-3`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>
                    {report}
                  </ReactMarkdown>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
