import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CHECK_ITEM } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { WrittenAnswer } from "../../check/WrittenAnswer";
import { formatOf } from "../../check/formats";
import type { CheckItem, WrittenResult } from "../../types";

/** The written-response renderer (W2 P6), through its own card. SYNTHETIC test data; the store's `answerWritten` is a spy. */
const check: CheckItem = { id: CHECK_ITEM, prompt: "SYNTHETIC what do plants need?", response_type: "rubric", role: "checkpoint", options: [], figure_groups: [], task: { mode: "written", min_chars: 5, max_chars: 40 } };
const committed = (over: Partial<WrittenResult> = {}): WrittenResult => ({
  status: "committed", attempt_id: "a1", outcome: "correct", correct: true, round_state: "open", replayed: false,
  feedback: { kind: "criteria", criteria: [{ criterion: "needs", title: "Names two needs", met: true, shown: "names two needs", next: null, error_tags: [] }] },
  clarification: null, instance: {} as WrittenResult["instance"], ...over,
});
const answerWritten = vi.fn();

/** Mount the card; the spy's behaviour is set by `script` first (a reset in here would wipe what a test scripted). */
function show(script: (spy: typeof answerWritten) => void = () => {}) {
  answerWritten.mockReset();
  script(answerWritten);
  useLessonStore.setState({ answerWritten });
  const onResult = vi.fn();
  render(<WrittenAnswer check={check} onResult={onResult} />);
  return onResult;
}
const box = () => screen.getByRole("textbox", { name: "Your answer" });
const send = () => screen.getByRole("button", { name: /send answer|try again/i });

describe("written response", () => {
  beforeEach(() => localStorage.clear());

  it("is a rubric check drawn as a written answer, and a spoken one is a different format", () => {
    expect(formatOf(check)).toBe("written_response");
    expect(formatOf({ ...check, task: { mode: "spoken", min_chars: 1, max_chars: 100 } })).toBe("spoken_response");
  });

  it("is labelled, shows the length against the band, and cannot be sent below the minimum or past the maximum", async () => {
    show();
    expect(send()).toBeDisabled();
    expect(screen.getByText("0 of 40 characters")).toBeInTheDocument();
    await userEvent.type(box(), "abc");
    expect(send()).toBeDisabled();
    await userEvent.type(box(), "def");
    expect(send()).toBeEnabled();
    expect(box()).toHaveAttribute("maxlength", "40");
    expect(box()).toHaveAccessibleDescription(/Ctrl\+Enter/);
  });

  it("sends with the keyboard, shows the checking state while it waits, then the authored descriptor, and reports the committed result once", async () => {
    let resolve!: (r: WrittenResult) => void;
    const onResult = show((s) => s.mockReturnValue(new Promise<WrittenResult>((r) => (resolve = r))));
    await userEvent.type(box(), "water and light{Control>}{Enter}{/Control}");
    expect(await screen.findByText("Checking your answer…")).toBeInTheDocument();
    expect(box()).toBeDisabled();
    resolve(committed());
    expect(await screen.findByText("You showed: names two needs")).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(answerWritten).toHaveBeenCalledTimes(1);
  });

  it("keeps the answer and the same request id after a failure, so a retry cannot evaluate it twice, and takes a new id when the words change", async () => {
    show((s) => s.mockRejectedValueOnce(new Error("network")).mockResolvedValue(committed()));
    await userEvent.type(box(), "water and light");
    await userEvent.click(send());
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't be sent");
    expect(box()).toHaveValue("water and light");
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(answerWritten).toHaveBeenCalledTimes(2));
    const [first, second] = answerWritten.mock.calls.map((c) => c[2].requestId);
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("says a busy evaluator is a wait, not a mistake", async () => {
    show((s) => s.mockRejectedValue(new Error("evaluator_busy")));
    await userEvent.type(box(), "water and light");
    await userEvent.click(send());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Try again in a moment/);
  });

  it("asks the rubric's one neutral question, then sends the reply with the first answer", async () => {
    const onResult = show((s) =>
      s
        .mockResolvedValueOnce(committed({ status: "needs_clarification", attempt_id: null, outcome: null, correct: null, feedback: null, clarification: { criterion: "needs", probe: "Can you tell me one more thing plants need?", remaining: 1 } }))
        .mockResolvedValue(committed()),
    );
    await userEvent.type(box(), "plants need water");
    await userEvent.click(send());
    expect(await screen.findByText("Can you tell me one more thing plants need?")).toBeInTheDocument();
    expect(onResult).not.toHaveBeenCalled();
    expect(send()).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox", { name: "Your reply to the question above" }), "and light");
    await userEvent.click(send());
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    expect(answerWritten.mock.calls[1][2]).toMatchObject({ clarification: "and light" });
    expect(answerWritten.mock.calls[1][1]).toBe("plants need water");
  });

  it("an answer that could not be rated is a neutral note with a retry code, never 'wrong', and does not count as a committed result", async () => {
    show((s) => s.mockResolvedValue(committed({ outcome: "unscorable", correct: null, feedback: { kind: "retry", code: "write_a_little_more", retry: true, reason: "gate_response_too_short" } })));
    await userEvent.type(box(), "water and light");
    await userEvent.click(send());
    expect(await screen.findByText(/couldn't be rated this time/)).toBeInTheDocument();
    expect(screen.getByText(/Write a little more/)).toBeInTheDocument();
    expect(screen.queryByText(/wrong|Not quite/i)).toBeNull();
  });
});
