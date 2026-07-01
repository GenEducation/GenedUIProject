"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { listParents, updateParent, ParentRow } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";

const columns: Column<ParentRow>[] = [
  { key: "username", header: "Username" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone", accessor: (p) => p.phone },
  { key: "student_count", header: "Linked students", accessor: (p) => p.student_count },
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
        rows={rows}
        columns={columns}
        getRowKey={(p) => p.id}
        loading={loading}
        error={error}
        actions={(p) => (
          <button
            onClick={() => setEditing(p)}
            className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
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
