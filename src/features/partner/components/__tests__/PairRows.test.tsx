import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AddedQuestion } from "@/features/partner/types/sources";
import {
  FormatFields,
  formatProblem,
  keyFields,
  textsOf,
} from "../QuestionFormats";

const BLANK: AddedQuestion = {
  id: "m1",
  section_key: "s1",
  concept_key: "s1:c1",
  prompt: "SYNTHETIC: match each word to its opposite.",
  answer_kind: "matching",
  origin: "partner",
};

describe("matching pairs", () => {
  it("is written as rows of two fields and becomes the pairs", () => {
    let latest = textsOf(BLANK);
    render(
      <FormatFields
        kind="matching"
        texts={latest}
        onTexts={(t) => (latest = t)}
      />,
    );
    const words = [
      ["SYNTHETIC hot", "SYNTHETIC cold"],
      ["SYNTHETIC up", "SYNTHETIC down"],
      ["SYNTHETIC big", "SYNTHETIC small"],
    ];
    words.forEach(([l, r], i) => {
      fireEvent.change(screen.getByLabelText(`Pair ${i + 1}, left`), {
        target: { value: l },
      });
      fireEvent.change(screen.getByLabelText(`Pair ${i + 1}, right`), {
        target: { value: r },
      });
    });
    const fields = keyFields("matching", latest);
    expect(fields.match_left).toEqual(words.map((w) => w[0]));
    expect(fields.match_right).toEqual(words.map((w) => w[1]));
    expect(formatProblem({ ...BLANK, ...fields })).toBeNull();
  });

  it("asks for both sides of at least three pairs", () => {
    expect(formatProblem({ ...BLANK, match_pairs: [] })).toMatch(
      /at least three pairs/i,
    );
  });
});
