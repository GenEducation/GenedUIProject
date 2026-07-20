import type { StatusFilter, SortOption } from "../store/useTeacherStore";
import type { TeacherStudent } from "../services/teacherService";

export interface RosterCounts {
  all: number;
  pending: number;
  approved: number;
}

/** Tab badge counts for the roster (independent of the active filter/search). */
export function rosterCounts(students: TeacherStudent[]): RosterCounts {
  return {
    all: students.length,
    pending: students.filter((s) => s.status === "PENDING").length,
    approved: students.filter((s) => s.status === "APPROVED").length,
  };
}

export interface RosterQuery {
  statusFilter: StatusFilter;
  subjectFilter: string;
  search: string;
  sort: SortOption;
}

/**
 * Applies the roster's status/subject/search filters then sorts. Sorting by
 * "name" is alphabetical (falling back name → username); every other option
 * ("status" default, and "low" until mastery data exists) groups PENDING before
 * APPROVED. Returns a new array; never mutates the input.
 */
export function filterAndSortRoster(students: TeacherStudent[], q: RosterQuery): TeacherStudent[] {
  const list = students.filter((s) => {
    if (q.statusFilter !== "all" && s.status !== q.statusFilter) return false;
    if (q.subjectFilter !== "all" && s.subject !== q.subjectFilter) return false;
    if (q.search) {
      const name = (s.name || s.username || s.email || "").toLowerCase();
      if (!name.includes(q.search.toLowerCase())) return false;
    }
    return true;
  });

  return [...list].sort((a, b) => {
    if (q.sort === "name") {
      return (a.name || a.username || "").localeCompare(b.name || b.username || "");
    }
    const order: Record<string, number> = { PENDING: 0, APPROVED: 1 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });
}
