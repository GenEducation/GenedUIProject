"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, GraduationCap } from "lucide-react";
import { EmptyState } from "./ui/EmptyState";
import { listStudents, updateStudent, StudentRow } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";
import { Identity } from "./ui/Avatar";
import { StatusPill } from "./ui/StatusPill";
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
      {
        key: "name",
        header: "Student",
        accessor: (s) => `${s.name ?? ""} ${s.username} ${s.email}`,
        render: (s) => (
          <Identity
            primary={s.name || s.username}
            secondary={s.name ? `@${s.username} · ${s.email}` : s.email}
          />
        ),
      },
      {
        key: "grade",
        header: "Grade",
        accessor: (s) => s.grade,
        filterable: true,
        render: (s) => (s.grade != null ? <span className="font-bold tabular-nums">Grade {s.grade}</span> : "—"),
      },
      {
        key: "school_board",
        header: "Board",
        accessor: (s) => s.school_board,
        filterable: true,
        render: (s) => (s.school_board ? <StatusPill>{s.school_board}</StatusPill> : "—"),
      },
      {
        key: "parent_email",
        header: "Parent",
        accessor: (s) => s.parent_email,
        minWidth: "lg",
        render: (s) =>
          s.parent_email ? (
            <span className="block max-w-[260px] truncate text-[13px]">{s.parent_email}</span>
          ) : (
            <span className="text-[12px] font-semibold text-muted-light">Not linked</span>
          ),
      },
      {
        key: "plan",
        header: "Plan",
        accessor: (s) => s.plan,
        filterable: true,
        render: (s) => (
          <StatusPill tone={s.plan === "PRO" ? "brand" : "neutral"} dot={s.plan === "PRO"}>
            {s.plan}
          </StatusPill>
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
        emptyState={<EmptyState icon={GraduationCap} bare title="No students yet" body="Students appear here once they sign up or are imported by a partner." />}
        rows={rows}
        columns={columns}
        getRowKey={(s) => s.id}
        loading={loading}
        error={error}
        actions={(s) => (
          <Button iconOnly size="sm" variant="tertiary" aria-label="Edit" title="Edit student" onClick={() => setEditing(s)}>
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
