"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, GraduationCap, Presentation, Building2, ExternalLink } from "lucide-react";
import { listPartners, updatePartner, updateUser, PartnerRow, ImportRole } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";
import { BulkImportModal } from "./BulkImportModal";
import { EDUCATION_BOARDS, isEducationBoard } from "@/types/education";
import { Identity } from "./ui/Avatar";
import { StatusPill } from "./ui/StatusPill";
import { EmptyState } from "./ui/EmptyState";
import { Button } from "@/components/ui/Button";

const columns: Column<PartnerRow>[] = [
  {
    key: "organization",
    header: "Organization",
    accessor: (p) => `${p.organization ?? ""} ${p.username} ${p.email}`,
    render: (p) => (
      <Identity primary={p.organization ?? p.username} secondary={`@${p.username} · ${p.email}`} />
    ),
  },
  {
    key: "website",
    header: "Website",
    accessor: (p) => p.website,
    minWidth: "xl",
    render: (p) =>
      p.website ? (
        <a
          href={/^https?:\/\//.test(p.website) ? p.website : `https://${p.website}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-[220px] items-center gap-1 truncate text-[13px] font-semibold text-emerald hover:underline"
        >
          <span className="truncate">{p.website.replace(/^https?:\/\//, "")}</span>
          <ExternalLink size={12} className="shrink-0" />
        </a>
      ) : (
        <span className="text-muted-light">—</span>
      ),
  },
  {
    key: "board",
    header: "Board",
    accessor: (p) => p.board,
    filterable: true,
    render: (p) => (p.board ? <StatusPill>{p.board}</StatusPill> : <span className="text-muted-light">—</span>),
  },
  {
    key: "student_count",
    header: "Students",
    accessor: (p) => p.student_count,
    align: "right",
    render: (p) => <span className="font-bold tabular-nums text-ink">{p.student_count ?? 0}</span>,
  },
];

export function PartnersView() {
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PartnerRow | null>(null);
  const [bulk, setBulk] = useState<{ role: ImportRole; id: string; label: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listPartners()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load partners"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <DataTable
        title="Partners"
        noun="partner organizations"
        emptyState={<EmptyState icon={Building2} bare title="No partners yet" body="Create a partner account from Users to onboard a school." />}
        rows={rows}
        columns={columns}
        getRowKey={(p) => p.id}
        loading={loading}
        error={error}
        actions={(p) => (
          <div className="flex items-center justify-end gap-1">
            <Button iconOnly size="sm" variant="tertiary" aria-label="Import students" title="Import students" onClick={() => setBulk({ role: "STUDENT", id: p.id, label: p.organization ?? p.username })}>
              <GraduationCap size={15} />
            </Button>
            <Button iconOnly size="sm" variant="tertiary" aria-label="Import teachers" title="Import teachers" onClick={() => setBulk({ role: "TEACHER", id: p.id, label: p.organization ?? p.username })}>
              <Presentation size={15} />
            </Button>
            <Button iconOnly size="sm" variant="tertiary" aria-label="Edit" title="Edit partner" onClick={() => setEditing(p)}>
              <Pencil size={15} />
            </Button>
          </div>
        )}
      />
      {bulk && (
        <BulkImportModal
          role={bulk.role}
          context={{ type: "partner", id: bulk.id }}
          contextLabel={bulk.label}
          onClose={() => setBulk(null)}
          onDone={load}
        />
      )}
      {editing && (
        <EntityEditModal
          title={`Edit ${editing.organization ?? editing.username}`}
          initial={editing as unknown as Record<string, unknown>}
          fields={[
            { key: "organization", label: "Organization" },
            { key: "email", label: "Email" },
            { key: "website", label: "Website" },
            { key: "board", label: "Education board", type: "select", options: EDUCATION_BOARDS },
          ]}
          onClose={() => setEditing(null)}
          onSave={async (vals) => {
            // Email lives on the User record; org/website on the Partner profile.
            const { email, ...partnerFields } = vals;
            const tasks: Promise<unknown>[] = [];
            if (email !== undefined) tasks.push(updateUser(editing.id, { email: String(email) }));
            const { board, ...rest } = partnerFields;
            if (board !== undefined && !isEducationBoard(board)) {
              throw new Error("Select a recognized education board.");
            }
            const update = {
              ...rest,
              ...(board !== undefined ? { board } : {}),
            };
            if (Object.keys(update).length) tasks.push(updatePartner(editing.id, update));
            await Promise.all(tasks);
            load();
          }}
        />
      )}
    </>
  );
}
