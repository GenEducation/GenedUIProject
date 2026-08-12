"use client";

import { useMemo } from "react";
import { Search, UserX, UserPlus } from "lucide-react";
import { useTeacherStore, StatusFilter, SortOption } from "../store/useTeacherStore";
import { TeacherStudent } from "../services/teacherService";
import { StudentCard } from "./StudentCard";
import { useTaxonomySubjects } from "@/features/subjects/subjectCatalog";
import { rosterCounts, filterAndSortRoster } from "../utils/rosterUtils";

interface StudentRosterProps {
  onApprove: (student: TeacherStudent) => void;
  onRemove: (student: TeacherStudent) => void;
  onViewChats: (student: TeacherStudent) => void;
  onViewReport: (student: TeacherStudent) => void;
  approvingId: string | null;
  removingId: string | null;
  onInviteClick?: () => void;
}

const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7d91' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

export function StudentRoster({
  onApprove,
  onRemove,
  onViewChats,
  onViewReport,
  approvingId,
  removingId,
  onInviteClick,
}: StudentRosterProps) {
  const catalog = useTaxonomySubjects();
  const subjects = useMemo(
    () => Array.from(new Set(catalog.map((entry) => entry.name))),
    [catalog],
  );
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
      <section className="mb-5 flex flex-wrap items-end gap-3.5 rounded-2xl border border-border bg-white p-4 shadow-[0_1px_2px_rgba(4,46,92,.06),0_1px_3px_rgba(4,46,92,.05)]">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Status</span>
          <div className="flex rounded-[11px] border border-border bg-paper p-[3px]">
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
                  statusFilter === value ? "bg-ink text-white shadow-md" : "text-muted hover:text-ink"
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-[11px] font-bold ${
                    statusFilter === value ? "bg-white/20 text-white" : "bg-border text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Subject</span>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="appearance-none rounded-[11px] border border-border bg-paper px-3.5 py-2.5 pr-8 text-[13.5px] font-medium text-ink outline-none"
            style={{
              backgroundImage: selectChevron,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="appearance-none rounded-[11px] border border-border bg-paper px-3.5 py-2.5 pr-8 text-[13.5px] font-medium text-ink outline-none"
            style={{
              backgroundImage: selectChevron,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            <option value="status">Pending first</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Search</span>
          <div className="flex items-center gap-2 rounded-[11px] border border-border bg-paper px-3.5 py-2.5">
            <Search size={15} className="flex-none text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="w-full bg-transparent text-[13.5px] text-ink outline-none"
            />
          </div>
        </div>
      </section>

      <div className="mb-3.5 px-1 text-[13.5px] text-muted">
        Showing <b className="font-bold text-ink">{filtered.length}</b> of {students.length} student
        {students.length !== 1 ? "s" : ""}
      </div>

      {isFetchingStudents && students.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-muted-light">
            <UserX size={26} />
          </div>
          <h3 className="font-serif text-xl font-semibold text-ink">No students here</h3>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            Try a different filter, or invite a student to your class.
          </p>
          {onInviteClick && (
            <button
              onClick={onInviteClick}
              className="mx-auto mt-5 flex items-center gap-1.5 rounded-xl bg-emerald px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              <UserPlus size={15} />
              Invite student
            </button>
          )}
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
