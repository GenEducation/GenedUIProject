"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, ClipboardList, Loader2, ShieldCheck, UserRound, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { summarizeReport, type ReportProblem } from "../utils/reportSummary";
import type { Subject } from "../store/usePartnerStore";

interface SourceReportModalProps {
  /** The chapter whose report to show; null keeps the popup closed. */
  subject: Subject | null;
  onClose: () => void;
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
  h1: (p) => <h3 className="text-base font-black text-[#1A3D2C] mt-2 mb-2" {...dom(p)} />,
  h2: (p) => <h4 className="text-xs font-black uppercase tracking-widest text-[#1A3D2C]/60 mt-5 mb-2" {...dom(p)} />,
  h3: (p) => <h5 className="text-xs font-black text-[#1A3D2C]/70 mt-4 mb-1" {...dom(p)} />,
  p: (p) => <p className="text-xs leading-relaxed text-[#1A3D2C]/75 my-1.5" {...dom(p)} />,
  ul: (p) => <ul className="list-disc pl-5 space-y-0.5 text-xs text-[#1A3D2C]/75" {...dom(p)} />,
  ol: (p) => <ol className="list-decimal pl-5 space-y-0.5 text-xs text-[#1A3D2C]/75" {...dom(p)} />,
  li: (p) => <li className="break-words" {...dom(p)} />,
  code: (p) => <code className="font-mono text-[11px] bg-[#1A3D2C]/5 rounded px-1 py-px break-all" {...dom(p)} />,
  pre: (p) => <pre className="text-[11px] bg-[#1A3D2C]/5 rounded-xl p-3 overflow-x-auto" {...dom(p)} />,
  table: (p) => <table className="text-xs border-collapse my-2" {...dom(p)} />,
  th: (p) => <th className="border border-[#1A3D2C]/10 px-2 py-1 text-left" {...dom(p)} />,
  td: (p) => <td className="border border-[#1A3D2C]/10 px-2 py-1" {...dom(p)} />,
};

function Problem({ problem }: { problem: ReportProblem }) {
  const yours = problem.fixedBy === "you";
  return (
    <li className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${yours ? "border-amber-200 bg-amber-50/70" : "border-[#1A3D2C]/10 bg-white"}`}>
      <span className={`mt-0.5 shrink-0 ${yours ? "text-amber-600" : "text-[#1A3D2C]/40"}`} aria-hidden>
        {yours ? <UserRound size={16} /> : <ShieldCheck size={16} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-[#1A3D2C] leading-snug">{problem.text}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">
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
export function SourceReportModal({ subject, onClose }: SourceReportModalProps) {
  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      size="full"
      title={subject ? `Report for ${subject.title}` : "Report"}
      panelStyle={{ maxWidth: "min(880px, 100%)", background: "#F8F9F8" }}
    >
      {/* Keyed so each chapter's report starts from an empty, loading state. */}
      {subject && <ReportBody key={subject.source_id} subject={subject} onClose={onClose} />}
    </Modal>
  );
}

function ReportBody({ subject, onClose }: { subject: Subject; onClose: () => void }) {
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

  const summary = useMemo(() => (report ? summarizeReport(report) : null), [report]);
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
      <header className="shrink-0 flex items-start gap-4 px-5 md:px-7 pt-6 pb-4 bg-white border-b border-[#1A3D2C]/5">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#1A3D2C] text-white flex items-center justify-center">
          <ClipboardList size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">Ingestion report</p>
          <h2 className="text-lg md:text-xl font-black text-[#1A3D2C] tracking-tight truncate">{subject.title}</h2>
          <p className="text-[11px] font-bold text-[#1A3D2C]/50 uppercase tracking-wider truncate">
            {subject.book_title} · Ch {subject.chapter_ordinal} · Grade {subject.grade} · {subject.subject}
          </p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </Button>
      </header>

      <div className="flex-1 px-5 md:px-7 py-5 flex flex-col gap-5">
        {error ? (
          <p role="alert" className="text-sm font-bold text-[#1A3D2C]/70 py-10 text-center">{error}</p>
        ) : !report ? (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#1A3D2C]/40 py-10">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading the report…
          </p>
        ) : (
          <>
            {stats.length > 0 && (
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stats.map(([label, n]) => (
                  <div key={label} className="rounded-2xl bg-white border border-[#1A3D2C]/5 px-4 py-3">
                    <dt className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">{label}</dt>
                    <dd className="text-xl font-black text-[#1A3D2C] tabular-nums">{n}</dd>
                  </div>
                ))}
              </dl>
            )}

            <section aria-label="What needs attention">
              <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/50 mb-2">
                <AlertTriangle size={12} aria-hidden /> What needs attention
              </h3>
              {summary && summary.problems.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {summary.problems.map((p) => (
                    <Problem key={p.code} problem={p} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#1A3D2C]/70 rounded-2xl bg-white border border-[#1A3D2C]/5 px-4 py-3">
                  Nothing failed the checks. The chapter&apos;s content is waiting for an admin to review it.
                </p>
              )}
            </section>

            <details className="rounded-2xl bg-white border border-[#1A3D2C]/5 px-4 py-3 group">
              <summary className="cursor-pointer text-xs font-black text-[#1A3D2C]/60 hover:text-[#1A3D2C] select-none">
                Full technical report
              </summary>
              <div className="mt-3 border-t border-[#1A3D2C]/5 pt-3 overflow-x-auto">
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
