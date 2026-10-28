"use client";

import { useCallback, useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { SourceIngestion } from "../adminService";
import { fetchAllIngestions, INGESTIONS_FETCH_CAP } from "../fetchAllIngestions";
import { DataTable, Column } from "./DataTable";
import { StatusPill, statusTone } from "./ui/StatusPill";

/**
 * Ingestions as the new backend has them: a partner's chapter and the run that
 * ingests it.
 *
 * The columns are not the old screen's. There is no chunk count here and no
 * document type, and there is a run state, a stage and a progress percent that
 * the MVP's table had no column for. Mapping one onto the other would have
 * meant inventing numbers, so the screen says what this backend actually knows.
 */

/**
 * A run's position. The percent is the run's only while it is running; afterwards (or while a new run is queued)
 * it is where the last run stopped, so only the stage is shown.
 */
export function progressText(row: Pick<SourceIngestion, "state" | "progress">): string {
  if (!row.progress) return row.state === "registered" ? "Not started" : "—";
  const { stage, percent, step, steps } = row.progress;
  const where = `${stage.replace(/_/g, " ")} (${step}/${steps})`;
  return row.state === "running" ? `${Math.round(percent)}% · ${where}` : where;
}

const columns: Column<SourceIngestion>[] = [
  {
    key: "chapter",
    header: "Chapter",
    accessor: (s) => `${s.book_title} · ${s.chapter.ordinal}. ${s.chapter.title}`,
    render: (s) => (
      <span className="block min-w-[200px]">
        <span className="block font-bold text-ink">{`${s.chapter.ordinal}. ${s.chapter.title}`}</span>
        <span className="block text-[12px] font-normal text-muted">{s.book_title}</span>
      </span>
    ),
  },
  {
    key: "partner_org",
    header: "Partner",
    // Null means identity has no account for the owner any more, which is not
    // the same as the MVP's blank (a GenEd-wide document). Say which it is.
    accessor: (s) => s.partner_org ?? "Unknown partner",
    filterable: true,
  },
  { key: "subject", header: "Subject", filterable: true },
  { key: "grade", header: "Grade", accessor: (s) => s.grade, filterable: true, align: "right" },
  { key: "board", header: "Board", filterable: true, minWidth: "lg" },
  { key: "page_count", header: "Pages", accessor: (s) => s.page_count, align: "right", minWidth: "lg" },
  {
    key: "questions",
    header: "Decisions",
    // Reconciliation questions waiting on a human. The one number on this
    // screen that is a call to action rather than a status.
    accessor: (s) => s.questions,
    align: "right",
    render: (s) =>
      s.questions ? (
        <span className="inline-flex min-w-7 justify-center rounded-full bg-warning-bg px-2 py-0.5 text-[12px] font-bold text-warning-ink">
          {s.questions}
        </span>
      ) : (
        <span className="text-muted-light">0</span>
      ),
  },
  {
    key: "state",
    header: "State",
    filterable: true,
    // Tone from the shared map, so every state has a colour and none is guessed here.
    render: (s) => (
      <StatusPill tone={statusTone(s.state)} dot title={s.detail ?? undefined}>
        {s.state.replace(/_/g, " ")}
      </StatusPill>
    ),
  },
  {
    key: "progress",
    header: "Progress",
    accessor: progressText,
    sortable: false,
    minWidth: "xl",
    render: (s) => (
      <span className="block min-w-[150px]">
        <span className="block text-[12px] text-muted">{progressText(s)}</span>
        {s.progress && s.state === "running" ? (
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-soft-surface">
            <span
              className="block h-full rounded-full bg-accent-deep"
              style={{ width: `${Math.max(2, Math.min(100, s.progress.percent))}%` }}
            />
          </span>
        ) : null}
      </span>
    ),
  },
];

export function SourceIngestionsView() {
  const [rows, setRows] = useState<SourceIngestion[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchAllIngestions()
      .then((res) => {
        setRows(res.sources);
        setTotal(res.total);
        setTruncated(res.truncated);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load ingestions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DataTable
      title="Ingestions"
      subtitle="Partner chapters and the runs that ingest them."
      noun="chapters"
      rows={rows}
      columns={columns}
      getRowKey={(s) => s.source_id}
      loading={loading}
      error={error}
      banner={
        truncated ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-ink">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              Showing {rows.length} of {total} chapters — more than the {INGESTIONS_FETCH_CAP}
              -chapter client-side limit. Filters below cover only the chapters loaded.
            </span>
          </div>
        ) : undefined
      }
    />
  );
}
