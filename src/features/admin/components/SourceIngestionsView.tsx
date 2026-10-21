"use client";

import { useCallback, useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { SourceIngestion } from "../adminService";
import { fetchAllIngestions, INGESTIONS_FETCH_CAP } from "../fetchAllIngestions";
import { DataTable, Column } from "./DataTable";

/**
 * Ingestions as the new backend has them: a partner's chapter and the run that
 * ingests it.
 *
 * The columns are not the old screen's. There is no chunk count here and no
 * document type, and there is a run state, a stage and a progress percent that
 * the MVP's table had no column for. Mapping one onto the other would have
 * meant inventing numbers, so the screen says what this backend actually knows.
 */

/** Every state the backend can report, so a colour is never guessed. */
const STATE_STYLES: Record<SourceIngestion["state"], string> = {
  ready: "bg-[#075E63]/15 text-[#075E63]",
  running: "bg-sky-500/15 text-sky-300",
  queued: "bg-sky-500/10 text-sky-200",
  registered: "bg-white/10 text-white/70",
  review_needed: "bg-amber-500/15 text-amber-200",
  invalid: "bg-rose-500/15 text-rose-300",
  failed: "bg-rose-500/15 text-rose-300",
};

/** A run's position, as a percent when one is known and a stage name otherwise. */
function progressText(row: SourceIngestion): string {
  if (!row.progress) return row.state === "registered" ? "Not started" : "—";
  const { stage, percent, step, steps } = row.progress;
  return `${Math.round(percent)}% · ${stage.replace(/_/g, " ")} (${step}/${steps})`;
}

const columns: Column<SourceIngestion>[] = [
  {
    key: "chapter",
    header: "Chapter",
    accessor: (s) => `${s.book_title} · ${s.chapter.ordinal}. ${s.chapter.title}`,
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
  { key: "grade", header: "Grade", accessor: (s) => s.grade, filterable: true },
  { key: "board", header: "Board", filterable: true },
  { key: "page_count", header: "Pages", accessor: (s) => s.page_count, align: "right" },
  {
    key: "questions",
    header: "Decisions",
    // Reconciliation questions waiting on a human. The one number on this
    // screen that is a call to action rather than a status.
    accessor: (s) => s.questions,
    align: "right",
  },
  {
    key: "state",
    header: "State",
    filterable: true,
    render: (s) => (
      <span
        className={`rounded-md px-2 py-0.5 text-xs ${STATE_STYLES[s.state] ?? "bg-white/10 text-white/70"}`}
        title={s.detail ?? undefined}
      >
        {s.state.replace(/_/g, " ")}
      </span>
    ),
  },
  { key: "progress", header: "Progress", accessor: progressText },
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
    <>
      {truncated ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            Showing {rows.length} of {total} chapters — more than the {INGESTIONS_FETCH_CAP}
            -chapter client-side limit. Filters below cover only the chapters loaded.
          </span>
        </div>
      ) : null}
      <DataTable
        title="Ingestions"
        noun="chapters"
        rows={rows}
        columns={columns}
        getRowKey={(s) => s.source_id}
        loading={loading}
        error={error}
      />
    </>
  );
}
