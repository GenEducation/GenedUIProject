"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { labService } from "../services/labService";
import type { EligibleRosterStudent } from "../types/lab";
import { ApiRequestError } from "@/utils/authFetch";

interface AddStudentsToClassProps {
  slotId: string;
  grade: number;
  section: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (message: string) => Promise<void> | void;
}

export function AddStudentsToClass({ slotId, grade, section, isOpen, onClose, onAdded }: AddStudentsToClassProps) {
  const [students, setStudents] = useState<EligibleRosterStudent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSelected(new Set());
    void labService.getEligibleStudents(slotId)
      .then(setStudents)
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load your students."))
      .finally(() => setLoading(false));
  }, [isOpen, slotId]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? students.filter((student) => student.name.toLowerCase().includes(term)) : students;
  }, [query, students]);

  if (!isOpen) return null;

  const toggle = (studentId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const result = await labService.addRosterStudents(slotId, [...selected]);
      await onAdded(`${result.added} ${result.added === 1 ? "student" : "students"} added to Grade ${grade}${section}.`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not add the selected students.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" role="dialog" aria-modal="true" aria-labelledby="add-students-title">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 id="add-students-title" className="font-serif text-xl font-semibold text-ink">Add students to Grade {grade}{section}</h2>
            <p className="mt-1 text-sm text-muted">Choose from students already associated with you.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-surface"><X size={18} /></button>
        </div>
        <div className="p-5">
          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
            <Search size={16} className="text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students" className="w-full bg-transparent text-sm outline-none" />
          </label>
          {error && <p className="mt-3 rounded-lg bg-danger-bg p-3 text-sm text-danger-ink" role="alert">{error}</p>}
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {loading ? <p className="py-8 text-center text-sm text-muted">Loading students…</p> : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No associated students found.</p>
            ) : filtered.map((student) => {
              const disabled = !student.eligible;
              return (
                <label key={student.student_id} className={`flex items-start gap-3 rounded-xl border p-3 ${disabled ? "border-border bg-surface opacity-70" : "cursor-pointer border-border hover:border-emerald"}`}>
                  <input type="checkbox" className="mt-1" disabled={disabled} checked={selected.has(student.student_id)} onChange={() => toggle(student.student_id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{student.name}</span>
                    <span className="block text-xs text-muted">
                      {student.already_in_roster ? `Already in Grade ${grade}${section}` : student.ineligibility_reason || [student.grade && `Grade ${student.grade}`, student.subject].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink">Cancel</button>
          <button onClick={() => void submit()} disabled={saving || selected.size === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            <UserPlus size={16} /> {saving ? "Adding…" : `Add selected (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
