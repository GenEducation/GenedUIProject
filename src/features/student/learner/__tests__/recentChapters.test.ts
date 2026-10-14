import { describe, it, expect } from "vitest";
import { makeRecentChapter } from "@/test/msw/handlers/learner";
import { asLearnerChapter, chapterPercent, continueChapter, subjectName } from "../recentChapters";

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
