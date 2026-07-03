"use client";

import { useMemo } from "react";
import { Search, UserX } from "lucide-react";
import { useTeacherStore, StatusFilter, SortOption } from "../store/useTeacherStore";
import { TeacherStudent } from "../services/teacherService";
import { StudentCard } from "./StudentCard";
import { SUBJECTS } from "../constants";
import { rosterCounts, filterAndSortRoster } from "../utils/rosterUtils";

interface StudentRosterProps {
  onApprove: (student: TeacherStudent) => void;
  onRemove: (student: TeacherStudent) => void;
  onViewChats: (student: TeacherStudent) => void;
  onViewReport: (student: TeacherStudent) => void;
  approvingId: string | null;
  removingId: string | null;
}

export function StudentRoster({ onApprove, onRemove, onViewChats, onViewReport, approvingId, removingId }: StudentRosterProps) {
  const {
    students,
    statusFilter,
    subjectFilter,
    search,
    sort,
    setStatusFilter,
    setSubjectFilter,
    setSearch,
    setSort,
    isFetchingStudents,
  } = useTeacherStore();

  const counts = useMemo(() => rosterCounts(students), [students]);

  const filtered = useMemo(
    () => filterAndSortRoster(students, { statusFilter, subjectFilter, search, sort }),
    [students, statusFilter, subjectFilter, search, sort],
  );

  return (
    <div>
      {/* Controls */}
      <section className="mb-5 flex flex-wrap items-end gap-3.5 rounded-2xl border border-[#e6ecf2] bg-white p-4 shadow-[0_1px_2px_rgba(4,46,92,.06),0_1px_3px_rgba(4,46,92,.05)]">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7d91]">Status</span>
          <div className="flex rounded-[11px] border border-[#e6ecf2] bg-[#F8F9FA] p-[3px]">
            {(
              [
                ["all", "All", counts.all],
                ["APPROVED", "Approved", counts.approved],
                ["PENDING", "Pending", counts.pending],
              ] as [StatusFilter, string, number][]
            ).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                  statusFilter === value ? "bg-[#042E5C] text-white shadow-md" : "text-[#6b7d91] hover:text-[#042E5C]"
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-[11px] font-bold ${
                    statusFilter === value ? "bg-white/20 text-white" : "bg-[#e3e9ef] text-[#6b7d91]"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7d91]">Subject</span>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="appearance-none rounded-[11px] border border-[#e6ecf2] bg-[#F8F9FA] px-3.5 py-2.5 pr-8 text-[13.5px] font-medium text-[#1c2b3a] outline-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7d91' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            <option value="all">All subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7d91]">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="appearance-none rounded-[11px] border border-[#e6ecf2] bg-[#F8F9FA] px-3.5 py-2.5 pr-8 text-[13.5px] font-medium text-[#1c2b3a] outline-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7d91' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            <option value="status">Pending first</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7d91]">Search</span>
          <div className="flex items-center gap-2 rounded-[11px] border border-[#e6ecf2] bg-[#F8F9FA] px-3.5 py-2.5">
            <Search size={15} className="flex-none text-[#6b7d91]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="w-full bg-transparent text-[13.5px] text-[#1c2b3a] outline-none"
            />
          </div>
        </div>
      </section>

      <div className="mb-3.5 px-1 text-[13.5px] text-[#6b7d91]">
        Showing <b className="font-bold text-[#042E5C]">{filtered.length}</b> of {students.length} student
        {students.length !== 1 ? "s" : ""}
      </div>

      {isFetchingStudents && students.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-[#e6ecf2] bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e6ecf2] bg-white py-16 text-center text-[#6b7d91]">
          <UserX className="mx-auto mb-3 text-[#cbd5e1]" size={36} />
          <h3 className="font-serif text-xl font-semibold text-[#042E5C]">No students here</h3>
          <p className="mt-1 text-sm">Try a different filter, or invite a student to your class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((student) => (
            <StudentCard
              key={student.student_id}
              student={student}
              onApprove={() => onApprove(student)}
              onRemove={() => onRemove(student)}
              onViewChats={() => onViewChats(student)}
              onViewReport={() => onViewReport(student)}
              isApproving={approvingId === student.student_id}
              isRemoving={removingId === student.student_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
