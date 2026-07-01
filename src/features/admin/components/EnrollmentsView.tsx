"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listEnrollments, updateEnrollment, Enrollment } from "../adminService";
import { DataTable, Column } from "./DataTable";

const STATUS_ACTIONS = ["APPROVED", "REJECTED", "REVOKED"] as const;

export function EnrollmentsView() {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listEnrollments()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load enrollments"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = useCallback(
    async (e: Enrollment, status: string) => {
      try {
        await updateEnrollment(e.student_id, e.partner_id, status);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update enrollment");
      }
    },
    [load],
  );

  const columns = useMemo<Column<Enrollment>[]>(
    () => [
      { key: "student_username", header: "Student", accessor: (e) => e.student_username },
      {
        key: "partner_organization",
        header: "Partner",
        accessor: (e) => e.partner_organization,
        filterable: true,
      },
      {
        key: "status",
        header: "Status",
        filterable: true,
        render: (e) => (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{e.status}</span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      title="Enrollments"
      noun="student↔partner links"
      rows={rows}
      columns={columns}
      getRowKey={(e) => `${e.student_id}-${e.partner_id}`}
      loading={loading}
      error={error}
      actions={(e) => (
        <div className="flex items-center justify-end gap-2">
          {STATUS_ACTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(e, s)}
              disabled={e.status === s}
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
