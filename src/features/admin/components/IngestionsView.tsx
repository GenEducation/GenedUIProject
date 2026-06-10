"use client";

import { useEffect, useState } from "react";
import { listIngestions, Ingestion } from "../adminService";
import { DataTable, Column } from "./DataTable";

const columns: Column<Ingestion>[] = [
  { key: "document_title", header: "Document" },
  { key: "partner_name", header: "Partner", accessor: (i) => i.partner_name ?? "GenEd (global)", filterable: true },
  { key: "subject", header: "Subject", filterable: true },
  { key: "grade", header: "Grade", accessor: (i) => i.grade, filterable: true },
  { key: "board", header: "Board", filterable: true },
  { key: "chunks_created", header: "Chunks", accessor: (i) => i.chunks_created },
  {
    key: "status",
    header: "Status",
    filterable: true,
    render: (i) => (
      <span
        className={`rounded-md px-2 py-0.5 text-xs ${
          i.status === "completed"
            ? "bg-[#059F6D]/15 text-[#059F6D]"
            : "bg-rose-500/15 text-rose-300"
        }`}
      >
        {i.status}
      </span>
    ),
  },
];

export function IngestionsView() {
  const [rows, setRows] = useState<Ingestion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listIngestions()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load ingestions"))
      .finally(() => setLoading(false));
  }, []);

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
