import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { lastReleaseDecisions, makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";
import type { ReleaseProposal, SourceRelease } from "@/features/partner/types/sources";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

const SID = "synthetic-press-synthetic-book-6-ch6-r";
const CONCEPT_ID = "0192f298-710d-57dc-a4d7-224f5f118008";
const hash = (n: number) => String(n).padStart(64, "a");

const proposal = (n: number, kind: string, content: Record<string, unknown>): ReleaseProposal => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  kind,
  target_id: null,
  state: "pending",
  content_hash: hash(n),
  content,
});

/** SYNTHETIC: a small release shaped like a real one (a concept, a question, a lesson step, the plan). */
const RELEASE: SourceRelease = {
  release: {
    batch_id: "11111111-0000-4000-8000-000000000001",
    state: "ready",
    book_title: "SYNTHETIC Book",
    edition_label: "SYNTHETIC TEST DATA",
    chapters: ["SYNTHETIC chapter six"],
    artifact_hash: hash(99),
    created_at: "2026-01-01T00:00:00Z",
    proposals: { pending: 5 },
  },
  proposals: [
    // As the backend sends them: each record bound to the release as { artifact_hash, value }.
    proposal(1, "component", {
      artifact_hash: hash(99),
      value: {
        id: CONCEPT_ID, title: "SYNTHETIC concept", definition: "SYNTHETIC definition.", strand: "math_numbers",
        bloom: 4, difficulty: 0.8, lo_codes: ["G6-MATH-LO6.2.1"], source_chunk_ids: ["c1", "c2"],
        embedding: [0.1, 0.2], embedding_model: "SYNTHETIC-embedder",
      },
    }),
    proposal(2, "item", {
      artifact_hash: hash(99),
      value: {
        id: "q1", prompt: "SYNTHETIC question?", bloom: 2, difficulty: 0.2, mastery_eligible: true,
        options: [
          { id: "o1", text: "SYNTHETIC a" },
          { id: "o2", text: "SYNTHETIC b", misconception_id: "m1" },
        ],
        rule: { kind: "mcq", correct_option_id: "o1" },
        components: [{ component_id: CONCEPT_ID, weight: 1 }],
      },
    }),
    proposal(5, "misconception", { artifact_hash: hash(99), value: { id: "m1", code: "adds_digits", definition: "SYNTHETIC adds the digits instead.", component_ids: [CONCEPT_ID] } }),
    proposal(3, "lesson_node", { title: "SYNTHETIC step", type: "teach", est_minutes: 5 }),
    proposal(4, "chapter_plan:6", { chapter_ordinal: 6, node_ids: ["x", "y"], lo_codes: ["G6-MATH-LO1.2.1"] }),
  ],
};

beforeEach(() => {
  sourcesFixture.reset(() => [
    makeSource({ source_id: SID, state: "ready", chapter: { ordinal: 6, title: "SYNTHETIC chapter six", first_pdf_page: 1, last_pdf_page: 3 } }),
    makeSource({ state: "failed", chapter: { ordinal: 7, title: "SYNTHETIC failed chapter", first_pdf_page: 1, last_pdf_page: 3 } }),
  ]);
  sourcesFixture.setRelease(SID, RELEASE);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

async function openReview() {
  render(<SubjectRegistry onUploadClick={vi.fn()} />);
  const buttons = await screen.findAllByRole("button", { name: "Review & publish" });
  expect(buttons).toHaveLength(1);
  fireEvent.click(buttons[0]);
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("SYNTHETIC concept");
  return dialog;
}

describe("Reviewing and publishing a chapter", () => {
  it("offers the review only on a ready chapter, and shows each part in plain words", async () => {
    const dialog = await openReview();
    expect(within(dialog).getByRole("region", { name: "Concepts" })).toBeInTheDocument();
    expect(within(dialog).getByText("SYNTHETIC definition.")).toBeInTheDocument();
    expect(within(dialog).getByText("SYNTHETIC question?")).toBeInTheDocument();
    expect(within(dialog).getByText("Options: SYNTHETIC a · SYNTHETIC b")).toBeInTheDocument();
    expect(within(dialog).getByText("Chapter 6: 2 lesson steps")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Publish chapter" })).toBeDisabled();

    // Details are laid out in words: never raw JSON, ids, embeddings or model names.
    const concepts = within(dialog).getByRole("region", { name: "Concepts" });
    fireEvent.click(within(concepts).getByRole("button", { name: "Show details" }));
    expect(within(concepts).getByText("Definition")).toBeInTheDocument();
    expect(within(concepts).getByText("G6-MATH-LO6.2.1")).toBeInTheDocument();
    expect(within(concepts).getByText("Analyse")).toBeInTheDocument(); // thinking level 4
    expect(within(concepts).getByText("Hard")).toBeInTheDocument();
    expect(within(concepts).getByText("Math numbers")).toBeInTheDocument();
    expect(within(concepts).getByText("2 passages")).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/[{}"]|embedding|SYNTHETIC-embedder|0192f298/);

    // A question shows its correct option, the mistake a wrong one catches, and the concept it tests by name.
    const questions = within(dialog).getByRole("region", { name: "Questions" });
    fireEvent.click(within(questions).getByRole("button", { name: "Show details" }));
    expect(within(questions).getByLabelText("Correct").closest("li")).toHaveTextContent("SYNTHETIC a");
    expect(within(questions).getByText("Catches: SYNTHETIC adds the digits instead.")).toBeInTheDocument();
    expect(within(questions).getByText("SYNTHETIC concept")).toBeInTheDocument();
    expect(within(questions).getByText("Yes")).toBeInTheDocument(); // counts towards mastery
  });

  it("says students still see the earlier publication while a newer release waits", async () => {
    const live = { ...RELEASE.release, batch_id: "11111111-0000-4000-8000-000000000000", state: "published" };
    sourcesFixture.setRelease(SID, { ...RELEASE, live });
    const dialog = await openReview();
    expect(within(dialog).getByRole("note")).toHaveTextContent("Students still see the version you published earlier");
  });

  it("shows no such note for a chapter never published", async () => {
    const dialog = await openReview();
    expect(within(dialog).queryByText(/Students still see/)).toBeNull();
  });

  it("accepts a part with the hash it showed, and needs a reason to reject", async () => {
    const dialog = await openReview();
    fireEvent.click(within(dialog).getByRole("button", { name: "Accept SYNTHETIC concept" }));
    await waitFor(() =>
      expect(lastReleaseDecisions).toEqual([
        { proposal_id: RELEASE.proposals[0].id, content_hash: hash(1), decision: "accept", reasons: ["accepted_as_is"] },
      ]),
    );
    expect(await within(within(dialog).getByRole("region", { name: "Concepts" })).findByText("Accepted")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Reject SYNTHETIC question?" }));
    const reject = within(dialog).getAllByRole("button", { name: "Reject" }).at(-1)!;
    expect(reject).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Reason for rejecting" }), { target: { value: "bad_key" } });
    fireEvent.click(reject);
    await waitFor(() => expect(lastReleaseDecisions?.[0]).toMatchObject({ decision: "reject", reasons: ["bad_key"] }));
    expect(await within(dialog).findByText(/A rejected part stops publishing/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Run the chapter again" })).toBeInTheDocument();
  });

  it("accepts everything left, then publishes the chapter", async () => {
    const dialog = await openReview();
    fireEvent.click(within(dialog).getByRole("button", { name: "Accept all 5" }));
    await waitFor(() => expect(lastReleaseDecisions).toHaveLength(5));
    const publish = await within(dialog).findByRole("button", { name: "Publish chapter" });
    await waitFor(() => expect(publish).toBeEnabled());

    fireEvent.click(publish);
    expect(await within(dialog).findByText(/Published. Students of your school can open this chapter./)).toBeInTheDocument();
    expect(sourcesFixture.getRelease(SID)!.release.state).toBe("published");
    expect(within(dialog).queryByRole("button", { name: /Accept/ })).toBeNull();
  });
});
