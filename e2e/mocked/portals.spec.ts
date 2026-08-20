import { test, expect } from "@playwright/test";
import { seedAuth, type Role } from "../helpers/auth";
import { makeAuthToken } from "../fixtures";
import { stubApiCatchAll } from "../helpers/api";

const PORTALS: { role: Role; path: string; landmark: string | RegExp }[] = [
  { role: "student", path: "/student", landmark: /study|learn|chat|hello|subject/i },
  { role: "teacher", path: "/teacher", landmark: /teacher|class|student|dashboard/i },
  { role: "parent", path: "/parent", landmark: /parent|child|progress/i },
];

for (const { role, path, landmark } of PORTALS) {
  test(`${role} portal — boots without console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const token = makeAuthToken({ role });
    await seedAuth(page, role, token);
    await stubApiCatchAll(page);

    await page.goto(path);

    // Wait for the page to settle (AuthGuard resolves, portal renders)
    await page.waitForLoadState("networkidle");

    // The URL must stay on (or under) the role's path — no unexpected redirect
    await expect(page).toHaveURL(new RegExp(`/${role}`));

    // At least one role-distinctive text is present in the page
    await expect(page.getByText(landmark).first()).toBeVisible({ timeout: 10_000 });

    // No JS console errors during load (network stubs prevent real-API noise)
    expect(errors).toHaveLength(0);
  });
}

test("admin portal — boots without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  const token = makeAuthToken({ role: "admin" });
  await seedAuth(page, "admin", token);
  await stubApiCatchAll(page);

  await page.goto("/admin");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveURL(/\/admin/);
  expect(errors).toHaveLength(0);
});
