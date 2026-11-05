import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import {
  FIGURE_GROUP, LESSON_ID, answerRequests, forbiddenRequests, lessonFixture, makeLessonInstance, stepRequests, syntheticPayload, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import type { Passage, ReadingRole, TeacherPayload } from "../../types";
import { BoardPanel } from "../BoardPanel";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const store = () => useLessonStore.getState();
const chunk = (id: string, text: string, element_type = "paragraph") => ({ id, element_type, text, page: 1 });

const PASSAGE: Passage = {
  id: "story-1",
  title: "SYNTHETIC story",
  segments: [
    { segment: 1, chunks: [chunk("a", "SYNTHETIC part one."), chunk("g", "tended: looked after", "note")] },
    { segment: 2, chunks: [chunk("b", "SYNTHETIC part two.")] },
  ],
};

async function open(reading: { role?: ReadingRole | null; passages?: Passage[] } | null) {
  server.use(
    http.get(`${BASE}/v1/instances/:instanceId/teacher-payload`, () => {
      const base = syntheticPayload();
      const payload: TeacherPayload = reading
        ? { ...base, schema_version: "teacher_node_v8", node: { ...base.node, reading_role: reading.role ?? null, passages: reading.passages ?? [] } }
        : base;
      return HttpResponse.json(payload);
    }),
  );
  lessonFixture.setInstance(makeLessonInstance());
  await store().load(LESSON_ID);
  return render(<BoardPanel subject="english" />);
}

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", teacher_text: "SYNTHETIC look.", created_at: "x", figure_group_ids: [FIGURE_GROUP] }]);
});

describe("BookPanel on the board", () => {
  it("opens by itself on a post-reading step with the text in the book's order and the glossary apart", async () => {
    await open({ role: "post_reading", passages: [PASSAGE] });

    const book = screen.getByRole("complementary", { name: "In your book" });
    const paragraphs = within(book).getAllByText(/SYNTHETIC part/).map((p) => p.textContent);
    expect(paragraphs).toEqual(["SYNTHETIC part one.", "SYNTHETIC part two."]);
    expect(within(book).getByRole("term")).toHaveTextContent("tended");
    expect(screen.getByRole("button", { name: "Book" })).toHaveAttribute("aria-pressed", "true");
  });

  it("lets the learner close it, open it again and jump back to an earlier part, sending nothing to the server", async () => {
    await open({ role: "post_reading", passages: [PASSAGE] });
    const sent = () => [turnRequests.length, answerRequests.length, stepRequests.length, forbiddenRequests.length];
    const before = sent();

    fireEvent.click(within(screen.getByRole("navigation", { name: "Parts of the text" })).getByRole("button", { name: "Part 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Close the book" }));
    expect(screen.queryByRole("complementary", { name: "In your book" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    expect(screen.getByRole("complementary", { name: "In your book" })).toBeInTheDocument();

    expect(sent()).toEqual(before);
  });

  it("stays closed on a pre-reading step, whose activities must not assume the text was read", async () => {
    await open({ role: "pre_reading", passages: [] });

    expect(screen.queryByRole("button", { name: "Book" })).toBeNull();
    expect(screen.queryByRole("complementary", { name: "In your book" })).toBeNull();
  });

  it("is absent for a lesson stored before the reading fields existed", async () => {
    await open(null);

    expect(screen.queryByRole("button", { name: "Book" })).toBeNull();
  });
});
