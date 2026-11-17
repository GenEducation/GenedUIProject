import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import {
  FIGURE_GROUP, LESSON_ID, answerRequests, forbiddenRequests, lessonFixture, makeLessonInstance, stepRequests, syntheticPayload, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import type { Passage, ReadingRole, TeacherPayload } from "../../types";
import { BoardPanel } from "../BoardPanel";
import { BookPanel, isHeadingLine, reflow, showsEvery, uncoveredLines } from "../BookPanel";
import { bookTexts } from "../../reading/book";

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
    // The step's own part (the newest) is open and marked; each earlier part folds to one row above it, in the book's order.
    const now = within(book).getByRole("region", { name: "SYNTHETIC story, part 2" });
    expect(now).toHaveAttribute("aria-current", "step");
    expect(within(now).getByText("SYNTHETIC part two.")).toBeInTheDocument();
    expect(within(book).queryByText("SYNTHETIC part one.")).toBeNull();
    const earlier = within(book).getByRole("button", { name: /SYNTHETIC story, part 1/ });
    expect(earlier).toHaveAttribute("aria-expanded", "false");
    expect(within(book).queryByRole("term")).toBeNull();

    // Opening it shows the part in full, glossary apart.
    fireEvent.click(earlier);
    expect(earlier).toHaveAttribute("aria-expanded", "true");
    expect(within(book).getByRole("term")).toHaveTextContent("tended");
    const paragraphs = within(book).getAllByText(/^SYNTHETIC part/).map((p) => p.textContent);
    expect(paragraphs).toEqual(["SYNTHETIC part one.", "SYNTHETIC part two."]);
    expect(screen.getByRole("button", { name: "Book" })).toHaveAttribute("aria-pressed", "true");
  });

  it("lets the learner close it, open it again and jump back to an earlier part, sending nothing to the server", async () => {
    await open({ role: "post_reading", passages: [PASSAGE] });
    const sent = () => [turnRequests.length, answerRequests.length, stepRequests.length, forbiddenRequests.length];
    const before = sent();

    fireEvent.click(screen.getByRole("button", { name: /SYNTHETIC story, part 1/ }));
    expect(screen.getByText("SYNTHETIC part one.")).toBeInTheDocument();
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

describe("the portion being taught, in the book (content-led)", () => {
  const LONG = "SYNTHETIC the boy walked home slowly from the shop.";
  const FACT = "SYNTHETIC a fact box line.";
  const texts = bookTexts([{ id: "t", title: "SYNTHETIC story", segments: [{ segment: 1, chunks: [chunk("p", `SYNTHETIC first. ${LONG}`)] }] }]);

  it("prints only the lines the book's text does not hold whole and marked", () => {
    expect(uncoveredLines([`Intro. ${LONG}`], [LONG, FACT])).toEqual([FACT]);
    // A short line inside a long paragraph is not marked there, so it is printed too.
    expect(uncoveredLines(["SYNTHETIC a much longer paragraph holding Hi."], ["Hi."])).toEqual(["Hi."]);
    // A fragment of the line does not cover it.
    expect(uncoveredLines(["SYNTHETIC the boy walked home"], [LONG])).toEqual([LONG]);
  });

  it("shows every line: highlighted in the book or in the Now reading card, then says so once", async () => {
    const onShown = vi.fn();
    render(<BookPanel texts={texts} onClose={() => {}} activeLines={[LONG, FACT]} portionId="p-1" onShown={onShown} />);
    const card = screen.getByTestId("now-reading");
    expect(Array.from(card.querySelectorAll("[data-source-line]")).map((p) => p.textContent)).toEqual([FACT]);
    expect(screen.getByText(`SYNTHETIC first. ${LONG}`)).toHaveAttribute("data-active-portion");
    await waitFor(() => expect(onShown).toHaveBeenCalledWith("p-1"));
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(showsEvery(screen.getByRole("complementary"), [LONG, FACT])).toBe(true);
    expect(showsEvery(screen.getByRole("complementary"), ["SYNTHETIC never printed."])).toBe(false);
  });

  it("no card when the book holds every line", () => {
    render(<BookPanel texts={texts} onClose={() => {}} activeLines={[LONG]} />);
    expect(screen.queryByTestId("now-reading")).toBeNull();
  });
});

describe("the book as a page", () => {
  it("takes the PDF's line breaks out of prose and keeps a verse's lines", () => {
    expect(reflow("He had many\nfriends with whom\nhe played. But,\nmost of all, he")).toBe("He had many friends with whom he played. But, most of all, he");
    expect(reflow("Twinkle twinkle\nLittle star\nHow I wonder\nWhat you are")).toBe("Twinkle twinkle\nLittle star\nHow I wonder\nWhat you are");
    expect(reflow("One.\n\nTwo.")).toBe("One.\n\nTwo.");
  });

  it("treats a short line with no sentence ending as a heading", () => {
    expect(isHeadingLine("2 THE TINKLING BELLS")).toBe(true);
    expect(isHeadingLine("Let us Read")).toBe(true);
    expect(isHeadingLine('"Ten rupees please," Chacha said.')).toBe(false);
    expect(isHeadingLine('Goats under the age of six months are called "kids".')).toBe(false);
  });

  it("highlights a margin note where it is printed and leaves headings out of the card", async () => {
    const STORY = "SYNTHETIC Chinna was a little boy who lived in a village.\nHe studied in grade 4.";
    const NOTE = 'SYNTHETIC Goats under the age of six months are called "kids".';
    const page = bookTexts([{ id: "t", title: "SYNTHETIC Let us Read", segments: [{ segment: 1, chunks: [chunk("p", STORY), chunk("n", NOTE, "note")] }] }]);
    const onShown = vi.fn();
    render(
      <BookPanel texts={page} onClose={() => {}} activeLines={["2 THE TINKLING BELLS", "Let us Read", STORY, NOTE]} portionId="p-1" onShown={onShown} />,
    );
    expect(screen.queryByTestId("now-reading")).toBeNull();
    const fact = screen.getByRole("complementary", { name: "From the book's margin" });
    expect(within(fact).getByText(NOTE).parentElement).toHaveAttribute("data-active-portion");
    expect(screen.getByText(/SYNTHETIC Chinna was a little boy/)).toHaveTextContent("village. He studied");
    expect(screen.getAllByText("Now teaching")).toHaveLength(1);
    await waitFor(() => expect(onShown).toHaveBeenCalledWith("p-1"));
  });
});
