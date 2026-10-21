import { describe, it, expect } from "vitest";

import { rosterCounts, filterAndSortRoster } from "../rosterUtils";
import type { TeacherStudent } from "../../services/teacherService";

const students: TeacherStudent[] = [
  { student_id: "s1", status: "APPROVED", subject: "Math", name: "Charlie" },
  { student_id: "s2", status: "PENDING", subject: "Science", name: "alice" },
  { student_id: "s3", status: "APPROVED", subject: "Math", username: "bob_the_builder" },
  { student_id: "s4", status: "PENDING", subject: "Math", email: "dora@x.com" },
];

describe("rosterCounts", () => {
  it("counts all / pending / approved independent of any filter", () => {
    expect(rosterCounts(students)).toEqual({ all: 4, pending: 2, approved: 2 });
  });

  it("is zeroed for an empty roster", () => {
    expect(rosterCounts([])).toEqual({ all: 0, pending: 0, approved: 0 });
  });
});

const baseQuery = { statusFilter: "all" as const, subjectFilter: "all", search: "", sort: "status" as const };

describe("filterAndSortRoster — filtering", () => {
  it("filters by status", () => {
    const res = filterAndSortRoster(students, { ...baseQuery, statusFilter: "PENDING" });
    expect(res.map((s) => s.student_id).sort()).toEqual(["s2", "s4"]);
  });

  it("filters by subject", () => {
    const res = filterAndSortRoster(students, { ...baseQuery, subjectFilter: "Math" });
    expect(res).toHaveLength(3);
    expect(res.every((s) => s.subject === "Math")).toBe(true);
  });

  it("search matches name, then username, then email — case-insensitively", () => {
    expect(filterAndSortRoster(students, { ...baseQuery, search: "ALICE" }).map((s) => s.student_id)).toEqual(["s2"]);
    expect(filterAndSortRoster(students, { ...baseQuery, search: "builder" }).map((s) => s.student_id)).toEqual(["s3"]);
    expect(filterAndSortRoster(students, { ...baseQuery, search: "dora@" }).map((s) => s.student_id)).toEqual(["s4"]);
  });

  it("combines status + subject + search (all must match)", () => {
    const res = filterAndSortRoster(students, {
      ...baseQuery,
      statusFilter: "PENDING",
      subjectFilter: "Math",
      search: "dora",
    });
    expect(res.map((s) => s.student_id)).toEqual(["s4"]);
  });
});

describe("filterAndSortRoster — sorting", () => {
  it('sort="name" is alphabetical, falling back name → username', () => {
    const res = filterAndSortRoster(students, { ...baseQuery, sort: "name" });
    // "alice", "bob_the_builder" (username), "Charlie", "" (s4 has only email → empty key, sorts first)
    expect(res.map((s) => s.name || s.username || "")).toEqual(["", "alice", "bob_the_builder", "Charlie"]);
  });

  it('sort="status" groups PENDING before APPROVED', () => {
    const res = filterAndSortRoster(students, { ...baseQuery, sort: "status" });
    const statuses = res.map((s) => s.status);
    expect(statuses.slice(0, 2)).toEqual(["PENDING", "PENDING"]);
    expect(statuses.slice(2)).toEqual(["APPROVED", "APPROVED"]);
  });

  it('sort="low" also falls back to status grouping (no mastery data yet)', () => {
    const res = filterAndSortRoster(students, { ...baseQuery, sort: "low" });
    expect(res[0].status).toBe("PENDING");
  });

  it("does not mutate the input array", () => {
    const snapshot = students.map((s) => s.student_id);
    filterAndSortRoster(students, { ...baseQuery, sort: "name" });
    expect(students.map((s) => s.student_id)).toEqual(snapshot);
  });
});
