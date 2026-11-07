import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";

/**
 * The scored spoken answer (W2 P7) in a real browser: a real (fake-device) microphone is recorded and streamed as binary frames to the oral-answer socket,
 * which the test scripts like the server does (init -> ready -> audio -> stop -> result). It proves the browser side: permission, capture, frames, the
 * accessible states and keyboard operation. It does NOT prove the server (the real-socket backend tests do) or that real children are understood.
 */
const RESULT = {
  type: "result", status: "committed", attempt_id: "99999999-0000-4000-8000-000000000010", outcome: "correct", correct: true, heard: "plants need water and light",
  feedback: { kind: "criteria", criteria: [{ criterion: "needs", title: "Names two needs", met: true, shown: "names two needs", next: null, error_tags: [] }] },
  round_state: "open", revision: 6, replayed: false,
};

interface Seen { frames: string[]; binary: number }

async function script(page: Page, onStop: (ws: WebSocketRoute, seen: Seen) => void, seen: Seen) {
  await page.routeWebSocket(/\/v1\/voice\/oral-answer/, (ws) => {
    ws.onMessage((message) => {
      if (typeof message === "string") {
        const frame = JSON.parse(message) as { type: string };
        seen.frames.push(frame.type);
        if (frame.type === "init" || frame.type === "resume") ws.send(JSON.stringify({ type: "ready", utterance_id: "utt-1" }));
        if (frame.type === "stop") onStop(ws, seen);
      } else seen.binary += 1;
    });
  });
}

async function open(page: Page) {
  const start = page.getByRole("button", { name: "Start answering" });
  await page.goto("/dev/checks?format=spoken&grade=6");
  // The first visit of a cold dev server can lose a chunk while the page compiles (a dev-server artefact, not the page): load once more.
  if (!(await start.waitFor({ state: "visible", timeout: 25_000 }).then(() => true).catch(() => false))) await page.reload();
  await expect(start).toBeVisible({ timeout: 45_000 });
}

test.describe("spoken answer (W2 P7)", () => {
  test("records from the microphone, streams audio, sends stop and shows the verified feedback", async ({ page }) => {
    const seen: Seen = { frames: [], binary: 0 };
    await script(page, (ws) => ws.send(JSON.stringify(RESULT)), seen);
    await open(page);
    await page.getByRole("button", { name: "Start answering" }).click();
    await expect(page.getByText(/Listening… press Done/)).toBeVisible();
    await expect.poll(() => seen.binary, { timeout: 15_000 }).toBeGreaterThan(2);
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("I heard: plants need water and light")).toBeVisible();
    await expect(page.getByText(/You showed: names two needs/)).toBeVisible();
    expect(seen.frames).toEqual(["init", "stop"]);
    expect(seen.frames).not.toContain("transcript"); // the client never sends words
  });

  test("is operable by keyboard alone", async ({ page }) => {
    const seen: Seen = { frames: [], binary: 0 };
    await script(page, (ws) => ws.send(JSON.stringify(RESULT)), seen);
    await open(page);
    const start = page.getByRole("button", { name: "Start answering" });
    await start.focus();
    await page.keyboard.press("Enter");
    const done = page.getByRole("button", { name: "Done" });
    await expect(done).toBeVisible({ timeout: 15_000 });
    await done.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/You showed/)).toBeVisible();
  });

  test("an unclear recording is a neutral note, never 'wrong', and the learner can answer again", async ({ page }) => {
    const seen: Seen = { frames: [], binary: 0 };
    let first = true;
    await script(page, (ws) => {
      if (first) {
        first = false;
        ws.send(JSON.stringify({ type: "error", code: "unclear", feedback_code: "say_it_again", retry: true }));
      } else ws.send(JSON.stringify(RESULT));
    }, seen);
    await open(page);
    await page.getByRole("button", { name: "Start answering" }).click();
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "hear that clearly" })).toBeVisible();
    await expect(page.getByText(/wrong|incorrect/i)).toHaveCount(0);
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText(/You showed/)).toBeVisible();
  });

  test("a dropped connection is resumed with the kept attempt id, never a second attempt", async ({ page }) => {
    const seen: Seen = { frames: [], binary: 0 };
    let dropped = false;
    await page.routeWebSocket(/\/v1\/voice\/oral-answer/, (ws) => {
      ws.onMessage((message) => {
        if (typeof message !== "string") { seen.binary += 1; return; }
        const frame = JSON.parse(message) as { type: string; utterance_id?: string };
        seen.frames.push(frame.type === "resume" ? `resume:${frame.utterance_id}` : frame.type);
        if (frame.type === "init" || frame.type === "resume") ws.send(JSON.stringify({ type: "ready", utterance_id: "utt-1" }));
        if (frame.type === "init" && !dropped) setTimeout(() => { dropped = true; ws.close({ code: 1006 }); }, 600);
        if (frame.type === "stop") ws.send(JSON.stringify(RESULT));
      });
    });
    await open(page);
    await page.getByRole("button", { name: "Start answering" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "connection dropped" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText(/You showed/)).toBeVisible();
    expect(seen.frames.filter((f) => f === "init")).toHaveLength(1);
    expect(seen.frames).toContain("resume:utt-1");
  });

  test("a refusal (the rubric is not qualified) is shown plainly and cannot be retried", async ({ page }) => {
    await page.routeWebSocket(/\/v1\/voice\/oral-answer/, (ws) => {
      ws.onMessage((message) => {
        if (typeof message === "string" && JSON.parse(message).type === "init") ws.send(JSON.stringify({ type: "error", code: "assessment_unavailable", retry: false }));
      });
    });
    await open(page);
    await page.getByRole("button", { name: "Start answering" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Listening stopped|try again|can.t/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /answer again|try again|start answering/i })).toBeDisabled();
  });
});
