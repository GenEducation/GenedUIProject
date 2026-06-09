"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, GraduationCap, Presentation } from "lucide-react";
import { listPartners, updatePartner, updateUser, PartnerRow, ImportRole } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";
import { BulkImportModal } from "./BulkImportModal";

const columns: Column<PartnerRow>[] = [
  { key: "organization", header: "Organization", accessor: (p) => p.organization },
  { key: "username", header: "Username" },
  { key: "email", header: "Email" },
  { key: "website", header: "Website", accessor: (p) => p.website },
  { key: "student_count", header: "Students", accessor: (p) => p.student_count },
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
        rows={rows}
        columns={columns}
        getRowKey={(p) => p.id}
        loading={loading}
        error={error}
        actions={(p) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setBulk({ role: "STUDENT", id: p.id, label: p.organization ?? p.username })}
              className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              title="Import students"
            >
              <GraduationCap size={15} />
            </button>
            <button
              onClick={() => setBulk({ role: "TEACHER", id: p.id, label: p.organization ?? p.username })}
              className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              title="Import teachers"
            >
              <Presentation size={15} />
            </button>
            <button
              onClick={() => setEditing(p)}
              className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
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
          ]}
          onClose={() => setEditing(null)}
          onSave={async (vals) => {
            // Email lives on the User record; org/website on the Partner profile.
            const { email, ...partnerFields } = vals;
            const tasks: Promise<unknown>[] = [];
            if (email !== undefined) tasks.push(updateUser(editing.id, { email: String(email) }));
            if (Object.keys(partnerFields).length) tasks.push(updatePartner(editing.id, partnerFields));
            await Promise.all(tasks);
            load();
          }}
        />
      )}
    </>
  );
}
