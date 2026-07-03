import { test, expect } from "@playwright/test";
import { seedAuth } from "../helpers/auth";
import { joinSseFrames } from "../helpers/sse";
import { makeAuthToken } from "../fixtures";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gateway-service-dev-479218009109.asia-south1.run.app";

const chunk = (text: string) => ({ type: "chunk", text });
const done = { type: "done", status: "success" };

test.describe("Chat — SSE streaming (real browser)", () => {
  test.beforeEach(async ({ page }) => {
    // Stub all API calls that fire on portal mount (sessions, notifications, etc.)
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url();
      if (url.includes("/api/students/") && url.includes("/available-agents")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            partners: [{ subjects: [{ subject: "Science", agent_id: "a1", name: "Aanya", grade: 6 }] }],
          }),
        });
      }
      // Default: empty JSON for anything else
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    const token = makeAuthToken({ role: "student" });
    await seedAuth(page, "student", token);
  });

  test("user bubble appears immediately; assistant bubble shows accumulated text", async ({ page }) => {
    // Register the chat SSE handler — must override the catch-all above
    await page.route(`${API}/text/april-query`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache" },
        body: joinSseFrames([chunk("Photo"), chunk("synthesis"), done]),
      });
    });

    await page.goto("/student");
    await page.waitForLoadState("networkidle");

    // Find the chat input — it's a textarea in the hub or chat view
    const input = page.locator('textarea').first();
    await input.fill("What is photosynthesis?");

    // Submit with Enter (the form submits on Enter without Shift)
    await input.press("Enter");

    // User bubble renders synchronously before the stream resolves
    await expect(page.getByText("What is photosynthesis?")).toBeVisible({ timeout: 5_000 });

    // Wait for the assembled AI response
    await expect(page.getByText("Photosynthesis")).toBeVisible({ timeout: 10_000 });
  });

  test("multiple chunks are concatenated into a single assistant bubble", async ({ page }) => {
    await page.route(`${API}/text/april-query`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache" },
        body: joinSseFrames([chunk("Part 1. "), chunk("Part 2."), done]),
      });
    });

    await page.goto("/student");
    await page.waitForLoadState("networkidle");

    const input = page.locator('textarea').first();
    await input.fill("Tell me something");
    await input.press("Enter");

    await expect(page.getByText("Part 1. Part 2.")).toBeVisible({ timeout: 10_000 });
  });
});
