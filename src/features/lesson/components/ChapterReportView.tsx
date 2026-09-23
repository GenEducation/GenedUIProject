"use client";

import type { ChapterReport } from "../types/lesson";

const STATUS_COPY: Record<string, string> = {
  measured: "Measured",
  not_fully_measurable: "Not fully measured",
  uncovered: "Not covered",
};

export function ChapterReportView({ report }: { report: ChapterReport }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold text-slate-800">Chapter complete 🎉</h2>
      <p className="text-sm text-slate-500">
        {report.nodes_done} of {report.nodes_total} parts finished.
      </p>
      <div className="flex flex-col gap-2">
        {report.outcomes.map((o) => (
          <div key={o.lo_id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-sm font-medium text-slate-800">{o.title}</p>
              <p className="text-xs text-slate-400">{o.code}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                o.mastered ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {o.mastered ? "Mastered" : STATUS_COPY[o.status] ?? o.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
