"use client";

import type { ChapterReport } from "../types/lesson";

const STATUS_COPY: Record<string, string> = {
  measured: "Measured",
  not_fully_measurable: "Not fully measured",
  uncovered: "Not covered",
};

export function ChapterReportView({ report }: { report: ChapterReport }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6 sm:p-10">
      <div>
        <h2 className="text-xl font-black text-[var(--primary-ink)]">Chapter complete 🎉</h2>
        <p className="text-sm text-[#94A3B8]">{report.nodes_done} of {report.nodes_total} parts finished.</p>
      </div>
      <div className="flex flex-col gap-2">
        {report.outcomes.map((o) => (
          <div
            key={o.lo_id}
            className="flex items-center justify-between rounded-2xl border border-[rgba(4,46,92,0.06)] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(4,46,92,0.04)]"
          >
            <div>
              <p className="text-sm font-semibold text-[var(--primary-ink)]">{o.title}</p>
              <p className="text-xs text-[#94A3B8]">{o.code}</p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold"
              style={
                o.mastered
                  ? { background: "rgba(5,159,109,0.1)", color: "var(--primary)" }
                  : { background: "#F1F5F9", color: "#64748B" }
              }
            >
              {o.mastered ? "Mastered" : STATUS_COPY[o.status] ?? o.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
