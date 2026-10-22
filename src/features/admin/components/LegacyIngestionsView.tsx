"use client";

// The MVP's Ingestions screen. Rendered only while the `ingestions` group is
// off; `IngestionsView` chooses between this and the rebuilt one.
//
// A gateway that already answers with the new backend's paged shape (a local
// stack pointed at the new service, say) used to crash this screen on
// `rows.map`. The answer itself says which screen it belongs to, so when it is
// a page of chapter sources, hand over to the screen that reads those.

import { useEffect, useState } from "react";
import { listIngestions, Ingestion } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { SourceIngestionsView } from "./SourceIngestionsView";
import { StatusPill, statusTone } from "./ui/StatusPill";

const columns: Column<Ingestion>[] = [
  { key: "document_title", header: "Document" },
  { key: "partner_name", header: "Partner", accessor: (i) => i.partner_name ?? "GenEd (global)", filterable: true },
  { key: "subject", header: "Subject", filterable: true },
  { key: "grade", header: "Grade", accessor: (i) => i.grade, filterable: true },
  { key: "board", header: "Board", filterable: true },
  { key: "chunks_created", header: "Chunks", accessor: (i) => i.chunks_created, align: "right" },
  {
    key: "status",
    header: "Status",
    filterable: true,
    render: (i) => (
      <StatusPill tone={statusTone(i.status)} dot>
        {i.status}
      </StatusPill>
    ),
  },
];

function isSourcePage(res: unknown): boolean {
  return typeof res === "object" && res !== null && Array.isArray((res as { items?: unknown }).items);
}

export function LegacyIngestionsView() {
  const [rows, setRows] = useState<Ingestion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paged, setPaged] = useState(false);

  useEffect(() => {
    listIngestions()
      .then((res: unknown) => {
        if (Array.isArray(res)) setRows(res as Ingestion[]);
        else if (isSourcePage(res)) setPaged(true);
        else setError("The server returned ingestions in an unexpected format.");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load ingestions"))
      .finally(() => setLoading(false));
  }, []);

  if (paged) return <SourceIngestionsView />;

  return (
    <DataTable
      title="Ingestions"
      noun="ingestion records"
      rows={rows}
      columns={columns}
      getRowKey={(i) => i.id}
      loading={loading}
      error={error}
    />
  );
}
