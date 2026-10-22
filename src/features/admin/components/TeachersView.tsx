"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, GraduationCap, Presentation } from "lucide-react";
import { listTeachers, updateTeacher, updateUser, TeacherRow } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";
import { BulkImportModal } from "./BulkImportModal";
import Link from "next/link";
import { useTaxonomySubjects } from "@/features/subjects/subjectCatalog";
import { adminReferenceBase } from "../adminApiRouting";
import { Identity } from "./ui/Avatar";
import { EmptyState } from "./ui/EmptyState";
import { Button } from "@/components/ui/Button";

const columns: Column<TeacherRow>[] = [
  {
    key: "full_name",
    header: "Teacher",
    accessor: (t) => `${t.full_name ?? t.username} ${t.email}`,
    render: (t) => (
      <Identity primary={t.full_name ?? t.username} secondary={[t.title, t.email].filter(Boolean).join(" · ")} />
    ),
  },
  {
    key: "subjects",
    header: "Subjects",
    accessor: (t) => (t.subjects?.length ? t.subjects.join(", ") : "—"),
    sortable: false,
    render: (t) =>
      t.subjects?.length ? (
        <span className="flex max-w-[280px] flex-wrap gap-1">
          {t.subjects.map((s) => (
            <span key={s} className="rounded-md bg-soft-surface/70 px-1.5 py-0.5 text-[11.5px] font-semibold text-ink">
              {s}
            </span>
          ))}
        </span>
      ) : (
        <span className="text-muted-light">—</span>
      ),
  },
  { key: "partner_org", header: "School", accessor: (t) => t.partner_org ?? "—", filterable: true },
  {
    key: "student_count",
    header: "Students",
    accessor: (t) => t.student_count,
    align: "right",
    render: (t) => <span className="font-bold tabular-nums text-ink">{t.student_count ?? 0}</span>,
  },
];

export function TeachersView() {
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [bulk, setBulk] = useState<TeacherRow | null>(null);
  const catalog = useTaxonomySubjects(editing?.board, {
    // Same reason as the Create-account modal: this is reference data the
    // console must still get when the MVP is gone.
    baseUrl: adminReferenceBase(),
  });
  const taxonomySubjects = useMemo(
    () => Array.from(new Set(catalog.map((entry) => entry.name))),
    [catalog],
  );

  const load = useCallback(() => {
    setLoading(true);
    listTeachers()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load teachers"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <DataTable
        title="Teachers"
        noun="teachers"
        emptyState={
          <EmptyState
            icon={Presentation}
            bare
            title="No teachers yet"
            body="Teachers are added per school. Open Partners and use “Import teachers” on a school’s row."
            action={
              <Link href="/admin/partners" className="text-sm font-bold text-emerald hover:underline">
                Go to Partners →
              </Link>
            }
          />
        }
        rows={rows}
        columns={columns}
        getRowKey={(t) => t.id}
        loading={loading}
        error={error}
        actions={(t) => (
          <div className="flex items-center justify-end gap-1">
            <Button iconOnly size="sm" variant="tertiary" aria-label="Import students into this teacher's roster" title="Import students into roster" onClick={() => setBulk(t)}>
              <GraduationCap size={15} />
            </Button>
            <Button iconOnly size="sm" variant="tertiary" aria-label="Edit" title="Edit teacher" onClick={() => setEditing(t)}>
              <Pencil size={15} />
            </Button>
          </div>
        )}
      />
      {bulk && (
        <BulkImportModal
          role="STUDENT"
          context={{ type: "teacher", id: bulk.id }}
          contextLabel={bulk.full_name ?? bulk.username}
          onClose={() => setBulk(null)}
          onDone={load}
        />
      )}
      {editing && (
        <EntityEditModal
          title={`Edit ${editing.full_name ?? editing.username}`}
          initial={{
            ...(editing as unknown as Record<string, unknown>),
            subjects: editing.subjects?.join(", ") ?? "",
          }}
          fields={[
            { key: "full_name", label: "Full name" },
            { key: "email", label: "Email" },
            { key: "title", label: "Title" },
            { key: "subjects", label: "Subjects (comma-separated)" },
          ]}
          onClose={() => setEditing(null)}
          onSave={async (vals) => {
            // Email lives on the User record; the rest on the Teacher profile.
            const { email, subjects, ...rest } = vals;
            const tasks: Promise<unknown>[] = [];
            if (email !== undefined) tasks.push(updateUser(editing.id, { email: String(email) }));
            const teacherFields: { full_name?: string; title?: string; subjects?: string[] } = {};
            if (rest.full_name !== undefined) teacherFields.full_name = String(rest.full_name);
            if (rest.title !== undefined) teacherFields.title = String(rest.title);
            if (subjects !== undefined) {
              const requestedSubjects = String(subjects)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              if (
                requestedSubjects.some(
                  (subject) => !taxonomySubjects.some((candidate) => candidate === subject),
                )
              ) {
                throw new Error("Every teacher subject must exactly match the taxonomy catalogue.");
              }
              teacherFields.subjects = requestedSubjects;
            }
            if (Object.keys(teacherFields).length) tasks.push(updateTeacher(editing.id, teacherFields));
            await Promise.all(tasks);
            load();
          }}
        />
      )}
    </>
  );
}
