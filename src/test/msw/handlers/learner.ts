import { http, HttpResponse } from "msw";
import type { InstanceState, LearnerChapter } from "@/features/student/learner/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/**
 * SYNTHETIC student chapter list (ADR 0014 decision 9). Titles are labelled
 * SYNTHETIC: the backend's rule is no invented curriculum content, not even in
 * UI fixtures. Two books, one chapter with an accepted card, the rest without.
 */
let seq = 0;

export function makeChapter(overrides: Partial<LearnerChapter> = {}): LearnerChapter {
  seq += 1;
  return {
    chapter_id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    source_id: `synthetic-press-synthetic-book-6-ch${seq}-abcdef01`,
    number: seq,
    title: `SYNTHETIC chapter ${seq}`,
    book_title: "SYNTHETIC Book",
    palette: `mathematics:${(seq - 1) % 6}`,
    card: null,
    ...overrides,
  };
}

const store: { subject: string; grade: number; chapters: LearnerChapter[] } = { subject: "Mathematics", grade: 6, chapters: [] };
const instances = new Map<string, InstanceState>();
/** How many list reads, for asserting refetches. */
export let chapterListReads = 0;
/** The last opened chapter, for asserting what a tile sent. */
export let lastOpenedChapter: string | null = null;

export const learnerFixture = {
  /** Pass a factory so `makeChapter` numbering restarts at 1 in every test. */
  reset(build?: () => LearnerChapter[]) {
    seq = 0;
    chapterListReads = 0;
    lastOpenedChapter = null;
    instances.clear();
    store.chapters = build?.() ?? [
      makeChapter({ card: { image_url: "/v1/visual-images/card-1?exp=1&sig=synthetic", width: 1600, height: 1000 } }),
      makeChapter(),
      makeChapter({ book_title: "SYNTHETIC Second Book", number: 1 }),
    ];
  },
  set: (chapters: LearnerChapter[]) => void (store.chapters = chapters),
  instance: (id: string) => instances.get(id),
};

learnerFixture.reset();

export const learnerHandlers = [
  http.get(`${BASE}/v1/learner/chapters`, ({ request }) => {
    chapterListReads += 1;
    const subject = new URL(request.url).searchParams.get("subject") ?? "";
    // The backend scopes by subject; this fixture only has Mathematics chapters.
    const chapters = subject === store.subject ? store.chapters : [];
    return HttpResponse.json({ subject, grade: store.grade, chapters });
  }),

  http.post(`${BASE}/v1/chapters/:chapterId/instances`, ({ params }) => {
    const chapterId = String(params.chapterId);
    lastOpenedChapter = chapterId;
    if (!store.chapters.some((c) => c.chapter_id === chapterId)) {
      return HttpResponse.json({ message: "This chapter isn't available to you." }, { status: 404 });
    }
    const id = `11111111-0000-4000-8000-${chapterId.slice(-12)}`;
    const instance: InstanceState = instances.get(id) ?? {
      id,
      chapter_id: chapterId,
      state: "active",
      next_action: "learn",
      nodes_done: 2,
      nodes_total: 8,
    };
    instances.set(id, instance);
    return HttpResponse.json(instance);
  }),

  http.get(`${BASE}/v1/instances/:instanceId`, ({ params }) => {
    const instance = instances.get(String(params.instanceId));
    return instance
      ? HttpResponse.json(instance)
      : HttpResponse.json({ message: "This lesson was not found." }, { status: 404 });
  }),
];
