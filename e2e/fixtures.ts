// Re-export the portable (no Vitest imports) fixture factories for use in E2E specs.
// Verified: none of these files import from "vitest".
export { makeAuthToken } from "../src/test/fixtures/authToken";
export { makeChapterTest } from "../src/test/fixtures/chapterTest";
export { makeSubmitResult } from "../src/test/fixtures/submitResult";
