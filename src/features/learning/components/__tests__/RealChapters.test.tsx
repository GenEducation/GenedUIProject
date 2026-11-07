/**
 * W1 on REAL chapter payloads (opt-in): set `W1_REAL_PAYLOADS` to the directory the backend's end-to-end test exported
 * (`ch1.json`, `ch13.json`: every step's payload as the lesson screen receives it). Skipped otherwise, so no textbook text is
 * part of the repository. For each real step the board must show what the payload holds, in the book's order, open only where
 * it should be, and the tutor-facing reading controls must follow the step's role.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { readFileSync, existsSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { LESSON_ID, lessonFixture, makeLessonInstance, syntheticPayload } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import type { TeacherPayload } from "../../types";
import { BoardPanel } from "../BoardPanel";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const DIR = process.env.W1_REAL_PAYLOADS;
const files = DIR ? ["ch1", "ch13"].filter((name) => existsSync(`${DIR}/${name}.json`)) : [];
const store = () => useLessonStore.getState();

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe.skipIf(!DIR)("real chapter payloads on the board", () => {
  for (const name of files) {
    const steps: Array<{ node: TeacherPayload["node"] & { passages?: NonNullable<TeacherPayload["node"]["passages"]> } }> = JSON.parse(
      readFileSync(`${DIR}/${name}.json`, "utf8"),
    );

    it(`${name}: every step shows its passage in the book's order, open only when the step reads or asks about it`, async () => {
      let shown = 0;
      for (const [index, step] of steps.entries()) {
        const base = syntheticPayload();
        const payload = { ...base, schema_version: "teacher_node_v8", node: { ...base.node, ...step.node, figure_groups: [], check_items: [] } } as TeacherPayload;
        server.use(http.get(`${BASE}/v1/instances/:instanceId/teacher-payload`, () => HttpResponse.json(payload)));
        lessonFixture.setInstance(makeLessonInstance());
        store().reset();
        await store().load(LESSON_ID);
        const view = render(<BoardPanel subject="english" />);

        const role = step.node.reading_role;
        const passages = step.node.passages ?? [];
        const book = screen.queryByRole("complementary", { name: "In your book" });
        const toggle = screen.queryByRole("button", { name: /^(Book|Show in book)$/ });

        if (passages.length === 0) {
          expect(role === "pre_reading" || role === null || role === undefined, `step ${index}`).toBe(true);
          expect(book === null || toggle !== null).toBe(true);
          expect(screen.queryByRole("button", { name: "Read with me" })).toBeNull();
        } else {
          shown++;
          expect(book, `step ${index} opens by itself`).not.toBeNull();
          const expected = passages.flatMap((p) => p.segments.flatMap((s) => s.chunks.filter((c) => c.element_type !== "note").map((c) => c.text.replace(/\s+/g, " ").trim())));
          const rendered = within(book!).getAllByText((_, el) => el?.tagName === "P" && !el.closest("dl") && (el.textContent ?? "").trim().length > 30 && expected.some((t) => t.startsWith((el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30)))).map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
          expect(rendered, `step ${index} paragraphs, in order`).toEqual(expected.filter((t) => t.length > 30));
          expect(within(book!).getAllByRole("button", { name: "Read with me" })).toHaveLength(1);
          expect(within(book!).getAllByRole("button", { name: /^Listen$/ }).length).toBeGreaterThan(0);
        }
        view.unmount();
      }
      expect(shown, `${name}: steps that carry a passage`).toBeGreaterThan(0);
    }, 120_000);
  }
});
