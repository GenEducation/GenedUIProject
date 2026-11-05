import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import {
  FIGURE_GROUP, LESSON_ID, answerRequests, forbiddenRequests, lessonFixture, makeLessonInstance, stepRequests, syntheticPayload, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import type { Passage, ReadingRole, TeacherPayload } from "../../types";
import { ALREADY_COVERED_NOTE } from "../../reading/book";
import { BoardPanel } from "../BoardPanel";
import { ChatInput } from "../ChatInput";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const store = () => useLessonStore.getState();
const chunk = (id: string, text: string, element_type = "paragraph") => ({ id, element_type, text, page: 1 });

const PASSAGE: Passage = {
  id: "story-1",
  title: "SYNTHETIC story",
  segments: [{ segment: 1, chunks: [chunk("a", "SYNTHETIC the sage smiled and said nothing."), chunk("b", "SYNTHETIC he walked on.")] }],
};

async function open(shape: (payload: TeacherPayload) => TeacherPayload) {
  server.use(http.get(`${BASE}/v1/instances/:instanceId/teacher-payload`, () => HttpResponse.json(shape(syntheticPayload()))));
  lessonFixture.setInstance(makeLessonInstance());
  await store().load(LESSON_ID);
  return render(<BoardPanel subject="english" />);
}

const reading = (role: ReadingRole | null, passages: Passage[]) => (p: TeacherPayload): TeacherPayload => ({
  ...p,
  schema_version: "teacher_node_v8",
  node: { ...p.node, reading_role: role, passages },
});

const sent = () => [turnRequests.length, answerRequests.length, stepRequests.length, forbiddenRequests.length];

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", teacher_text: "SYNTHETIC look.", created_at: "x", figure_group_ids: [FIGURE_GROUP] }]);
});

describe("Show in book (a chapter with no passages)", () => {
  const maths = (p: TeacherPayload): TeacherPayload => ({
    ...p,
    node: {
      ...p.node,
      sections: [
        { id: "s1", title: "SYNTHETIC Halves", path: ["SYNTHETIC Halves"], chunks: [chunk("m1", "SYNTHETIC One half of 8 is $4$."), chunk("m2", "SYNTHETIC A | B\n1 | 2", "table")] },
        { id: "s2", title: "SYNTHETIC Seen before", path: ["x"], chunks: [chunk("m3", ALREADY_COVERED_NOTE, "note")] },
      ],
    },
  });

  it("is closed until asked for, then shows the step's own sections, leaving out one already read", async () => {
    await open(maths);

    expect(screen.queryByRole("complementary", { name: "In your book" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show in book" }));

    const book = screen.getByRole("complementary", { name: "In your book" });
    expect(within(book).getByRole("heading", { name: "SYNTHETIC Halves" })).toBeInTheDocument();
    expect(within(book).getByText(/One half of 8 is/)).toBeInTheDocument();
    expect(within(book).queryByText(/already read this section/)).toBeNull();
    expect(within(book).queryByRole("heading", { name: "SYNTHETIC Seen before" })).toBeNull();
    expect(within(book).queryByRole("button", { name: "Read with me" })).toBeNull();
    expect(within(book).queryByRole("button", { name: /^Listen/ })).toBeNull();
  });

  it("is absent when the step has no section text, and for a step with a reading role (it has passages)", async () => {
    await open((p) => ({ ...p, node: { ...p.node, sections: [] } }));
    expect(screen.queryByRole("button", { name: "Show in book" })).toBeNull();
  });
});

describe("Ask about this", () => {
  it("offers the words the learner selected in the book, and puts them in the chat box without sending anything", async () => {
    await open(reading("post_reading", [PASSAGE]));
    const before = sent();
    const paragraph = screen.getByText("SYNTHETIC the sage smiled and said nothing.");

    act(() => {
      window.getSelection()?.selectAllChildren(paragraph);
      document.dispatchEvent(new Event("selectionchange"));
    });
    const ask = await screen.findByRole("button", { name: "Ask about this" });
    fireEvent.click(ask);

    expect(store().chatDraft?.text).toBe("“SYNTHETIC the sage smiled and said nothing.” ");
    expect(sent()).toEqual(before);
    expect(screen.queryByRole("button", { name: "Ask about this" })).toBeNull();
  });

  it("is not offered for words selected outside the book", async () => {
    await open(reading("post_reading", [PASSAGE]));
    const outside = document.createElement("p");
    outside.textContent = "SYNTHETIC elsewhere";
    document.body.appendChild(outside);

    act(() => {
      window.getSelection()?.selectAllChildren(outside);
      document.dispatchEvent(new Event("selectionchange"));
    });

    expect(screen.queryByRole("button", { name: "Ask about this" })).toBeNull();
  });

  it("the chat box takes the quote once, ready for the learner's own question", async () => {
    render(<ChatInput replying={false} disabled={false} onSend={() => {}} onStop={() => {}} subject="english" />);
    act(() => store().setChatDraft("“SYNTHETIC quote” "));

    const box = await screen.findByRole("textbox");
    expect((box as HTMLTextAreaElement).value).toBe("“SYNTHETIC quote” ");

    fireEvent.change(box, { target: { value: "“SYNTHETIC quote” why?" } });
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("“SYNTHETIC quote” why?");
  });
});

describe("Read with me and I've read it", () => {
  it.each([
    ["Read with me", "read_with_me", "Can we read this together?"],
    ["I've read it", "read_it", "I've read it."],
  ] as const)("%s sends a conversation-only message with its intent, and nothing that could be an answer or a step", async (name, intent, text) => {
    await open(reading("post_reading", [PASSAGE]));
    const answers = answerRequests.length;
    const steps = stepRequests.length;

    fireEvent.click(screen.getByRole("button", { name }));

    await waitFor(() => expect(turnRequests.at(-1)).toMatchObject({ kind: "learner_message", text, routing_mode: "conversation_only", reading_intent: intent }));
    expect(answerRequests.length).toBe(answers);
    expect(stepRequests.length).toBe(steps);
    expect(forbiddenRequests).toEqual([]);
  });

  it("is not offered on a step with no passage, such as a pre-reading step or a maths step", async () => {
    await open(reading("pre_reading", []));
    expect(screen.queryByRole("button", { name: "Read with me" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Book/ })).toBeNull();
  });
});
