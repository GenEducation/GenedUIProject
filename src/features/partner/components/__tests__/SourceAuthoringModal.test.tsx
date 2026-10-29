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
    fireEvent.click(within(dialog).getByRole("tab", { name: /Printed questions/ }));
    const picture = within(dialog).getByRole("article", { name: "SYNTHETIC picture question?" });
    fireEvent.click(within(picture).getByLabelText("SYNTHETIC blue"));
    const open = within(dialog).getByRole("article", { name: "SYNTHETIC open question?" });
    fireEvent.change(within(open).getByLabelText("Answers to accept (one per line)"), { target: { value: "SYNTHETIC one\nSYNTHETIC two" } });
    fireEvent.change(within(open).getByLabelText("Concept it checks"), { target: { value: "2.1:beta" } });

    expect(within(dialog).getByText("2 of 2 answered")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("tab", { name: /Your questions/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Write a question" }));
    const form = within(dialog).getByRole("form", { name: "Write a question" });
    fireEvent.change(within(form).getByLabelText("Question"), { target: { value: "SYNTHETIC what is 2 + 3?" } });
    fireEvent.change(within(form).getByLabelText("The answer"), { target: { value: "5" } });
    fireEvent.click(within(form).getByRole("button", { name: "Add question" }));

    expect(within(dialog).getByText("2 printed · 1 written by you")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save for later" }));
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
    expect(within(dialog).getByText(/1 suggestion accepted/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("article", { name: "SYNTHETIC drafted question?" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save for later" }));
    await waitFor(() => expect(lastAuthored?.added).toHaveLength(1));
    expect(lastAuthored?.added[0]).toMatchObject({ prompt: "SYNTHETIC drafted question?", origin: "ai_assisted" });
    expect(lastAuthored?.added[0].id).not.toBe("draft-1");
  }, 10000);
});

describe("The popup's layout", () => {
  it("opens on the AI's suggestions, before the printed questions", async () => {
    const dialog = await openAuthoring();
    const tabs = within(dialog).getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["Suggested by AI", "Your questions", "Printed questions0/2"]);
    expect(within(dialog).getByRole("tab", { name: /Suggested by AI/ })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByRole("button", { name: "Suggest questions" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("article", { name: "SYNTHETIC picture question?" })).not.toBeInTheDocument();
  });

  it("skips a draft without accepting it", async () => {
    sourcesFixture.setAuthoring(SID, {
      ...AUTHORING,
      suggestions: {
        state: "ready",
        requested_at: "2026-10-29T00:00:00Z",
        detail: null,
        drafts: [
          { id: "draft-1", section_key: "2.1", concept_key: "2.1:beta", prompt: "SYNTHETIC skipped?", answer_kind: "numeric", expected_numeric: "1", origin: "ai_assisted" },
        ],
      },
    });
    const dialog = await openAuthoring();
    const draft = within(dialog).getByRole("article", { name: "SYNTHETIC skipped?" });
    fireEvent.click(within(draft).getByRole("button", { name: "Skip" }));
    expect(within(dialog).queryByRole("article", { name: "SYNTHETIC skipped?" })).not.toBeInTheDocument();
    expect(within(dialog).getByText("No suggestions left to review")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save and run" })).toBeDisabled();
  });

  it("saves and runs in one step", async () => {
    const dialog = await openAuthoring();
    fireEvent.click(within(dialog).getByRole("tab", { name: /Printed questions/ }));
    const picture = within(dialog).getByRole("article", { name: "SYNTHETIC picture question?" });
    fireEvent.click(within(picture).getByLabelText("SYNTHETIC red"));
    expect(within(picture).getByText("Answered")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save and run" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(lastAuthored?.answers).toEqual({ "item-a": { correct_option_index: 0 } });
  });
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
