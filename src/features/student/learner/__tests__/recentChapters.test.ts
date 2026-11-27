import { describe, it, expect } from "vitest";
import { makeRecentChapter } from "@/test/msw/handlers/learner";
import { asLearnerChapter, chapterPercent, chapterStatuses, continueChapter, subjectName } from "../recentChapters";

describe("recent chapters", () => {
  it("names a subject code with the student's own subject name", () => {
    const mine = ["Mathematics", "Social Science", "Social & Political Science"];
    expect(subjectName("mathematics", mine)).toBe("Mathematics");
    expect(subjectName("social_science", mine)).toBe("Social Science");
    expect(subjectName("social_and_political_science", mine)).toBe("Social & Political Science");
    expect(subjectName("computer_science", mine)).toBe("Computer Science"); // not one of theirs: made readable
  });

  it("measures progress through a chapter, a finished one being whole", () => {
    expect(chapterPercent(makeRecentChapter(1, { nodes_done: 3, nodes_total: 9 }))).toBe(33);
    expect(chapterPercent(makeRecentChapter(1, { nodes_done: 0, nodes_total: 0 }))).toBe(0);
    expect(chapterPercent(makeRecentChapter(1, { state: "completed", nodes_done: 10, nodes_total: 11 }))).toBe(100);
  });

  it("continues the most recent chapter still in progress", () => {
    const list = [
      makeRecentChapter(1, { state: "completed" }),
      makeRecentChapter(2, { state: "active" }),
      makeRecentChapter(3, { state: "active" }),
    ];
    expect(continueChapter(list)?.chapter_number).toBe(2);
    expect(continueChapter([makeRecentChapter(1, { state: "completed" })])).toBeNull();
  });

  it("hands the lesson page the chapter in its own shape", () => {
    const chapter = makeRecentChapter(7, { chapter_title: "SYNTHETIC Fractions", palette: "mathematics:0" });
    expect(asLearnerChapter(chapter)).toMatchObject({
      chapter_id: chapter.chapter_id,
      number: 7,
      title: "SYNTHETIC Fractions",
      palette: "mathematics:0",
      card: null,
    });
  });
});

describe("chapterStatuses", () => {
  const id = (n: number) => makeRecentChapter(n).chapter_id;

  it("reads each chapter's newest row, and marks the newest active one current", () => {
    const rows = [
      makeRecentChapter(3, { state: "abandoned" }),
      makeRecentChapter(2, { nodes_done: 4, nodes_total: 8 }),
      makeRecentChapter(1, { state: "active", completed_once: true, revisiting: true, nodes_done: 1, nodes_total: 9 }),
      makeRecentChapter(5, { state: "completed", nodes_done: 7, nodes_total: 9 }),
      makeRecentChapter(2, { state: "abandoned" }), // older row for chapter 2: ignored
      makeRecentChapter(9), // not in this subject: ignored
    ];
    const s = chapterStatuses([id(1), id(2), id(3), id(4), id(5)], rows);
    expect(s.get(id(2))).toEqual({ kind: "progress", done: 4, total: 8, percent: 50, current: true });
    expect(s.get(id(1))).toMatchObject({ kind: "revisit", current: false });
    expect(s.get(id(3))).toMatchObject({ kind: "restart", current: false });
    expect(s.get(id(4))).toMatchObject({ kind: "new", current: false });
    expect(s.get(id(5))).toMatchObject({ kind: "done", percent: 100 });
    expect(s.has(id(9))).toBe(false);
  });

  it("keeps a finished chapter finished, and has no current chapter when none is active", () => {
    const s = chapterStatuses([id(1)], [makeRecentChapter(1, { state: "abandoned", completed_once: true })]);
    expect(s.get(id(1))).toMatchObject({ kind: "done", current: false });
  });
});
