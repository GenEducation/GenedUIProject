import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { LearnerPreview, checkOf } from "../LearnerPreview";
import { formatOf } from "@/features/learning/check/formats";
import type { AddedQuestion } from "../../types/sources";

const base = { id: "q1", section_key: "s", concept_key: "c", origin: "ai_assisted" as const };

describe("The partner's preview uses the learner's own renderers (backend ADR 0047)", () => {
  it("maps every authored format to the lesson screen's format", () => {
    const cases: [AddedQuestion, string][] = [
      [{ ...base, prompt: "SYNTHETIC", answer_kind: "mcq", options: ["a", "b"], correct_option_index: 0 }, "single_choice"],
      [{ ...base, prompt: "SYNTHETIC", answer_kind: "multi_select", options: ["a", "b", "c"], correct_option_indexes: [0, 1] }, "multiple_select"],
      [{ ...base, prompt: "SYNTHETIC", answer_kind: "sequence", sequence_entries: ["b", "a", "c"], correct_order: [1, 0, 2] }, "sequencing"],
      [{ ...base, prompt: "SYNTHETIC", answer_kind: "matching", match_left: ["x"], match_right: ["y"], match_pairs: [{ left: 0, right: 0 }] }, "matching_pairs"],
      [{ ...base, prompt: "SYNTHETIC", answer_kind: "grouping", group_names: ["g"], group_entries: ["e"], group_of: [0] }, "grouping"],
      [{ ...base, prompt: "SYNTHETIC [1]", answer_kind: "blanks", blank_answers: [["w"]], word_bank: ["w", "v"] }, "blanks"],
      [{ ...base, prompt: "SYNTHETIC", answer_kind: "numeric", expected_numeric: "7/12", entry: { mode: "number_line", min: "0", max: "1", step: "1/12" } }, "number_line"],
    ];  // prettier-ignore
    for (const [q, format] of cases) expect(formatOf(checkOf(q))).toBe(format);
  });

  it("lets the partner try a question without showing its key", () => {
    render(<LearnerPreview question={{ ...base, prompt: "SYNTHETIC pick one", answer_kind: "mcq", options: ["SYNTHETIC a", "SYNTHETIC b"], correct_option_index: 1 }} />);
    const preview = screen.getByLabelText("What students see");
    const option = within(preview).getByRole("radio", { name: "SYNTHETIC a" });
    fireEvent.click(option);
    expect(option).toHaveAttribute("aria-checked", "true");
    expect(within(preview).queryByText(/correct|answer/i)).toBeNull();
  });
});
