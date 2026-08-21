import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

/**
 * Runs axe-core against the current page.
 *
 * Uses the `axe-core` bundle already present in node_modules rather than adding
 * `@axe-core/playwright` — the source it needs is a single self-contained script,
 * so a new dependency would buy nothing.
 *
 * Read from a cwd-relative path, not `require.resolve`: Playwright transpiles
 * these specs to CJS, where `import.meta.url` (needed by `createRequire`) is
 * unavailable and throws "exports is not defined" at import time.
 */
const AXE_SOURCE = readFileSync(
  join(process.cwd(), "node_modules", "axe-core", "axe.min.js"),
  "utf8",
);

export interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[]; html: string }[];
}

/**
 * @param runOnly  Rule ids to check. Deliberately required: the app has
 *   pre-existing violations in other rule families (contrast, landmarks), so an
 *   unscoped run would fail on debt this work did not touch and the suite would
 *   be switched off within a week. Widen the list as each family is fixed.
 */
export async function axeViolations(
  page: Page,
  runOnly: string[],
): Promise<AxeViolation[]> {
  await page.evaluate(AXE_SOURCE);
  return page.evaluate(async (rules) => {
    // @ts-expect-error injected at runtime
    const results = await window.axe.run(document, {
      runOnly: { type: "rule", values: rules },
    });
    return results.violations.map((v: AxeViolation) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 160) })),
    }));
  }, runOnly);
}

/** Renders violations as a readable assertion message. */
export function formatViolations(violations: AxeViolation[]): string {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes.map((n) => `    ${n.target.join(" ")} — ${n.html}`).join("\n"),
    )
    .join("\n");
}
