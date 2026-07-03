import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { QuestionRenderer } from "../QuestionRenderer";
import type { Question, QuestionType } from "../../../types/test";

function question(type: QuestionType, over: Partial<Question> = {}): Question {
  return {
    question_id: "q1",
    type,
    prompt: "Sample prompt",
    options: null,
    marks: 1,
    paper_section: "A",
    blooms_level: "remember",
    match_pairs: null,
    assertion: null,
    reason: null,
    extract_passage: null,
    justification_required: false,
    ...over,
  };
}

describe("QuestionRenderer — dispatch by type", () => {
  it("multiple_choice: renders options and reports the selected option", () => {
    const onAnswerChange = vi.fn();
    render(
      <QuestionRenderer
        question={question("multiple_choice", { options: ["Glucose", "Oxygen"] })}
        questionNumber={1}
        onAnswerChange={onAnswerChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Glucose" }));
    expect(onAnswerChange).toHaveBeenCalledWith("q1", "Glucose");
  });

  it("true_false: reports True/False and routes justification separately", () => {
    const onAnswerChange = vi.fn();
    const onJustificationChange = vi.fn();
    render(
      <QuestionRenderer
        question={question("true_false", { justification_required: true })}
        questionNumber={2}
        answer="True"
        onAnswerChange={onAnswerChange}
        onJustificationChange={onJustificationChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "False" }));
    expect(onAnswerChange).toHaveBeenCalledWith("q1", "False");

    fireEvent.change(screen.getByPlaceholderText("Write your justification here..."), {
      target: { value: "Because it rotates" },
    });
    expect(onJustificationChange).toHaveBeenCalledWith("q1", "Because it rotates");
  });

  it("match_the_following: renders both columns without crashing", () => {
    render(
      <QuestionRenderer
        question={question("match_the_following", {
          match_pairs: [{ left: "Stroma", right: "Sugar" }],
        })}
        questionNumber={3}
        onAnswerChange={vi.fn()}
        onMatchSelectionChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Stroma")).toBeInTheDocument();
    expect(screen.getByText("Sugar")).toBeInTheDocument();
  });

  it("assertion_reasoning: renders the assertion/reason pair and reports the choice", () => {
    const onAnswerChange = vi.fn();
    render(
      <QuestionRenderer
        question={question("assertion_reasoning", {
          assertion: "Plants absorb CO2",
          reason: "They photosynthesize",
          options: ["Both true", "A false, R true"],
        })}
        questionNumber={4}
        onAnswerChange={onAnswerChange}
      />,
    );
    expect(screen.getByText("Plants absorb CO2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Both true" }));
    expect(onAnswerChange).toHaveBeenCalledWith("q1", "Both true");
  });

  it("extract_based: renders the passage and reports typed text", () => {
    const onAnswerChange = vi.fn();
    render(
      <QuestionRenderer
        question={question("extract_based", { extract_passage: "Once upon a time..." })}
        questionNumber={5}
        onAnswerChange={onAnswerChange}
      />,
    );
    expect(screen.getByText(/Once upon a time/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Answer all parts here/), {
      target: { value: "(a) yes (b) no" },
    });
    expect(onAnswerChange).toHaveBeenCalledWith("q1", "(a) yes (b) no");
  });

  it.each<QuestionType>(["short_answer", "long_answer", "open_ended", "application", "fill_in_the_blank"])(
    "%s: falls through to the short-answer textarea",
    (type) => {
      const onAnswerChange = vi.fn();
      render(
        <QuestionRenderer question={question(type)} questionNumber={6} onAnswerChange={onAnswerChange} />,
      );
      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "my answer" } });
      expect(onAnswerChange).toHaveBeenCalledWith("q1", "my answer");
    },
  );

  it("falls back to the short-answer textarea for an unrecognized type", () => {
    const onAnswerChange = vi.fn();
    render(
      <QuestionRenderer
        question={question("made_up_type" as QuestionType)}
        questionNumber={7}
        onAnswerChange={onAnswerChange}
      />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the question number and marks label", () => {
    render(
      <QuestionRenderer
        question={question("multiple_choice", { options: ["A"], marks: 2 })}
        questionNumber={9}
        onAnswerChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Q9")).toBeInTheDocument();
    expect(screen.getByText("2 marks")).toBeInTheDocument();
  });
});
