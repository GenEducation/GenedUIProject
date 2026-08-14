"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { studentService } from "../services/studentService";
import { ApiRequestError } from "@/utils/authFetch";

interface AvailableTeacher {
  teacher_id: string;
  name: string;
  subjects: string[];
  school_id: string;
  request_status?: string | null;
}

export function TeacherConnections({ studentId }: { studentId: string }) {
  const [teachers, setTeachers] = useState<AvailableTeacher[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void studentService.fetchAvailableTeachers()
      .then(setTeachers)
      .catch(() => setMessage("Could not load teachers right now."))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    const teacher = teachers.find((item) => item.teacher_id === selected);
    if (!teacher) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await studentService.requestTeacher(studentId, teacher.teacher_id);
      setTeachers((current) => current.map((item) => item.teacher_id === teacher.teacher_id ? { ...item, request_status: result.status } : item));
      setSelected("");
      setMessage(result.status === "APPROVED" ? `You are now connected with ${teacher.name}.` : `Request sent to ${teacher.name}; school approval is pending.`);
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : "Could not send the request.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" size={18} /></div>;

  return (
    <div>
      {teachers.length === 0 ? (
        <p className="text-center text-xs text-slate-500">Join a school before connecting with one of its teachers.</p>
      ) : (
        <>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
            <option value="">Choose a teacher…</option>
            {teachers.map((teacher) => (
              <option key={teacher.teacher_id} value={teacher.teacher_id} disabled={teacher.request_status === "APPROVED" || teacher.request_status === "PENDING"}>
                {teacher.name}{teacher.subjects.length ? ` — ${teacher.subjects.join(", ")}` : ""}{teacher.request_status === "APPROVED" ? " — Connected" : teacher.request_status === "PENDING" ? " — Pending" : ""}
              </option>
            ))}
          </select>
          <button onClick={() => void submit()} disabled={!selected || saving} className="mt-2 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Sending…" : "Request teacher"}
          </button>
        </>
      )}
      {message && <p className="mt-2 text-xs text-slate-600" aria-live="polite">{message}</p>}
    </div>
  );
}
