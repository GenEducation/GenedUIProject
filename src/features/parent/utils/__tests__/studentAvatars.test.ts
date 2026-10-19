import { describe, it, expect } from "vitest";

import { assignStudentAvatars, STUDENT_AVATARS } from "../studentAvatars";

describe("assignStudentAvatars", () => {
  it("gives the same child the same icon regardless of API order", () => {
    const a = assignStudentAvatars(["s-1", "s-2", "s-3"]);
    const b = assignStudentAvatars(["s-3", "s-1", "s-2"]);
    expect(a).toEqual(b);
    expect(STUDENT_AVATARS).toContain(a["s-1"]);
  });

  it("never gives siblings the same icon while icons remain", () => {
    const ids = Array.from({ length: STUDENT_AVATARS.length }, (_, i) => `child-${i}`);
    const assigned = assignStudentAvatars(ids);
    expect(new Set(Object.values(assigned)).size).toBe(STUDENT_AVATARS.length);
  });

  it("still assigns an icon to every child beyond the icon count", () => {
    const ids = Array.from({ length: STUDENT_AVATARS.length + 3 }, (_, i) => `child-${i}`);
    const assigned = assignStudentAvatars(ids);
    expect(Object.keys(assigned)).toHaveLength(ids.length);
    ids.forEach((id) => expect(STUDENT_AVATARS).toContain(assigned[id]));
  });
});
