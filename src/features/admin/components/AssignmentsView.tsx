"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listAssignments, updateAssignment, Assignment } from "../adminService";
import { DataTable, Column } from "./DataTable";

const STATUS_ACTIONS = ["APPROVED", "REJECTED", "REVOKED"] as const;

export function AssignmentsView() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listAssignments()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load assignments"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = useCallback(
    async (a: Assignment, status: string, cascade = false) => {
      try {
        const res = await updateAssignment(a.teacher_id, a.student_id, { status, cascade });
        // Backend returns { code, message } for the §15 invariant violation
        // (ADMN_1104) instead of throwing. Surface it and offer the cascade path.
        const maybeErr = res as unknown as { code?: string; message?: string };
        if (maybeErr.code === "ADMN_1104") {
          const ok = window.confirm(
            `${maybeErr.message}\n\nThis student is NOT admitted to the teacher's school. ` +
              `As platform admin you can force-admit them (creates/approves the school enrollment). Proceed?`,
          );
          if (ok) {
            await updateAssignment(a.teacher_id, a.student_id, { status, cascade: true });
          } else {
            return;
          }
        }
        setError("");
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update assignment");
      }
    },
    [load],
  );

  const columns = useMemo<Column<Assignment>[]>(
    () => [
      { key: "teacher_name", header: "Teacher", accessor: (a) => a.teacher_name, filterable: true },
      { key: "student_username", header: "Student", accessor: (a) => a.student_username },
      { key: "subject", header: "Subject", accessor: (a) => a.subject ?? "—" },
      {
        key: "status",
        header: "Status",
        filterable: true,
        render: (a) => (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{a.status}</span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      title="Assignments"
      noun="teacher↔student links"
      rows={rows}
      columns={columns}
      getRowKey={(a) => `${a.teacher_id}-${a.student_id}`}
      loading={loading}
      error={error}
      actions={(a) => (
        <div className="flex items-center justify-end gap-2">
          {STATUS_ACTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(a, s)}
              disabled={a.status === s}
              className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/60 hover:bg-white/5 disabled:opacity-30"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    />
  );
}
