import type { Page, Route } from "@playwright/test";

/** The gateway every portal talks to. Specs must not redeclare this. */
export const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://gateway-service-dev-479218009109.asia-south1.run.app";

/** Fulfil `route` with `body` as JSON. */
export function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * A per-spec override. Return a truthy value (normally the `json(...)` promise)
 * to claim the request; return `undefined` to fall through to the shared
 * defaults below.
 */
export type StubHandler = (url: string, route: Route) => unknown;

/**
 * The student portal routes every subject value through the taxonomy catalogue.
 * `parseCatalog` (src/features/subjects/subjectCatalog.ts) rejects anything that
 * is not `{ subjects: [{ name, grades: number[] }] }`, so a bare `[]` here makes
 * it throw and the whole portal boots empty.
 *
 * Keep these names in step with LEARNING_PARTNERS below — `requireExactSubject`
 * drops any agent whose subject/grade pair is absent from the catalogue.
 */
export const TAXONOMY_SUBJECTS = [
  { name: "Science", grades: [6, 7, 8, 9, 10] },
  { name: "Mathematics", grades: [6, 7, 8, 9, 10] },
];

/**
 * The `available-agents` payload, shaped for the store's flattener
 * (`partners[].subjects[].agents[]`).
 *
 * Two fields are load-bearing and easy to omit by accident:
 *  - `board` — `fetchAgents` throws "The effective learning partner is missing
 *    its education board" without it; it selects the catalogue agents are
 *    validated against.
 *  - `agents` — a subject with no agents produces no subject card at all.
 */
export const LEARNING_PARTNERS = {
  partners: [
    {
      partner_id: "p1",
      board: "CBSE",
      subjects: [
        {
          subject: "Science",
          is_onboarding_complete: true,
          subject_coverage_percentage: 50,
          agents: [{ agent_id: "a1", name: "Aanya", subject: "Science", grade: 6 }],
        },
      ],
    },
  ],
};

/**
 * Registers the shared catch-all: empty-but-*valid* JSON for every API call a
 * portal fires on mount. "Valid" matters — several endpoints are read as a
 * specific shape, and a bare `[]` throws rather than rendering an empty state.
 *
 * `overrides` run before the defaults, so a spec can replace any of them.
 * Playwright gives later-registered routes precedence, so `page.route` calls
 * made after this one still win for specific endpoints.
 */
export async function stubApiCatchAll(page: Page, overrides: StubHandler[] = []) {
  await page.route(`${API}/**`, (route) => {
    const url = route.request().url();
    // Let non-API resources (Next.js chunks, _next/static, …) through.
    if (!url.includes(API)) return route.continue();

    for (const handler of overrides) {
      const handled = handler(url, route);
      if (handled) return handled;
    }

    if (url.includes("/rag/taxonomy/subjects")) return json(route, { subjects: TAXONOMY_SUBJECTS });
    if (url.includes("/api/students/") && url.includes("/available-agents"))
      return json(route, LEARNING_PARTNERS);
    // Read as `data.sessions.map(...)`, so it needs an object, not a bare list.
    if (url.includes("/get-session")) return json(route, { sessions: [] });

    return json(route, []);
  });
}
