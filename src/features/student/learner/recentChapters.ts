import type { LearnerChapter, RecentChapter } from "./types";

/**
 * Turning the recent-chapters API rows into what the home page shows and what the lesson page expects.
 */

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/**
 * The subject's display name ("Social Science") for an API code ("social_science"): the student's own subject
 * when one matches, else the code made readable.
 */
export function subjectName(code: string, subjects: string[] = []): string {
  const key = norm(code);
  const match = subjects.find((s) => norm(s) === key);
  if (match) return match;
  return code
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** How far through the chapter, 0–100: a finished chapter is 100 whatever its count says. */
export function chapterPercent(chapter: RecentChapter): number {
  if (chapter.state === "completed") return 100;
  if (!(chapter.nodes_total > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((chapter.nodes_done / chapter.nodes_total) * 100)));
}

/** The chapter to continue: the most recently active one still in progress (the list is newest first). */
export function continueChapter(chapters: RecentChapter[]): RecentChapter | null {
  return chapters.find((c) => c.state === "active") ?? null;
}

/** The lesson page's chapter shape (`useLessonLaunch`), so it can show the title and colours straight away. */
export function asLearnerChapter(chapter: RecentChapter): LearnerChapter {
  return {
    chapter_id: chapter.chapter_id,
    source_id: "", // not in the recent list, and nothing on the lesson page reads it
    number: chapter.chapter_number,
    title: chapter.chapter_title,
    book_title: chapter.book_title,
    palette: chapter.palette,
    card: chapter.card,
  };
}
