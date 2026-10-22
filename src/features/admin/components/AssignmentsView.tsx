"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listAssignments, updateAssignment, Assignment } from "../adminService";
import { UsersRound } from "lucide-react";
import { DataTable, Column } from "./DataTable";
import { Identity } from "./ui/Avatar";
import { StatusPill, statusTone } from "./ui/StatusPill";
import { EmptyState } from "./ui/EmptyState";
import { StatusActions, statusFromQuery } from "./ui/StatusActions";

const STATUS_ORDER = ["PENDING", "APPROVED", "REJECTED", "REVOKED"];
const titleCase = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export function AssignmentsView() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialStatus] = useState(statusFromQuery);

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
      {
        key: "teacher_name",
        header: "Teacher",
        accessor: (a) => a.teacher_name,
        filterable: true,
        render: (a) => <Identity primary={a.teacher_name ?? "—"} />,
      },
      {
        key: "student_username",
        header: "Student",
        accessor: (a) => a.student_username,
        render: (a) => <span className="font-semibold text-ink">{a.student_username}</span>,
      },
      { key: "subject", header: "Subject", accessor: (a) => a.subject ?? "—", filterable: true },
      {
        key: "status",
        header: "Status",
        sortable: false,
        render: (a) => (
          <StatusPill tone={statusTone(a.status)} dot>
            {a.status}
          </StatusPill>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      title="Assignments"
      noun="assignments"
      emptyState={<EmptyState icon={UsersRound} bare title="No assignments yet" body="A teacher’s roster requests show up here once teachers start adding students." />}
      subtitle="Students on a teacher’s roster."
      tabs={{ label: "Filter by status", accessor: (a) => a.status, order: STATUS_ORDER, format: titleCase, initial: initialStatus, highlight: "PENDING" }}
      rows={rows}
      columns={columns}
      getRowKey={(a) => `${a.teacher_id}-${a.student_id}`}
      loading={loading}
      error={error}
      actions={(a) => <StatusActions status={a.status} onSet={(next) => setStatus(a, next)} />}
    />
  );
}
