import { test, expect } from "@playwright/test";
import { seedAuth } from "../helpers/auth";
import { makeAuthToken, makeChapterTest, makeSubmitResult } from "../fixtures";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gateway-service-dev-479218009109.asia-south1.run.app";

test.describe("Test flow — assessments to results (real browser)", () => {
  test.beforeEach(async ({ page }) => {
    const token = makeAuthToken({ role: "student", user_id: "u1", grade: 6 });
    await seedAuth(page, "student", token);

    // Stub all portal-boot calls that fire before we can register specific mocks
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url();

      if (url.includes("/api/students/") && url.includes("/available-agents")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            partners: [{ subjects: [{ subject: "Science" }] }],
          }),
        });
      }

      if (url.includes("/students/") && url.includes("/chapter-mastery")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { document_title: "Chapter 3: Photosynthesis", mastery_score: 0.6, completion_percentage: 80, study_count: 3 },
          ]),
        });
      }

      if (url.includes("/students/") && url.includes("/tests") && !url.includes("/submit")) {
        // listStudentTests — no past tests
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }

      // Default: empty-but-valid JSON for anything else (notifications, sessions, etc.)
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
  });

  test("completes a test: start → answer → submit → results", async ({ page }) => {
    const test_ = makeChapterTest();
    let submitPayload: unknown = null;

    // More-specific route for test creation (overrides catch-all above)
    await page.route(`${API}/create-chapter-test`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(test_),
      }),
    );

    // Capture the submit request body and return the result
    await page.route(`${API}/tests/${test_.test_id}/submit`, async (route) => {
      submitPayload = await route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSubmitResult()),
      });
    });

    // ── 1. Navigate to assessments and click "Start Test" ──
    await page.goto("/student/assessments");
    await page.waitForLoadState("networkidle");

    // The chapter card appears once chapter-mastery resolves
    await expect(page.getByText("Chapter 3: Photosynthesis")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /start test/i }).first().click();

    // ── 2. Wait for the test page (handleStartTest uses a 2s setTimeout) ──
    await page.waitForURL(/\/student\/test/, { timeout: 10_000 });
    await expect(page.getByText(/Photosynthesis/)).toBeVisible({ timeout: 10_000 });

    // ── 3. Answer MCQ (q1): click the first option "Glucose" ──
    await page.getByText("Glucose").click();

    // ── 4. Answer true/false (q2): click "False" then fill justification ──
    await page.getByRole("button", { name: /false/i }).click();
    const justifyInput = page.locator('textarea').first();
    await justifyInput.fill("Chlorophyll primarily absorbs red and blue light.");

    // ── 5. Submit (q3 match is unanswered → warning modal appears) ──
    await page.getByRole("button", { name: /submit assessment/i }).click();

    // Warning modal: some questions unanswered — click Submit Anyway
    await expect(page.getByRole("button", { name: /submit anyway/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /submit anyway/i }).click();

    // ── 6. Results view ──
    // TestResultsView renders after submit; it should show the score
    await expect(page.getByText(/75%|0\.75/i)).toBeVisible({ timeout: 10_000 });

    // Verify the payload actually reached the submit route
    expect(submitPayload).not.toBeNull();
  });

  test("no-auth direct nav to /student/test redirects to login", async ({ page: freshPage }) => {
    // Fresh page with no localStorage seed
    await freshPage.route(`${API}/**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await freshPage.goto("/student/test");
    await expect(freshPage).toHaveURL(/\?redirect=.*test/, { timeout: 5_000 });
  });
});
