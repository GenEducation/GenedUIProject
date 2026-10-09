import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { lastAnswers, makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";
import type { QuestionsResponse } from "@/features/partner/types/sources";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const SID = "synthetic-press-synthetic-book-6-ch2-q";

/** SYNTHETIC: one question shaped like a real run's (a proposal, same-chapter and catalogue look-alikes). */
const candidate = (n: number, similarity: number, where: "this_chapter" | "catalogue" = "this_chapter") => ({
  title: `SYNTHETIC look-alike ${n}`,
  where,
  proposal_key: where === "this_chapter" ? `2.${n}:key${n}` : null,
  component_id: where === "catalogue" ? `00000000-0000-0000-0000-00000000000${n}` : null,
  similarity,
  lo_overlap: 1,
  item_overlap: null,
});

const QUESTIONS: QuestionsResponse = {
  allowed_answers: ["novel", "same_as"],
  questions: [
    {
      key: "2.7:proposal",
      proposal: { title: "SYNTHETIC proposed concept", definition: "SYNTHETIC definition.", lo_code: "G6-MATH-LO3.1.1", bloom: 2, difficulty: 0.4 },
      candidates: [candidate(4, 0.6), candidate(1, 0.889), candidate(9, 0.82, "catalogue"), candidate(2, 0.86), candidate(3, 0.7)],
      answer: null,
    },
  ],
};

beforeEach(() => {
  sourcesFixture.reset(() => [
    makeSource({ source_id: SID, chapter: { ordinal: 2, title: "SYNTHETIC angles chapter", first_pdf_page: 1, last_pdf_page: 3 } }),
    makeSource({ state: "ready", chapter: { ordinal: 3, title: "SYNTHETIC ready chapter", first_pdf_page: 1, last_pdf_page: 3 } }),
  ]);
  sourcesFixture.setQuestions(SID, QUESTIONS);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

async function openQuestions() {
  render(<SubjectRegistry onUploadClick={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Answer 1 question" }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("SYNTHETIC proposed concept");
  return dialog;
}

describe("Answering a chapter's reconciliation questions", () => {
  it("shows the button only on a chapter waiting for answers", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Answer 1 question" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Answer \d+ question/ })).toHaveLength(1);
  });

  it("shows the proposal and its closest look-alikes, with similarity and where each comes from", async () => {
    const dialog = await openQuestions();
    expect(within(dialog).getByText("SYNTHETIC definition.")).toBeInTheDocument();
    expect(within(dialog).getByText("G6-MATH-LO3.1.1")).toBeInTheDocument();

    const options = within(dialog).getAllByRole("radio");
    // "new" + the three most similar: 89 %, 86 %, 82 % (the catalogue one is information only, not a radio).
    expect(options).toHaveLength(3);
    expect(within(dialog).getByText("89% alike")).toBeInTheDocument();
    expect(within(dialog).getByText("82% alike")).toBeInTheDocument();
    expect(within(dialog).queryByText("70% alike")).toBeNull();
    expect(within(dialog).getByText("Catalogue")).toBeInTheDocument();
    expect(within(dialog).getByText(/Only a GenEd admin can match/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Show 2 less similar" }));
    expect(within(dialog).getByText("70% alike")).toBeInTheDocument();
  });

  it("saves 'same as' a concept of this chapter, then offers to run the chapter again", async () => {
    const dialog = await openQuestions();
    const save = within(dialog).getByRole("button", { name: "Save answers" });
    expect(save).toBeDisabled();

    fireEvent.click(within(dialog).getByText("SYNTHETIC look-alike 1"));
    fireEvent.click(save);

    await waitFor(() => expect(lastAnswers).toEqual({ "2.7:proposal": { decision: "same_as", proposal_key: "2.1:key1" } }));
    const rerun = await within(dialog).findByRole("button", { name: "Run the chapter again" });
    fireEvent.click(rerun);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(sourcesFixture.get(SID)!.state).toBe("queued");
  });

  it("saves 'it's a new concept'", async () => {
    const dialog = await openQuestions();
    fireEvent.click(within(dialog).getByText("It's a new concept"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save answers" }));
    await waitFor(() => expect(lastAnswers).toEqual({ "2.7:proposal": { decision: "novel" } }));
  });

  it("shows the server's reason when an answer is refused, and keeps the choice", async () => {
    server.use(
      http.put(`${BASE}/v1/sources/:id/reconciliation`, () =>
        HttpResponse.json({ message: "Pick one of the concepts of this chapter offered for SYNTHETIC proposed concept." }, { status: 422 }),
      ),
    );
    const dialog = await openQuestions();
    fireEvent.click(within(dialog).getByText("SYNTHETIC look-alike 2"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save answers" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Pick one of the concepts of this chapter offered");
    expect(within(dialog).getAllByRole("radio").find((r) => (r as HTMLInputElement).checked)).toBeTruthy();
  });

  it("opens with recorded answers, expanding the list when the answer is a less similar concept", async () => {
    sourcesFixture.setQuestions(SID, {
      ...QUESTIONS,
      questions: [{ ...QUESTIONS.questions[0], answer: { decision: "same_as", proposal_key: "2.4:key4" } }],
    });
    const dialog = await openQuestions();
    const chosen = within(dialog).getAllByRole("radio").find((r) => (r as HTMLInputElement).checked) as HTMLInputElement;
    expect(chosen.value).toBe("same_as:2.4:key4");
    expect(within(dialog).getByText("60% alike")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Run the chapter again" })).toBeInTheDocument();
  });
});
