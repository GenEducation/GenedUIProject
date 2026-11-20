import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AddedQuestion } from "@/features/partner/types/sources";
import {
  FormatFields,
  formatProblem,
  keyFields,
  keyText,
  textsOf,
} from "../QuestionFormats";

/** SYNTHETIC: a free-form activity (backend ADR 0048). */
const ACTIVITY: AddedQuestion = {
  id: "a1",
  section_key: "s1",
  concept_key: "s1:c1",
  prompt: "SYNTHETIC: tell the story in your own words.",
  answer_kind: "activity",
  activity_mode: "speak",
  origin: "ai_assisted",
};

describe("activity format", () => {
  it("has no answer key and describes its mode", () => {
    expect(keyText(ACTIVITY)).toMatch(/Speak: a free answer, no fixed key/);
    expect(formatProblem(ACTIVITY)).toBeNull();
    expect(formatProblem({ ...ACTIVITY, activity_mode: undefined })).toMatch(
      /how the learner answers/i,
    );
  });

  it("sends its mode and only the optional fields the partner filled", () => {
    const texts = { ...textsOf(ACTIVITY), rubric: "  ", example: "SYNTHETIC example" };
    expect(keyFields("activity", texts)).toEqual({
      activity_mode: "speak",
      example_answer: "SYNTHETIC example",
    });
  });

  it("lets the partner change the mode and leave the rubric empty", () => {
    let latest = textsOf(ACTIVITY);
    render(
      <FormatFields
        kind="activity"
        texts={latest}
        onTexts={(t) => (latest = t)}
      />,
    );
    expect(screen.getByText(/what a good answer includes \(optional\)/i)).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "read_aloud" },
    });
    expect(keyFields("activity", latest)).toEqual({ activity_mode: "read_aloud" });
  });
});

describe("reading and listening activities", () => {
  it("need their passage, and keep it apart from the prompt", () => {
    const listen: AddedQuestion = { ...ACTIVITY, activity_mode: "listen" };
    expect(formatProblem(listen)).toMatch(/passage/i);
    expect(formatProblem({ ...listen, passage: "SYNTHETIC passage." })).toBeNull();
    const texts = { ...textsOf(listen), passage: "SYNTHETIC passage." };
    expect(keyFields("activity", texts)).toMatchObject({ passage: "SYNTHETIC passage." });
    expect(keyFields("activity", { ...texts, mode: "write" })).not.toHaveProperty("passage");
  });
});
