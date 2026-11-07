import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The deterministic lesson renderers in a real browser, against the local fixture page only (`/dev/checks`; no backend). Each test uses
 * real key presses (Tab, Space, Enter, arrows, Backspace) and checks where the focus is, what is submitted, and what the learner is told.
 * The `tablet-touch` project repeats the tap alternatives for a Grade 3-5 learner (touch, no keyboard).
 */
const answers = (page: Page) => page.evaluate(() => window.__answers as Array<{ item_id: string; channel: string; response: unknown }>);

async function open(page: Page, format: string, grade = 6) {
  await page.goto(`/dev/checks?format=${format}&grade=${grade}`);
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible({ timeout: 45_000 }); // the first visit compiles the page
}

/** Tab until `target` has focus: the way a keyboard user reaches a control. */
async function tabTo(page: Page, target: Locator, limit = 60) {
  for (let i = 0; i < limit; i += 1) {
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

const submitButton = (page: Page) => page.getByRole("button", { name: /check answer/i });

async function submitByKeyboard(page: Page) {
  await tabTo(page, submitButton(page));
  await page.keyboard.press("Enter");
}

const right = (page: Page) => expect(page.getByText("That's right!")).toBeVisible();
const wrong = (page: Page) => expect(page.getByText(/Not quite/)).toBeVisible();

test.describe("keyboard", () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== "desktop", "keyboard paths run in the desktop project"));  

  test("multiple select: Space chooses, Tab moves, the answer is the set chosen", async ({ page }) => {
    await open(page, "multiple_select");
    await tabTo(page, page.getByRole("checkbox", { name: "2" }));
    await page.keyboard.press("Space");
    await tabTo(page, page.getByRole("checkbox", { name: "4" }));
    await page.keyboard.press("Space");
    await expect(page.getByRole("checkbox", { name: "2" })).toBeChecked();
    await submitByKeyboard(page);
    await right(page);
    expect((await answers(page))[0]).toMatchObject({ channel: "choice", response: { kind: "choice", option_ids: ["o1", "o3"] } });
  });

  test("multiple select: a wrong set is feedback, not an error", async ({ page }) => {
    await open(page, "multiple_select");
    await tabTo(page, page.getByRole("checkbox", { name: "3" }));
    await page.keyboard.press("Space");
    await submitByKeyboard(page);
    await wrong(page);
  });

  test("matching: each pair is made with the keyboard and the pairs are sent in the entry order", async ({ page }) => {
    await open(page, "matching");
    for (const [entry, sound] of [["cat", "meow"], ["cow", "moo"], ["dog", "woof"]]) {
      const select = page.getByRole("combobox", { name: `Match ${entry}` });
      await tabTo(page, select);
      await page.keyboard.type(sound);
      await expect(select).toHaveValue(sound);
    }
    await expect(page.getByRole("combobox", { name: "Match cow" }).getByRole("option", { name: "meow" })).toBeDisabled();
    await submitByKeyboard(page);
    await right(page);
    expect((await answers(page))[0]).toMatchObject({ response: { kind: "pairs", pairs: [{ left: "cat", right: "meow" }, { left: "cow", right: "moo" }, { left: "dog", right: "woof" }] } });
  });

  test("sequencing: move buttons reorder, the focus stays with the entry being moved, and the order is sent", async ({ page }) => {
    await open(page, "sequencing");
    const up = page.getByRole("button", { name: "Move first up" });
    await tabTo(page, up);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "first: place 1 of 3" })).toBeAttached();
    const items = page.getByRole("list", { name: /your order/i }).getByRole("listitem");
    await expect(items.nth(0)).toContainText("first");
    await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement)?.closest("li")?.textContent ?? "")).toContain("first");
    await tabTo(page, page.getByRole("button", { name: "Move second down" }));
    await submitByKeyboard(page);
    await right(page);
    expect((await answers(page))[0]).toMatchObject({ response: { kind: "ordered", items: ["first", "second", "third"] } });
  });

  test("number line: the arrow keys move the point, Home and End jump to the ends, and the point is what is sent", async ({ page }) => {
    await open(page, "number_line");
    const range = page.getByRole("slider");
    await expect(range).toHaveAttribute("aria-valuetext", "Not placed yet");
    await tabTo(page, range);
    await page.keyboard.press("End");
    await expect(range).toHaveAttribute("aria-valuetext", "Your point: 10");
    await page.keyboard.press("Home");
    for (let i = 0; i < 6; i += 1) await page.keyboard.press("ArrowRight");
    await expect(range).toHaveAttribute("aria-valuetext", "Your point: 6");
    await submitByKeyboard(page);
    await right(page);
    expect((await answers(page))[0]).toMatchObject({ response: { kind: "numeric", value: "6" } });
  });

  test("number line: the number can be typed instead", async ({ page }) => {
    await open(page, "number_line");
    await tabTo(page, page.getByLabel("Or type the number"));
    await page.keyboard.type("6");
    await expect(page.getByText("Your point: 6")).toBeVisible();
    await submitByKeyboard(page);
    await right(page);
  });

  test("slider: arrows and Page keys step it, and a wrong value is feedback", async ({ page }) => {
    await open(page, "slider");
    const range = page.getByRole("slider");
    await tabTo(page, range);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(range).toHaveAttribute("aria-valuetext", "Your point: 3");
    await submitByKeyboard(page);
    await right(page);
    expect((await answers(page))[0]).toMatchObject({ response: { kind: "numeric", value: "3" } });
  });

  test("tiles: Enter adds a tile, the focus moves on to the next tile, Backspace takes the last back, and the expression is sent", async ({ page }) => {
    await open(page, "tiles");
    await tabTo(page, page.getByRole("button", { name: "Add 2" }));
    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toMatch(/^Add /);
    for (const tile of ["*", "x", "+", "-"]) {
      await tabTo(page, page.getByRole("button", { name: `Add ${tile}` }));
      await page.keyboard.press("Enter");
    }
    await expect(page.getByRole("button", { name: "Add 3" })).toBeFocused(); // the used tile disabled and the focus moved on
    await page.keyboard.press("Backspace");
    await expect(page.getByRole("button", { name: "Remove -" })).toHaveCount(0);
    await tabTo(page, page.getByRole("button", { name: "Add 3" }));
    await page.keyboard.press("Enter");
    await submitByKeyboard(page);
    await right(page);
    expect((await answers(page))[0]).toMatchObject({ response: { kind: "text", text: "2 * x + 3" } });
  });

  test("grouping: Space chooses a group for each entry, two entries may share one, and the pairs are sent", async ({ page }) => {
    await open(page, "grouping");
    for (const [entry, group] of [["apple", "red"], ["banana", "yellow"], ["cherry", "red"]]) {
      await tabTo(page, page.getByRole("radiogroup", { name: `Group for ${entry}` }).getByRole("radio", { name: group }));
      await page.keyboard.press("Space");
      await expect(page.getByRole("radiogroup", { name: `Group for ${entry}` }).getByRole("radio", { name: group })).toBeChecked();
    }
    await submitByKeyboard(page);
    await right(page);
    expect((await answers(page))[0]).toMatchObject({ response: { kind: "pairs", pairs: [{ left: "apple", right: "red" }, { left: "banana", right: "yellow" }, { left: "cherry", right: "red" }] } });
  });

  test("blanks: Enter fills the current blank, the focus moves on to the next bank entry, and the pairs are sent", async ({ page }) => {
    await open(page, "blanks");
    await expect(page.getByRole("button", { name: "Blank 1: empty" })).toHaveAttribute("aria-pressed", "true");
    await tabTo(page, page.getByRole("button", { name: "alpha", exact: true }));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "beta", exact: true })).toBeFocused(); // the used entry disabled; focus moved on
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "gamma", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Blank 3: gamma" })).toBeVisible();
    await submitByKeyboard(page);
    await right(page);
    expect((await answers(page))[0]).toMatchObject({ response: { kind: "pairs", pairs: [{ left: "1", right: "alpha" }, { left: "2", right: "beta" }, { left: "3", right: "gamma" }] } });
  });

  test("blanks: a filled blank is emptied from the keyboard and filled again", async ({ page }) => {
    await open(page, "blanks");
    await tabTo(page, page.getByRole("button", { name: "beta", exact: true }));
    await page.keyboard.press("Enter");
    await tabTo(page, page.getByRole("button", { name: "Blank 1: beta" }));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Blank 1: empty" })).toBeVisible();
    await expect(page.getByRole("button", { name: "beta", exact: true })).toBeEnabled();
  });
});

test.describe("tap, Grade 3-5 (touch, no keyboard)", () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== "tablet-touch", "tap paths run in the touch project"));  

  test("multiple select", async ({ page }) => {
    await open(page, "multiple_select", 4);
    await page.getByText("2", { exact: true }).tap();
    await page.getByText("4", { exact: true }).tap();
    await submitButton(page).tap();
    await right(page);
  });

  test("sequencing", async ({ page }) => {
    await open(page, "sequencing", 4);
    await page.getByRole("button", { name: "Move first up" }).tap();
    await page.getByRole("button", { name: "Move first up" }).tap();
    await submitButton(page).tap();
    await right(page);
  });

  test("number line: larger and smaller buttons, no dragging needed", async ({ page }) => {
    await open(page, "number_line", 4);
    for (let i = 0; i < 7; i += 1) await page.getByRole("button", { name: "Larger" }).tap();
    await expect(page.getByText("Your point: 6")).toBeVisible();
    await submitButton(page).tap();
    await right(page);
  });

  test("slider: larger button", async ({ page }) => {
    await open(page, "slider", 4);
    for (let i = 0; i < 4; i += 1) await page.getByRole("button", { name: "Larger" }).tap();
    await expect(page.getByText("Your point: 3")).toBeVisible();
    await submitButton(page).tap();
    await right(page);
  });

  test("tiles: tap to add and to take back", async ({ page }) => {
    await open(page, "tiles", 4);
    for (const tile of ["2", "*", "x", "+", "-"]) await page.getByRole("button", { name: `Add ${tile}` }).tap();
    await page.getByRole("button", { name: "Remove -" }).tap();
    await page.getByRole("button", { name: "Add 3" }).tap();
    await submitButton(page).tap();
    await right(page);
  });

  test("grouping: one tap per entry", async ({ page }) => {
    await open(page, "grouping", 4);
    await page.getByRole("radiogroup", { name: "Group for apple" }).getByRole("radio", { name: "red" }).tap();
    await page.getByRole("radiogroup", { name: "Group for banana" }).getByRole("radio", { name: "yellow" }).tap();
    await page.getByRole("radiogroup", { name: "Group for cherry" }).getByRole("radio", { name: "red" }).tap();
    await submitButton(page).tap();
    await right(page);
  });

  test("blanks: tap the bank entries in order", async ({ page }) => {
    await open(page, "blanks", 4);
    for (const word of ["alpha", "beta", "gamma"]) await page.getByRole("button", { name: word, exact: true }).tap();
    await submitButton(page).tap();
    await right(page);
  });

  test("matching: each pair is chosen from a list on a touch screen", async ({ page }) => {
    await open(page, "matching", 4);
    for (const [entry, sound] of [["cat", "meow"], ["cow", "moo"], ["dog", "woof"]]) {
      await page.getByRole("combobox", { name: `Match ${entry}` }).selectOption(sound);
    }
    await submitButton(page).tap();
    await right(page);
  });
});

test.describe("written response (W2 P6)", () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== "desktop", "keyboard paths run in the desktop project"));

  test("is labelled, counts characters, and sends by keyboard (Tab to the box, type, Ctrl+Enter)", async ({ page }) => {
    await page.goto("/dev/checks?format=written&grade=6");
    const box = page.getByRole("textbox", { name: "Your answer" });
    await expect(box).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: /send answer/i })).toBeDisabled();
    await tabTo(page, box);
    await page.keyboard.type("Plants need water and light");
    await expect(page.getByText(/27 of 400 characters/)).toBeVisible();
    await page.keyboard.press("Control+Enter");
    await expect(page.getByText(/You showed: names two needs/)).toBeVisible();
    expect(((await answers(page)) as unknown as Array<{ text: string }>)[0].text).toBe("Plants need water and light");
  });

  test("a failed send keeps the answer and the SAME request id, so the retry is one answer, not two", async ({ page }) => {
    await page.goto("/dev/checks?format=written&grade=6");
    const box = page.getByRole("textbox", { name: "Your answer" });
    await expect(box).toBeVisible({ timeout: 45_000 });
    await box.fill("this will fail first, water and light");
    await page.getByRole("button", { name: /send answer/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: "be sent" })).toBeVisible();
    await expect(box).toHaveValue("this will fail first, water and light");
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(page.getByText(/You showed/)).toBeVisible();
    const sent = (await answers(page)) as unknown as Array<{ request_id: string }>;
    expect(sent.length).toBe(2);
    expect(sent[0].request_id).toBe(sent[1].request_id);
  });

  test("an answer that cannot be placed gets one neutral question, answered in a second box, sent with the first", async ({ page }) => {
    await page.goto("/dev/checks?format=written&grade=6");
    const box = page.getByRole("textbox", { name: "Your answer" });
    await expect(box).toBeVisible({ timeout: 45_000 });
    await box.fill("ambiguous plants need water");
    await page.getByRole("button", { name: /send answer/i }).click();
    await expect(page.getByText("Can you tell me one more thing plants need?")).toBeVisible();
    await page.getByRole("textbox", { name: /your reply/i }).fill("and light, water and light");
    await page.getByRole("button", { name: /send answer/i }).click();
    await expect(page.getByText(/You showed/)).toBeVisible();
  });

  test("a result that could not be rated is a neutral note, never 'wrong', and the learner may answer again", async ({ page }) => {
    await page.goto("/dev/checks?format=written&grade=6");
    const box = page.getByRole("textbox", { name: "Your answer" });
    await expect(box).toBeVisible({ timeout: 45_000 });
    await box.fill("gate answer words");
    await page.getByRole("button", { name: /send answer/i }).click();
    await expect(page.getByText(/couldn't be rated this time/)).toBeVisible();
    await expect(page.getByText(/Not quite/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send answer/i })).toBeEnabled();
  });
});
