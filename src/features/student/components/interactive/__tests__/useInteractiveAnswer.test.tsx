import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Controllable store mock ───────────────────────────────────────────────────
const submitInteractiveAnswer = vi.fn();
const clearInteractiveResult = vi.fn();
let interactiveResults: Record<string, any> = {};

vi.mock("../../../store/useStudentStore", () => ({
  useStudentStore: () => ({ submitInteractiveAnswer, interactiveResults, clearInteractiveResult }),
}));

import { useInteractiveAnswer } from "../useInteractiveAnswer";

beforeEach(() => {
  submitInteractiveAnswer.mockReset();
  clearInteractiveResult.mockReset();
  interactiveResults = {};
});

describe("useInteractiveAnswer", () => {
  it("posts the stringified answer in the grader shape and stays submitted", async () => {
    submitInteractiveAnswer.mockResolvedValue({ is_correct: true, attempts: 1 });
    const { result } = renderHook(() => useInteractiveAnswer("d1", "select_cells", true));

    await act(async () => {
      await result.current.submit({ selected: [0, 1] });
    });

    expect(submitInteractiveAnswer).toHaveBeenCalledWith("d1", "select_cells", JSON.stringify({ selected: [0, 1] }));
    // submitted stays true after a graded result.
    expect(result.current.submitted).toBe(true);
    expect(result.current.submitError).toBe(false);
  });

  it("does NOT treat a failed POST as a wrong answer", async () => {
    // Store returns null on network failure (see submitInteractiveAnswer catch).
    submitInteractiveAnswer.mockResolvedValue(null);
    const { result } = renderHook(() => useInteractiveAnswer("d1", "select_cells", true));

    await act(async () => {
      await result.current.submit({ selected: [0] });
    });

    // Critical: widget unlocks (submitted=false) and surfaces an error, instead of
    // showing the red "Not quite" banner for something the server never graded.
    expect(result.current.submitted).toBe(false);
    expect(result.current.submitError).toBe(true);
    expect(result.current.isCorrect).toBeUndefined();

    // dismissError clears the error so the student can resubmit.
    act(() => result.current.dismissError());
    expect(result.current.submitError).toBe(false);
  });

  it("ignores re-entrant submits while one is in flight", async () => {
    let resolve!: (v: any) => void;
    submitInteractiveAnswer.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useInteractiveAnswer("d1", "select_cells", true));

    act(() => void result.current.submit({ selected: [0] }));
    act(() => void result.current.submit({ selected: [1] })); // should be a no-op

    await act(async () => {
      resolve({ is_correct: true, attempts: 1 });
    });
    expect(submitInteractiveAnswer).toHaveBeenCalledTimes(1);
  });

  it("rehydrates a cached result into studentAnswer (history / reload)", () => {
    interactiveResults = {
      d1: { is_correct: true, attempts: 2, student_answer: JSON.stringify({ selected: [0, 3] }) },
    };
    const { result } = renderHook(() => useInteractiveAnswer("d1", "select_cells", true));

    expect(result.current.submitted).toBe(true);
    expect(result.current.isCorrect).toBe(true);
    expect(result.current.attempts).toBe(2);
    expect(result.current.studentAnswer).toEqual({ selected: [0, 3] });

    // A corrupt cached student_answer does not throw.
    interactiveResults = { d1: { is_correct: false, attempts: 1, student_answer: "{not json" } };
    const corrupt = renderHook(() => useInteractiveAnswer("d1", "select_cells", true)).result;
    expect(corrupt.current.studentAnswer).toBeUndefined();
    expect(corrupt.current.submitted).toBe(true);
  });

  it("retry clears the cached result only when allowRetry is true", () => {
    interactiveResults = { d1: { is_correct: false, attempts: 1, student_answer: "{}" } };
    const { result } = renderHook(() => useInteractiveAnswer("d1", "select_cells", false));
    act(() => result.current.retry());
    expect(clearInteractiveResult).not.toHaveBeenCalled();

    const retryable = renderHook(() => useInteractiveAnswer("d1", "select_cells", true)).result;
    act(() => retryable.current.retry());
    expect(clearInteractiveResult).toHaveBeenCalledWith("d1");
  });
});
