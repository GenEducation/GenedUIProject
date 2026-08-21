import { test, expect } from "@playwright/test";
import { seedAuth, type Role } from "../helpers/auth";
import { stubApiCatchAll } from "../helpers/api";
import { axeViolations, formatViolations } from "../helpers/axe";

/**
 * Accessibility regression guard for the button design system.
 *
 * Scoped to the rule families this work actually fixed. The audit found ~110
 * icon-only buttons with no accessible name — a screen reader announced a bare
 * "button" — plus focus rings that were invisible (the login CTA rendered a
 * white outline on a white page). These rules keep that from coming back.
 *
 * Deliberately NOT a full axe run: the app has pre-existing violations in other
 * families (contrast, landmarks, heading order). An unscoped assertion would
 * fail on day one for reasons unrelated to buttons, and a suite that always
 * fails gets ignored. Widen `RULES` as each family is cleaned up.
 */
const RULES = [
  "button-name", // every button exposes an accessible name
  "aria-command-name",
  "aria-toggle-field-name",
  "nested-interactive", // a button inside a button has no reachable name
];

const PUBLIC_PAGES = ["/", "/login", "/register", "/forgot-password"];

for (const path of PUBLIC_PAGES) {
  test(`a11y: buttons on ${path} all have accessible names`, async ({ page }) => {
    // Stubbed even for public pages: /register fetches the taxonomy catalogue,
    // which never settles, so `networkidle` would hang. Waiting on a rendered
    // button is also a truer gate here — it is what the assertion inspects.
    await stubApiCatchAll(page);
    await page.goto(path);
    await page.locator("button").first().waitFor({ state: "attached" });

    const violations = await axeViolations(page, RULES);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
}

const PORTALS: { role: Role; path: string }[] = [
  { role: "student", path: "/student" },
  { role: "teacher", path: "/teacher" },
  { role: "parent", path: "/parent" },
];

for (const { role, path } of PORTALS) {
  test(`a11y: buttons in the ${role} portal all have accessible names`, async ({ page }) => {
    await stubApiCatchAll(page);
    await seedAuth(page, role);
    await page.goto(path);
    await page.locator("button").first().waitFor({ state: "attached" });

    const violations = await axeViolations(page, RULES);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
}
