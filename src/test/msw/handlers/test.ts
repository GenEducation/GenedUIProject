import { http, HttpResponse } from "msw";
import { makeChapterTest } from "../../fixtures/chapterTest";
import { makeSubmitResult } from "../../fixtures/submitResult";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/** Happy-path test-taking handlers; the test-flow suite overrides submit to capture the body. */
export const testHandlers = [
  http.post(`${BASE}/create-chapter-test`, () => HttpResponse.json(makeChapterTest())),
  http.post(`${BASE}/tests/:testId/submit`, () => HttpResponse.json(makeSubmitResult())),
];
