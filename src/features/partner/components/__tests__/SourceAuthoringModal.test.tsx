import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import {
  lastAuthored,
  makeSource,
  sourcesFixture,
} from "@/test/msw/handlers/sources";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";
import type {
  AuthoringResponse,
  BankPackage,
  BankQuestion,
} from "@/features/partner/types/sources";
import { addedProblem, answerOf } from "../SourceAuthoringModal";

vi.mock("framer-motion", async () =>
  (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough(),
);
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

const SID = "synthetic-press-synthetic-book-4-ch2-a";

/** SYNTHETIC: a one-page run whose printed questions were all removed (the Toy Joy shape, ADR 0036). */
const AUTHORING: AuthoringResponse = {
  sections: [
    { key: "2.1", title: "SYNTHETIC section", text: "SYNTHETIC section text." },
  ],
  concepts: [
    {
      key: "2.1:alpha",
      section_key: "2.1",
      title: "SYNTHETIC concept alpha",
      definition: "SYNTHETIC.",
    },
    {
      key: "2.1:beta",
      section_key: "2.1",
      title: "SYNTHETIC concept beta",
      definition: "SYNTHETIC.",
    },
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
};

const meta = (verification: BankQuestion["verification"]) => ({
  obligation_keys: ["order"], evidence_kind: "order", strength: "strong" as const, strength_reason: "SYNTHETIC",
  family_key: `fam-${verification}`, difficulty: "medium" as const, provenance: "original_curriculum_aligned" as const,
  source_basis: "SYNTHETIC", verification, distractors: [{ option: "SYNTHETIC 1/8", misconception: "SYNTHETIC bigger denominator" }],
}); // prettier-ignore

function question(
  id: string,
  prompt: string,
  verification: BankQuestion["verification"],
): BankQuestion {
  return {
    question_id: id, section_key: "2.1", concept_key: "2.1:alpha", state: "draft", version: 1, revision: 1, origin: "ai",
    verification, concept_in_chapter: true,
    question: {
      body: { id, section_key: "2.1", concept_key: "2.1:alpha", prompt, answer_kind: "mcq", origin: "ai_assisted",
              options: ["SYNTHETIC 1/3", "SYNTHETIC 1/8", "SYNTHETIC 1/5", "SYNTHETIC 1/4"], correct_option_index: 0,
              explanation: "SYNTHETIC fewer parts, bigger parts" },
      meta: meta(verification),
    },
  }; // prettier-ignore
}

const BANK: BankPackage = {
  version: "a".repeat(64),
  findings: [{ concept_key: "2.1:beta", issue: "SYNTHETIC this concept is not in the section", evidence: "SYNTHETIC", resolution: "quarantined" }],
  nodes: [{
    section_key: "2.1", title: "SYNTHETIC section 2.1", quarantined: ["2.1:beta"], status: "incomplete", reviewable: 1, review_floor: 3, draft_ready: false, approved_ready: false, publishable: false,
    concepts: [{ concept_key: "2.1:alpha", title: "SYNTHETIC alpha", status: "planned", why: null, understanding: "SYNTHETIC", misconceptions: [],
                 obligations: [{ key: "order", statement: "SYNTHETIC order unit fractions", production: false, draft_families: 2,
                                 approved_families: 0, draft_covered: true, approved_covered: false }],
                 open_slots: [{ slot: "2.1:alpha/compare", category: "retries_exhausted", detail: "SYNTHETIC 3 attempts were repaired or dropped.", last_reasons: ["SYNTHETIC ambiguous"] }] },
               { concept_key: "2.1:beta", title: "SYNTHETIC beta", status: "held", why: "SYNTHETIC this concept is not in the section", understanding: null,
                 misconceptions: [], obligations: [], open_slots: [] }],
  }],
  questions: [question("q-checked", "SYNTHETIC which share is biggest?", "solver_agreed"), question("q-doubted", "SYNTHETIC which is smallest?", "needs_partner_check")],
  runs: [{ run_id: "r1", scope: "chapter", section_key: null, state: "ready", spent_usd: 0.1, detail: null, nodes: [], created_at: "2026-11-11T00:00:00Z" }],
  summary: { nodes: 1, questions: 2, accepted: 0, needs_attention: 1, draft_ready_nodes: 0, capability_gap_nodes: 0, incomplete_nodes: 1,
             concepts: { planned: 1, held: 1, not_planned: 0, capability_gap: 0 }, approved_ready_nodes: 0, publishable_nodes: 0, open_issues: 1, authoring: "ready" },
}; // prettier-ignore

beforeEach(() => {
  sourcesFixture.reset(() => [
    makeSource({
      source_id: SID,
      chapter: {
        ordinal: 2,
        title: "SYNTHETIC toy chapter",
        first_pdf_page: 1,
        last_pdf_page: 1,
      },
    }),
  ]);
  sourcesFixture.setAuthoring(SID, AUTHORING);
  usePartnerStore.setState({
    subjects: [],
    subjectFilters: {},
    subjectPagination: { total_count: 0, limit: 20, offset: 0 },
  });
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

async function openAuthoring() {
  render(<SubjectRegistry onUploadClick={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Review decisions" }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("SYNTHETIC picture question?");
  return dialog;
}

describe("Completing a chapter's questions", () => {
  it("offers Review decisions instead of a re-run that would end the same way", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    expect(
      await screen.findByRole("button", { name: "Review decisions" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Run ingestion again" }),
    ).not.toBeInTheDocument();
  });

  it("saves printed keys and a typed question, then runs with them", async () => {
    const dialog = await openAuthoring();
    fireEvent.click(
      within(dialog).getByRole("tab", { name: /Printed questions/ }),
    );
    const picture = within(dialog).getByRole("article", {
      name: "SYNTHETIC picture question?",
    });
    fireEvent.click(within(picture).getByLabelText("SYNTHETIC blue"));
    const open = within(dialog).getByRole("article", {
      name: "SYNTHETIC open question?",
    });
    fireEvent.change(
      within(open).getByLabelText("Answers to accept (one per line)"),
      { target: { value: "SYNTHETIC one\nSYNTHETIC two" } },
    );
    fireEvent.change(within(open).getByLabelText("Concept it checks"), {
      target: { value: "2.1:beta" },
    });

    expect(within(dialog).getByText("2 of 2 answered")).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("tab", { name: /Your questions/ }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Write a question" }),
    );
    const form = within(dialog).getByRole("form", { name: "Write a question" });
    fireEvent.change(within(form).getByLabelText("Question"), {
      target: { value: "SYNTHETIC what is 2 + 3?" },
    });
    fireEvent.change(within(form).getByLabelText("Answer type"), {
      target: { value: "numeric" },
    }); // a new question starts as multiple choice
    fireEvent.change(within(form).getByLabelText("The answer"), {
      target: { value: "5" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Add question" }));

    expect(
      within(dialog).getByText("2 printed · 1 written by you"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save for later" }),
    );
    expect(
      await within(dialog).findByText(/3 decisions saved/),
    ).toBeInTheDocument();
    expect(lastAuthored?.answers).toEqual({
      "item-a": { correct_option_index: 1 },
      "item-b": {
        accepted_answers: ["SYNTHETIC one", "SYNTHETIC two"],
        concept_key: "2.1:beta",
      },
    });
    expect(lastAuthored?.added).toEqual([
      expect.objectContaining({
        section_key: "2.1",
        concept_key: "2.1:alpha",
        answer_kind: "numeric",
        expected_numeric: "5",
        origin: "partner",
      }),
    ]);
    expect(
      within(dialog).getByRole("button", { name: "Prepare release" }),
    ).toBeInTheDocument();
  });

  it("reviews GenEd's prepared questions: bulk accept leaves doubted ones, a rejection needs a reason, then approve", async () => {
    sourcesFixture.setBank(SID, BANK);
    const dialog = await openAuthoring();
    expect(
      (
        await within(dialog).findAllByText(
          /SYNTHETIC this concept is not in the section/,
        )
      ).length,
    ).toBeGreaterThan(0);
    const checked = within(dialog).getByRole("article", {
      name: "SYNTHETIC which share is biggest?",
    });
    expect(within(checked).getByText("Answer checked")).toBeInTheDocument();
    const doubted = within(dialog).getByRole("article", {
      name: "SYNTHETIC which is smallest?",
    });
    expect(within(doubted).getByText("Please check")).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Accept the 1 checked questions",
      }),
    );
    expect(await within(checked).findByText("Accepted")).toBeInTheDocument();
    expect(
      sourcesFixture
        .getBank(SID)
        ?.questions.find((q) => q.question_id === "q-doubted")?.state,
    ).toBe("draft");

    fireEvent.click(within(doubted).getByRole("button", { name: "Reject" }));
    fireEvent.change(within(doubted).getByLabelText("Why reject it?"), {
      target: { value: "ambiguous" },
    });
    fireEvent.click(
      within(doubted).getAllByRole("button", { name: "Reject" })[0],
    );
    await waitFor(() =>
      expect(
        sourcesFixture
          .getBank(SID)
          ?.questions.find((q) => q.question_id === "q-doubted")?.state,
      ).toBe("rejected"),
    );

    fireEvent.click(
      await within(dialog).findByRole("button", {
        name: "Approve 1 accepted questions and run the chapter",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("lists every step with its real status, a held concept and why a slot is still open", async () => {
    sourcesFixture.setBank(SID, BANK);
    const dialog = await openAuthoring();
    const step = await within(dialog).findByRole("region", {
      name: "SYNTHETIC section 2.1",
    });
    expect(within(step).getByText(/Incomplete/)).toBeInTheDocument();
    expect(
      within(step).getByText(/only 1 of 3 checked, distinct questions/),
    ).toBeInTheDocument();
    expect(within(step).getByText(/On hold\./)).toBeInTheDocument();
    expect(
      within(step).getByText(/Why 1 question slot is still open/),
    ).toBeInTheDocument();
    expect(
      within(step).getByText(/didn't pass its checks/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/1 are incomplete/)).toBeInTheDocument();
  });

  it("refuses a decision made on a question that changed meanwhile", async () => {
    sourcesFixture.setBank(SID, BANK);
    const dialog = await openAuthoring();
    const card = await within(dialog).findByRole("article", {
      name: "SYNTHETIC which share is biggest?",
    });
    sourcesFixture.getBank(SID)!.questions[0].version = 7; // another reviewer changed it
    fireEvent.click(within(card).getByRole("button", { name: "Accept" }));
    expect(
      await within(dialog).findByText(/changed since you opened it/),
    ).toBeInTheDocument();
    expect(sourcesFixture.getBank(SID)?.questions[0].state).toBe("draft");
  });
});

describe("The popup's layout", () => {
  it("opens on GenEd's prepared questions, before the printed questions", async () => {
    const dialog = await openAuthoring();
    const tabs = within(dialog)
      .getAllByRole("tab")
      .map((t) => t.textContent);
    expect(tabs).toEqual([
      "Prepared by GenEd",
      "Your questions",
      "Printed questions0/2",
    ]);
    expect(
      within(dialog).getByRole("tab", { name: /Prepared by GenEd/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      await within(dialog).findByText(
        /hasn.t prepared questions for this chapter yet/,
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("article", {
        name: "SYNTHETIC picture question?",
      }),
    ).not.toBeInTheDocument();
  });

  it("saves and runs in one step", async () => {
    const dialog = await openAuthoring();
    fireEvent.click(
      within(dialog).getByRole("tab", { name: /Printed questions/ }),
    );
    const picture = within(dialog).getByRole("article", {
      name: "SYNTHETIC picture question?",
    });
    fireEvent.click(within(picture).getByLabelText("SYNTHETIC red"));
    expect(within(picture).getByText("Answered")).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save and prepare release" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(lastAuthored?.answers).toEqual({
      "item-a": { correct_option_index: 0 },
    });
  });
});

describe("Enter in the popup", () => {
  it("saves from a printed answer, and leaves the one-per-line box to new lines", async () => {
    const dialog = await openAuthoring();
    fireEvent.click(
      within(dialog).getByRole("tab", { name: /Printed questions/ }),
    );
    const open = within(dialog).getByRole("article", {
      name: "SYNTHETIC open question?",
    });
    const accepted = within(open).getByLabelText(
      "Answers to accept (one per line)",
    );
    fireEvent.change(accepted, { target: { value: "SYNTHETIC one" } });
    fireEvent.keyDown(accepted, { key: "Enter" });
    expect(within(dialog).getByText("Not saved")).toBeInTheDocument();

    fireEvent.click(within(open).getByRole("button", { name: "A number" }));
    const number = within(open).getByLabelText("The answer");
    fireEvent.change(number, { target: { value: "7" } });
    fireEvent.change(within(open).getByLabelText("Concept it checks"), {
      target: { value: "2.1:beta" },
    });
    fireEvent.keyDown(number, { key: "Enter" });
    expect(
      await within(dialog).findByText(/1 decision saved/),
    ).toBeInTheDocument();
    expect(lastAuthored?.answers).toEqual({
      "item-b": { expected_numeric: "7", concept_key: "2.1:beta" },
    });
  });

  it("adds a written question on Enter from one of its dropdowns", async () => {
    const dialog = await openAuthoring();
    fireEvent.click(
      within(dialog).getByRole("tab", { name: /Your questions/ }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Write a question" }),
    );
    const form = within(dialog).getByRole("form", { name: "Write a question" });
    fireEvent.change(within(form).getByLabelText("Question"), {
      target: { value: "SYNTHETIC what is 2 + 3?" },
    });
    fireEvent.change(within(form).getByLabelText("Answer type"), {
      target: { value: "numeric" },
    }); // a new question starts as multiple choice
    fireEvent.change(within(form).getByLabelText("The answer"), {
      target: { value: "5" },
    });
    fireEvent.keyDown(within(form).getByLabelText("Answer type"), {
      key: "Enter",
    });
    expect(within(dialog).getByText("1 written by you")).toBeInTheDocument();
  });
});

describe("Key rules", () => {
  const removed = AUTHORING.removed[1];
  it("needs a concept when the run tied the question to none", () => {
    expect(
      answerOf(removed, { kind: "words", value: "x", concept: "" }),
    ).toBeNull();
    expect(
      answerOf(removed, { kind: "numeric", value: " 4 ", concept: "2.1:beta" }),
    ).toEqual({ expected_numeric: "4", concept_key: "2.1:beta" });
  });

  it("rejects a multiple-choice question without two different choices", () => {
    const q = {
      id: "a",
      section_key: "2.1",
      concept_key: "2.1:alpha",
      prompt: "SYNTHETIC?",
      answer_kind: "mcq" as const,
      origin: "partner" as const,
    };
    expect(
      addedProblem({ ...q, options: ["x", "x"], correct_option_index: 0 }),
    ).toMatch(/two different/);
    expect(addedProblem({ ...q, options: ["x", "y"] })).toMatch(
      /correct choice/,
    );
    expect(
      addedProblem({ ...q, options: ["x", "y"], correct_option_index: 1 }),
    ).toBeNull();
  });
});

describe("Question formats (backend ADR 0045)", () => {
  it("builds each non-typing format's key from what the partner wrote, and marks typed formats", async () => {
    const { keyFields, needsKeyboard, textsOf, formatProblem } =
      await import("../QuestionFormats");
    const base = {
      id: "q",
      section_key: "2.1",
      concept_key: "2.1:alpha",
      prompt: "SYNTHETIC ___ question",
      origin: "partner" as const,
    };
    const t = textsOf({ ...base, answer_kind: "mcq" });
    const order = {
      ...base,
      answer_kind: "sequence" as const,
      ...keyFields("sequence", { ...t, order: "a\nb\nc" }),
    };
    expect(order).toMatchObject({
      sequence_entries: ["a", "b", "c"],
      correct_order: [0, 1, 2],
    });
    expect(formatProblem(order)).toBeNull();
    const pairs = {
      ...base,
      answer_kind: "matching" as const,
      ...keyFields("matching", {
        ...t,
        pairs: "1/2 = half\n1/4 = quarter\n3/4 = three quarters",
      }),
    };
    expect(pairs.match_pairs).toHaveLength(3);
    const line = {
      ...base,
      answer_kind: "numeric" as const,
      ...keyFields("numeric", {
        ...t,
        number: "3/4",
        line: { on: true, min: "0", max: "1", step: "1/4" },
      }),
    };
    expect(line.entry).toEqual({
      mode: "number_line",
      min: "0",
      max: "1",
      step: "1/4",
    });
    expect(needsKeyboard(line)).toBe(false);
    expect(
      needsKeyboard({ ...base, answer_kind: "numeric", expected_numeric: "3" }),
    ).toBe(true);
    expect(
      needsKeyboard({
        ...base,
        answer_kind: "string_set",
        accepted_answers: ["x"],
      }),
    ).toBe(true);
  });
});
