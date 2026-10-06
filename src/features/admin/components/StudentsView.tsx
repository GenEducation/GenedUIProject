"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { listStudents, updateStudent, StudentRow } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";
import { Button } from "@/components/ui/Button";

export function StudentsView() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StudentRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listStudents()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo<Column<StudentRow>[]>(
    () => [
      { key: "name", header: "Name", accessor: (s) => s.name },
      { key: "username", header: "Username" },
      { key: "email", header: "Email" },
      { key: "grade", header: "Grade", accessor: (s) => s.grade, filterable: true },
      { key: "school_board", header: "Board", accessor: (s) => s.school_board, filterable: true },
      { key: "parent_email", header: "Parent email", accessor: (s) => s.parent_email },
      {
        key: "plan",
        header: "Plan",
        accessor: (s) => s.plan,
        filterable: true,
        render: (s) => (
          <span
            className={`rounded-md px-2 py-0.5 text-xs ${
              s.plan === "PRO" ? "bg-[#059F6D]/15 text-[#059F6D]" : "bg-white/10 text-white/50"
            }`}
          >
            {s.plan}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        title="Students"
        noun="students"
        rows={rows}
        columns={columns}
        getRowKey={(s) => s.id}
        loading={loading}
        error={error}
        actions={(s) => (
          <Button iconOnly size="sm" variant="tertiary" tone="onDark" aria-label="Edit" onClick={() => setEditing(s)}>
            <Pencil size={15} />
          </Button>
        )}
      />
      {editing && (
        <EntityEditModal
          title={`Edit ${editing.username}`}
          initial={editing as unknown as Record<string, unknown>}
          fields={[
            { key: "name", label: "Name" },
            { key: "age", label: "Age", type: "number" },
            { key: "grade", label: "Grade", type: "number" },
            { key: "parent_email", label: "Parent email" },
          ]}
          onClose={() => setEditing(null)}
          onSave={async (vals) => {
            await updateStudent(editing.id, vals);
            load();
          }}
        />
      )}
    </>
  );
}
