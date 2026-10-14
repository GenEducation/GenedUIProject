import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { lastAuthored, makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";
import type { AuthoringResponse } from "@/features/partner/types/sources";
import { addedProblem, answerOf } from "../SourceAuthoringModal";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

const SID = "synthetic-press-synthetic-book-4-ch2-a";

/** SYNTHETIC: a one-page run whose printed questions were all removed (the Toy Joy shape, ADR 0036). */
const AUTHORING: AuthoringResponse = {
  sections: [{ key: "2.1", title: "SYNTHETIC section", text: "SYNTHETIC section text." }],
  concepts: [
    { key: "2.1:alpha", section_key: "2.1", title: "SYNTHETIC concept alpha", definition: "SYNTHETIC." },
    { key: "2.1:beta", section_key: "2.1", title: "SYNTHETIC concept beta", definition: "SYNTHETIC." },
  ],
  removed: [
    {
      item_key: "item-a",
      section_key: "2.1",
      prompt: "SYNTHETIC picture question?",
      reason: "answer_check_disagreed",
      options: ["SYNTHETIC red", "SYNTHETIC blue"],
      run_key: "0",
      needs_concept: false,
    },
    {
      item_key: "item-b",
      section_key: "2.1",
      prompt: "SYNTHETIC open question?",
      reason: "not_machine_scorable",
      options: [],
      run_key: null,
      needs_concept: true,
    },
  ],
  authored: { answers: {}, added: [] },
  authored_at: null,
  suggestions: null,
  can_suggest: true,
};

beforeEach(() => {
  sourcesFixture.reset(() => [
    makeSource({ source_id: SID, chapter: { ordinal: 2, title: "SYNTHETIC toy chapter", first_pdf_page: 1, last_pdf_page: 1 } }),
  ]);
  sourcesFixture.setAuthoring(SID, AUTHORING);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

async function openAuthoring() {
  render(<SubjectRegistry onUploadClick={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Add questions" }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("SYNTHETIC picture question?");
  return dialog;
}

describe("Completing a chapter's questions", () => {
  it("offers Add questions instead of a re-run that would end the same way", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Add questions" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run ingestion again" })).not.toBeInTheDocument();
  });

  it("saves printed keys and a typed question, then runs with them", async () => {
    const dialog = await openAuthoring();
    const picture = within(dialog).getByRole("article", { name: "SYNTHETIC picture question?" });
    fireEvent.click(within(picture).getByLabelText("SYNTHETIC blue"));
    const open = within(dialog).getByRole("article", { name: "SYNTHETIC open question?" });
    fireEvent.change(within(open).getByLabelText("Answers to accept (one per line)"), { target: { value: "SYNTHETIC one\nSYNTHETIC two" } });
    fireEvent.change(within(open).getByLabelText("Concept it checks"), { target: { value: "2.1:beta" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Write a question" }));
    const form = within(dialog).getByRole("form", { name: "Write a question" });
    fireEvent.change(within(form).getByLabelText("Question"), { target: { value: "SYNTHETIC what is 2 + 3?" } });
    fireEvent.change(within(form).getByLabelText("The answer"), { target: { value: "5" } });
    fireEvent.click(within(form).getByRole("button", { name: "Add question" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Save questions" }));
    expect(await within(dialog).findByText(/3 questions saved/)).toBeInTheDocument();
    expect(lastAuthored?.answers).toEqual({
      "item-a": { correct_option_index: 1 },
      "item-b": { accepted_answers: ["SYNTHETIC one", "SYNTHETIC two"], concept_key: "2.1:beta" },
    });
    expect(lastAuthored?.added).toEqual([
      expect.objectContaining({ section_key: "2.1", concept_key: "2.1:alpha", answer_kind: "numeric", expected_numeric: "5", origin: "partner" }),
    ]);
    expect(within(dialog).getByRole("button", { name: "Run with these questions" })).toBeInTheDocument();
  });

  it("asks the AI, then accepts a draft as ai_assisted", async () => {
    sourcesFixture.setDrafts(SID, [
      {
        id: "draft-1",
        section_key: "2.1",
        concept_key: "2.1:beta",
        prompt: "SYNTHETIC drafted question?",
        answer_kind: "string_set",
        accepted_answers: ["SYNTHETIC yes"],
        origin: "ai_assisted",
      },
    ]);
    const dialog = await openAuthoring();
    fireEvent.click(within(dialog).getByRole("button", { name: "Suggest questions" }));
    expect(await within(dialog).findByText("Writing suggestions…")).toBeInTheDocument();
    const draft = await within(dialog).findByRole("article", { name: "SYNTHETIC drafted question?" }, { timeout: 6000 });
    fireEvent.click(within(draft).getByRole("button", { name: "Accept" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save questions" }));
    await waitFor(() => expect(lastAuthored?.added).toHaveLength(1));
    expect(lastAuthored?.added[0]).toMatchObject({ prompt: "SYNTHETIC drafted question?", origin: "ai_assisted" });
    expect(lastAuthored?.added[0].id).not.toBe("draft-1");
  }, 10000);
});

describe("Key rules", () => {
  const removed = AUTHORING.removed[1];
  it("needs a concept when the run tied the question to none", () => {
    expect(answerOf(removed, { kind: "words", value: "x", concept: "" })).toBeNull();
    expect(answerOf(removed, { kind: "numeric", value: " 4 ", concept: "2.1:beta" })).toEqual({ expected_numeric: "4", concept_key: "2.1:beta" });
  });

  it("rejects a multiple-choice question without two different choices", () => {
    const q = { id: "a", section_key: "2.1", concept_key: "2.1:alpha", prompt: "SYNTHETIC?", answer_kind: "mcq" as const, origin: "partner" as const };
    expect(addedProblem({ ...q, options: ["x", "x"], correct_option_index: 0 })).toMatch(/two different/);
    expect(addedProblem({ ...q, options: ["x", "y"] })).toMatch(/correct choice/);
    expect(addedProblem({ ...q, options: ["x", "y"], correct_option_index: 1 })).toBeNull();
  });
});
