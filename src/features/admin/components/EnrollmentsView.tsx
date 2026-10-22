"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listEnrollments, updateEnrollment, Enrollment } from "../adminService";
import { Building2, Link2 } from "lucide-react";
import { DataTable, Column } from "./DataTable";
import { Identity } from "./ui/Avatar";
import { StatusPill, statusTone } from "./ui/StatusPill";
import { EmptyState } from "./ui/EmptyState";
import { StatusActions, statusFromQuery } from "./ui/StatusActions";

const STATUS_ORDER = ["PENDING", "APPROVED", "REJECTED", "REVOKED"];
const titleCase = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export function EnrollmentsView() {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialStatus] = useState(statusFromQuery);

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
      {
        key: "student_username",
        header: "Student",
        accessor: (e) => e.student_username,
        render: (e) => <Identity primary={e.student_username ?? "—"} />,
      },
      {
        key: "partner_organization",
        header: "Partner",
        accessor: (e) => e.partner_organization,
        filterable: true,
        render: (e) => (
          <span className="inline-flex items-center gap-2 font-semibold text-ink">
            <Building2 size={14} className="text-muted" />
            {e.partner_organization ?? "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: false,
        render: (e) => (
          <StatusPill tone={statusTone(e.status)} dot>
            {e.status}
          </StatusPill>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      title="Enrollments"
      noun="enrollments"
      emptyState={<EmptyState icon={Link2} bare title="No enrollments yet" body="When a student joins a partner school, the request lands here for review." />}
      subtitle="Students admitted to a partner school."
      tabs={{ label: "Filter by status", accessor: (e) => e.status, order: STATUS_ORDER, format: titleCase, initial: initialStatus, highlight: "PENDING" }}
      rows={rows}
      columns={columns}
      getRowKey={(e) => `${e.student_id}-${e.partner_id}`}
      loading={loading}
      error={error}
      actions={(e) => <StatusActions status={e.status} onSet={(next) => setStatus(e, next)} />}
    />
  );
}
