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
});

const baseQuery = { statusFilter: "all" as const, subjectFilter: "all", search: "", sort: "status" as const };

describe("filterAndSortRoster — filtering", () => {
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
  it('sort="status" groups PENDING before APPROVED', () => {
    const res = filterAndSortRoster(students, { ...baseQuery, sort: "status" });
    const statuses = res.map((s) => s.status);
    expect(statuses.slice(0, 2)).toEqual(["PENDING", "PENDING"]);
    expect(statuses.slice(2)).toEqual(["APPROVED", "APPROVED"]);
  });

});
