"use client";

import { Loader2, Mail, MessageSquare, ScrollText, X, Check, Clock } from "lucide-react";
import { TeacherStudent } from "../services/teacherService";
import { subjectColor } from "../constants";

function displayName(student: TeacherStudent) {
  return student.name || student.username || student.email || `Student ${student.student_id.slice(0, 8)}`;
}

function initials(name: string) {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface StudentCardProps {
  student: TeacherStudent;
  onApprove: () => void;
  onRemove: () => void;
  onViewChats: () => void;
  onViewReport: () => void;
  isApproving: boolean;
  isRemoving: boolean;
}

export function StudentCard({
  student,
  onApprove,
  onRemove,
  onViewChats,
  onViewReport,
  isApproving,
  isRemoving,
}: StudentCardProps) {
  const name = displayName(student);
  const color = subjectColor(student.subject);
  const isPending = student.status === "PENDING";
  const awaitingSchool = isPending && student.school_status !== "APPROVED";

  return (
    <article
      className={`rounded-2xl border p-5 shadow-[0_1px_2px_rgba(4,46,92,.06),0_1px_3px_rgba(4,46,92,.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(4,46,92,.07),0_12px_32px_rgba(4,46,92,.06)] ${
        isPending ? "border-warning-border bg-gradient-to-b from-[#fffaf1] to-white" : "border-border bg-white"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="flex h-12 w-12 flex-none items-center justify-center rounded-xl font-serif text-lg font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
            {student.email && student.name && (
              <span className="flex items-center gap-1 truncate">
                <Mail size={11} className="flex-none" />
                {student.email}
              </span>
            )}
            {student.subject && (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
                style={{ backgroundColor: `${color}1f`, color }}
              >
                <span className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: color }} />
                {student.subject}
              </span>
            )}
            {typeof student.grade === "number" && <span>Grade {student.grade}</span>}
          </div>
        </div>
        <span
          className={`flex-none rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            isPending ? "bg-warning-bg text-warning-ink" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {isPending ? "Pending" : "Approved"}
        </span>
      </div>

      {isPending && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg p-3 text-[12.5px] leading-relaxed text-warning-ink">
          <Clock size={15} className="mt-0.5 flex-none" />
          <span>
            {student.requested_at
              ? `Requested ${new Date(student.requested_at).toLocaleDateString()}. `
              : ""}
            {awaitingSchool
              ? "Waiting for the school administrator to approve membership. You can accept this student after that."
              : "Ready for you to accept and start tracking this student’s progress."}
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-dashed border-border pt-3.5">
        {isPending ? (
          <>
            <button
              onClick={onRemove}
              disabled={isRemoving || isApproving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:border-[#f6c4b5] hover:bg-danger-bg hover:text-danger disabled:opacity-50"
            >
              {isRemoving ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              Remove
            </button>
            <button
              onClick={onApprove}
              disabled={isApproving || isRemoving || awaitingSchool}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(5,159,109,.28)] transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {isApproving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {awaitingSchool ? "Awaiting school" : "Accept student"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onRemove}
              disabled={isRemoving}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-muted-light transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-50"
            >
              {isRemoving ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              Remove
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onViewChats}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-[#cdeede] hover:bg-emerald-50 hover:text-emerald"
              >
                <MessageSquare size={13} />
                Chat history
              </button>
              <button
                onClick={onViewReport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(4,46,92,.18)] transition-colors hover:bg-navy-700"
              >
                <ScrollText size={13} />
                Report
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
