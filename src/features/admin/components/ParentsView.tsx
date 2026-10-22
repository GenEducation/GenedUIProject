"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Contact } from "lucide-react";
import { listParents, updateParent, ParentRow } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";
import { Identity } from "./ui/Avatar";
import { EmptyState } from "./ui/EmptyState";
import { Button } from "@/components/ui/Button";

const columns: Column<ParentRow>[] = [
  {
    key: "username",
    header: "Parent",
    accessor: (p) => `${p.username} ${p.email}`,
    render: (p) => <Identity primary={p.username} secondary={p.email} />,
  },
  {
    key: "phone",
    header: "Phone",
    accessor: (p) => p.phone,
    render: (p) => (p.phone ? <span className="tabular-nums">{p.phone}</span> : <span className="text-muted-light">—</span>),
  },
  {
    key: "student_count",
    header: "Linked students",
    accessor: (p) => p.student_count,
    align: "right",
    render: (p) => (
      <span
        className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${
          p.student_count ? "bg-emerald-50 text-emerald-700" : "bg-canvas text-muted"
        }`}
      >
        {p.student_count ?? 0}
      </span>
    ),
  },
];

export function ParentsView() {
  const [rows, setRows] = useState<ParentRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ParentRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listParents()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load parents"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <DataTable
        title="Parents"
        noun="parents"
        emptyState={<EmptyState icon={Contact} bare title="No parents yet" body="Parent accounts appear here once they sign up." />}
        rows={rows}
        columns={columns}
        getRowKey={(p) => p.id}
        loading={loading}
        error={error}
        actions={(p) => (
          <Button iconOnly size="sm" variant="tertiary" aria-label="Edit" title="Edit parent" onClick={() => setEditing(p)}>
            <Pencil size={15} />
          </Button>
        )}
      />
      {editing && (
        <EntityEditModal
          title={`Edit ${editing.username}`}
          initial={editing as unknown as Record<string, unknown>}
          fields={[{ key: "phone", label: "Phone" }]}
          onClose={() => setEditing(null)}
          onSave={async (vals) => {
            await updateParent(editing.id, vals);
            load();
          }}
        />
      )}
    </>
  );
}
