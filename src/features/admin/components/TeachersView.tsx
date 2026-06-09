"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, GraduationCap } from "lucide-react";
import { listTeachers, updateTeacher, updateUser, TeacherRow } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";
import { BulkImportModal } from "./BulkImportModal";

const columns: Column<TeacherRow>[] = [
  { key: "full_name", header: "Name", accessor: (t) => t.full_name ?? t.username },
  { key: "email", header: "Email" },
  {
    key: "subjects",
    header: "Subjects",
    accessor: (t) => (t.subjects?.length ? t.subjects.join(", ") : "—"),
  },
  { key: "title", header: "Title", accessor: (t) => t.title ?? "—" },
  { key: "partner_org", header: "School", accessor: (t) => t.partner_org ?? "—", filterable: true },
  { key: "student_count", header: "Students", accessor: (t) => t.student_count },
];

export function TeachersView() {
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [bulk, setBulk] = useState<TeacherRow | null>(null);

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
        rows={rows}
        columns={columns}
        getRowKey={(t) => t.id}
        loading={loading}
        error={error}
        actions={(t) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setBulk(t)}
              className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              title="Import students into this teacher's roster"
            >
              <GraduationCap size={15} />
            </button>
            <button
              onClick={() => setEditing(t)}
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
              teacherFields.subjects = String(subjects)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
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
