"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, ClipboardList, Images, Loader2, PenLine, ShieldCheck, Upload, UserRound, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { summarizeReport, type ReportProblem } from "../utils/reportSummary";
import { NEXT_STEP_COPY, UPLOAD_STEPS } from "../utils/ingestionPath";
import type { Subject } from "../store/usePartnerStore";

interface SourceReportModalProps {
  /** The chapter whose report to show; null keeps the popup closed. */
  subject: Subject | null;
  onClose: () => void;
  /** The next step's actions, so the report ends in what to do (the server's `outcome`), not only what failed. */
  onAddQuestions?: (subject: Subject) => void;
  onUploadAgain?: (subject: Subject) => void;
  onReviewVisuals?: (subject: Subject) => void;
}

/** react-markdown hands each component its AST `node`; it must not reach the DOM. */
type Passed<T> = T & { node?: unknown };
const dom = <T extends object>(props: Passed<T>): T => {
  const rest = { ...props };
  delete rest.node;
  return rest;
};

/** The full report, styled to sit inside the partner portal rather than as raw Markdown. */
const MARKDOWN: Components = {
  h1: (p) => <h3 className="text-base font-black text-[#122D30] mt-2 mb-2" {...dom(p)} />,
  h2: (p) => <h4 className="text-xs font-black uppercase tracking-widest text-[#122D30]/60 mt-5 mb-2" {...dom(p)} />,
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

function Problem({ problem }: { problem: ReportProblem }) {
  const yours = problem.fixedBy === "you";
  return (
    <li className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${yours ? "border-amber-200 bg-amber-50/70" : "border-[#122D30]/10 bg-white"}`}>
      <span className={`mt-0.5 shrink-0 ${yours ? "text-amber-600" : "text-[#122D30]/40"}`} aria-hidden>
        {yours ? <UserRound size={16} /> : <ShieldCheck size={16} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-[#122D30] leading-snug">{problem.text}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">
          {yours ? "You can fix this" : "For a GenEd admin"} · {problem.code}
          {problem.count > 1 ? ` · ${problem.count}×` : ""}
        </p>
      </div>
    </li>
  );
}

/**
 * Why a chapter didn't pass checks, read from the run's review report: a
 * plain summary first (what to fix, and who fixes it), then the full report
 * for anyone who wants the detail.
 */
export function SourceReportModal(props: SourceReportModalProps) {
  const { subject, onClose } = props;
  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      size="full"
      title={subject ? `Report for ${subject.title}` : "Report"}
      panelStyle={{ maxWidth: "min(880px, 100%)", background: "#F6F7F2" }}
    >
      {/* Keyed so each chapter's report starts from an empty, loading state. */}
      {subject && <ReportBody key={subject.source_id} {...props} subject={subject} />}
    </Modal>
  );
}

/** The server's decision for the chapter, with its one action; the same box the ingestion path shows. */
function NextStep({ subject, onClose, onAddQuestions, onUploadAgain, onReviewVisuals }: SourceReportModalProps & { subject: Subject }) {
  const step = subject.outcome?.next_step;
  if (!step || step === "wait" || step === "start" || step === "none") return null;
  const copy = NEXT_STEP_COPY[step];
  const act = (fn?: (s: Subject) => void) => (fn ? () => { onClose(); fn(subject); } : undefined);
  const action =
    step === "add_questions" ? { label: "Add questions", icon: <PenLine size={14} />, run: act(onAddQuestions) }
    : UPLOAD_STEPS.has(step) ? { label: "Upload again", icon: <Upload size={14} />, run: act(onUploadAgain) }
    : step === "review_visuals" ? { label: "Review pictures", icon: <Images size={14} />, run: act(onReviewVisuals) }
    : null;
  return (
    <section aria-label="What to do next" className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/50">
          {subject.state === "invalid" ? "Why it didn't pass, and what to do" : "What to do next"}
        </p>
        <p className="text-sm font-black text-[#122D30]">{copy.title}</p>
        <p className="text-xs text-[#122D30]/70">{copy.body}</p>
      </div>
      {action?.run && (
        <Button size="sm" leadingIcon={action.icon} onClick={action.run}>
          {action.label}
        </Button>
      )}
    </section>
  );
}

function ReportBody(props: SourceReportModalProps & { subject: Subject }) {
  const { subject, onClose } = props;
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  const counts = summary?.counts;
  const stats = counts
    ? ([
        ["Sections", counts.sections],
        ["Concepts", counts.concepts],
        ["Questions", counts.questions],
        ["Lesson steps", counts.steps],
      ] as const).filter(([, n]) => n !== undefined)
    : [];

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 flex items-start gap-4 px-5 md:px-7 pt-6 pb-4 bg-white border-b border-[#122D30]/5">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#075E63] text-white flex items-center justify-center">
          <ClipboardList size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">Ingestion report</p>
          <h2 className="text-lg md:text-xl font-black text-[#122D30] tracking-tight truncate">{subject.title}</h2>
          <p className="text-[11px] font-bold text-[#122D30]/50 uppercase tracking-wider truncate">
            {subject.book_title} · Ch {subject.chapter_ordinal} · Grade {subject.grade} · {subject.subject}
          </p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </Button>
      </header>

      <div className="flex-1 px-5 md:px-7 py-5 flex flex-col gap-5">
        {error ? (
          <p role="alert" className="text-sm font-bold text-[#122D30]/70 py-10 text-center">{error}</p>
        ) : !report ? (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#122D30]/40 py-10">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading the report…
          </p>
        ) : (
          <>
            <NextStep {...props} />
            {stats.length > 0 && (
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stats.map(([label, n]) => (
                  <div key={label} className="rounded-2xl bg-white border border-[#122D30]/5 px-4 py-3">
                    <dt className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">{label}</dt>
                    <dd className="text-xl font-black text-[#122D30] tabular-nums">{n}</dd>
                  </div>
                ))}
              </dl>
            )}

            <section aria-label="What needs attention">
              <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#122D30]/50 mb-2">
                <AlertTriangle size={12} aria-hidden /> What needs attention
              </h3>
              {summary && summary.problems.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {summary.problems.map((p) => (
                    <Problem key={p.code} problem={p} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#122D30]/70 rounded-2xl bg-white border border-[#122D30]/5 px-4 py-3">
                  Nothing failed the checks. The chapter&apos;s content is waiting for an admin to review it.
                </p>
              )}
            </section>

            <details className="rounded-2xl bg-white border border-[#122D30]/5 px-4 py-3 group">
              <summary className="cursor-pointer text-xs font-black text-[#122D30]/60 hover:text-[#122D30] select-none">
                Full technical report
              </summary>
              <div className="mt-3 border-t border-[#122D30]/5 pt-3 overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>
                  {report}
                </ReactMarkdown>
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
