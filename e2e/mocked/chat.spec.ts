import { test, expect } from "@playwright/test";
import { seedAuth } from "../helpers/auth";
import { joinSseFrames } from "../helpers/sse";
import { makeAuthToken } from "../fixtures";
import { API, stubApiCatchAll } from "../helpers/api";

const chunk = (text: string) => ({ type: "chunk", text });
// Emitting the real session_id frame is what drives the new-session navigation
// to /student/chat/{id} (see useStudentStore.startNewChatSession → sendMessage).
const sessionFrame = { type: "session_id", session_id: "sess-1", subject: "Science" };
const done = { type: "done", status: "success" };

test.describe("Chat — SSE streaming (real browser)", () => {
  test.beforeEach(async ({ page }) => {
    await stubApiCatchAll(page);

    const token = makeAuthToken({ role: "student" });
    await seedAuth(page, "student", token);
  });

  // Clicking a subject card's "Chat" button auto-sends "Hello", opening a new
  // session; the SSE reply streams the assistant's greeting and, via the
  // session_id frame, navigates to /student/chat/{id}.
  async function startChat(page: import("@playwright/test").Page) {
    await page.goto("/student");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Chat", exact: true }).first().click();
    await page.waitForURL(/\/student\/chat\//, { timeout: 10_000 });
  }

  test("assistant bubble shows accumulated text from streamed chunks", async ({ page }) => {
    // Register the chat SSE handler — must override the catch-all above
    await page.route(`${API}/text/april-query`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache" },
        body: joinSseFrames([sessionFrame, chunk("Photo"), chunk("synthesis"), done]),
      });
    });

    await startChat(page);

    // The two chunks are assembled into the assistant's greeting bubble
    await expect(page.getByText("Photosynthesis").first()).toBeVisible({ timeout: 10_000 });
  });

  test("multiple chunks are concatenated into a single assistant bubble", async ({ page }) => {
    await page.route(`${API}/text/april-query`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache" },
        body: joinSseFrames([sessionFrame, chunk("Part 1. "), chunk("Part 2."), done]),
      });
    });

    await startChat(page);

    await expect(page.getByText("Part 1. Part 2.").first()).toBeVisible({ timeout: 10_000 });
  });
});
