import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectHeader } from "../SubjectHeader";

const base = { grade: 6, chapterCount: 12, onBack: () => {}, onContinue: () => {} };

describe("SubjectHeader", () => {
  it("shows the subject's word-mark, named for screen readers, with the grade, standing and Continue", () => {
    const onContinue = vi.fn();
    render(
      <SubjectHeader {...base} subject="Science" progress={{ finished: 2, underWay: 3 }} current={{ number: 3, title: "Mindful Eating" }} onContinue={onContinue} />,
    );
    expect(screen.getByTestId("subject-wordmark")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Science" })).toBeInTheDocument();
    expect(screen.getByText("Grade 6 · 12 chapters")).toBeInTheDocument();
    expect(screen.getByText("2 of 12 finished · 3 under way")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue Ch 3 · Mindful Eating/ }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("sets the name large for a subject without a word-mark, and holds the standing back until it's known", () => {
    const onBack = vi.fn();
    render(<SubjectHeader {...base} subject="History" progress={null} current={null} onBack={onBack} />);
    expect(screen.queryByTestId("subject-wordmark")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "History" })).toBeInTheDocument();
    expect(screen.queryByText(/finished/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
