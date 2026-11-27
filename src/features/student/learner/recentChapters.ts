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

/**
 * Where the student stands on one chapter, for its tile on the chapter page:
 * - `done`: finished at least once (a finished chapter stays finished);
 * - `revisit`: finished once and open again to review;
 * - `progress`: under way;
 * - `restart`: started once but left (opening it starts it afresh);
 * - `new`: never opened (not in the recent list).
 * `current` marks the one chapter to pick up: the subject's most recently active one.
 */
export type ChapterStatusKind = "done" | "revisit" | "progress" | "restart" | "new";

export interface ChapterStatus {
  kind: ChapterStatusKind;
  done: number;
  total: number;
  /** 0–100; 100 for a finished chapter. */
  percent: number;
  current: boolean;
}

/** Each chapter's status, by chapter id, from the recent list (newest first); chapters it doesn't name are `new`. */
export function chapterStatuses(chapterIds: string[], recent: RecentChapter[]): Map<string, ChapterStatus> {
  const ids = new Set(chapterIds);
  const newest = new Map<string, RecentChapter>();
  for (const row of recent) if (ids.has(row.chapter_id) && !newest.has(row.chapter_id)) newest.set(row.chapter_id, row);
  const current = continueChapter([...newest.values()]); // still newest first

  const out = new Map<string, ChapterStatus>();
  for (const id of chapterIds) {
    const row = newest.get(id);
    if (!row) {
      out.set(id, { kind: "new", done: 0, total: 0, percent: 0, current: false });
      continue;
    }
    const finished = row.state === "completed" || !!row.completed_once;
    const kind: ChapterStatusKind =
      row.state === "active" ? (finished || row.revisiting ? "revisit" : "progress") : finished ? "done" : "restart";
    out.set(id, {
      kind,
      done: row.nodes_done,
      total: row.nodes_total,
      percent: kind === "done" ? 100 : chapterPercent(row),
      current: row === current,
    });
  }
  return out;
}
