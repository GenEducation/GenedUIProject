"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";
import { labService } from "../services/labService";
import type { ClassEligibleStudent } from "../types/lab";
import { ApiRequestError } from "@/utils/authFetch";
import { Select } from "@/components/ui/Select";

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Grade ${index + 1}`,
}));

function currentAcademicYear() {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

interface Props {
  isOpen: boolean;
  partnerId: string;
  onClose: () => void;
  onCreated: (grade: number, section: string) => Promise<void> | void;
}

export function CreateClassModal({ isOpen, partnerId, onClose, onCreated }: Props) {
  const [grade, setGrade] = useState(4);
  const [section, setSection] = useState("A");
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [students, setStudents] = useState<ClassEligibleStudent[]>([]);
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
    void labService.getClassEligibleStudents(partnerId)
      .then(setStudents)
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load students."))
      .finally(() => setLoading(false));
  }, [isOpen, partnerId]);

  useEffect(() => {
    setSelected((current) => new Set([...current].filter((id) => students.some((student) => student.student_id === id && student.grade === grade))));
  }, [grade, students]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return students.filter((student) => !term || student.name.toLowerCase().includes(term));
  }, [query, students]);

  if (!isOpen) return null;

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const submit = async () => {
    const cleanSection = section.trim().toUpperCase();
    if (!cleanSection || !academicYear.trim() || selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const result = await labService.createClass({
        partner_id: partnerId,
        grade,
        section: cleanSection,
        academic_year: academicYear.trim(),
        student_ids: [...selected],
      });
      await onCreated(result.grade, result.section);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create the class.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-class-title">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-border p-6">
          <div><h2 id="create-class-title" className="font-serif text-xl font-semibold text-ink">Create class</h2><p className="mt-1 text-sm text-muted">Create a Grade/Section register by selecting its students.</p></div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-ink/5"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="text-xs font-bold text-muted">
              Grade
              <Select
                aria-label="Grade"
                className="mt-1"
                value={String(grade)}
                onChange={(v) => setGrade(Number(v))}
                options={GRADE_OPTIONS}
                buttonStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  color: "var(--ink)",
                }}
              />
            </div>
            <label className="text-xs font-bold text-muted">Section<input value={section} onChange={(event) => setSection(event.target.value)} maxLength={32} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm uppercase text-ink" /></label>
            <label className="text-xs font-bold text-muted">Academic year<input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} maxLength={16} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm text-ink" /></label>
          </div>
          <label className="mt-5 flex items-center gap-2 rounded-xl border border-border px-3 py-2.5"><Search size={16} className="text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search associated students" className="w-full bg-transparent text-sm outline-none" /></label>
          {error && <p role="alert" className="mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger-ink">{error}</p>}
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {loading ? <p className="py-8 text-center text-sm text-muted">Loading students…</p> : visible.length === 0 ? <p className="py-8 text-center text-sm text-muted">No associated students found.</p> : visible.map((student) => {
              const gradeMatches = student.grade === grade;
              const disabled = !student.eligible || !gradeMatches;
              const reason = student.ineligibility_reason || (!gradeMatches ? student.grade == null ? "Student grade is not set." : `Student is in Grade ${student.grade}.` : null);
              return <label key={student.student_id} className={`flex items-start gap-3 rounded-xl border p-3 ${disabled ? "border-border bg-ink/[.025] opacity-65" : "cursor-pointer border-border hover:border-emerald"}`}><input type="checkbox" className="mt-1" disabled={disabled} checked={selected.has(student.student_id)} onChange={() => toggle(student.student_id)} /><span><span className="block font-semibold text-ink">{student.name}</span><span className="block text-xs text-muted">{reason || `Grade ${student.grade}`}</span></span></label>;
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border p-6"><span className="text-sm text-muted">{selected.size} selected · roll numbers follow this order</span><div className="flex gap-3"><button onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-ink">Cancel</button><button onClick={() => void submit()} disabled={saving || selected.size === 0 || !section.trim() || !academicYear.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Users size={16} />{saving ? "Creating…" : "Create class"}</button></div></div>
      </div>
    </div>
  );
}
