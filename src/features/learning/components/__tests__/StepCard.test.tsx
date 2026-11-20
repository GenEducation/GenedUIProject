import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LESSON_ID, lessonFixture, makeLessonInstance, syntheticPayload } from "@/test/msw/handlers/lesson";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useLessonStore } from "../../useLessonStore";
import { StepCard } from "../StepCard";
import type { StudentProfile } from "@/features/student/store/useStudentStore";

const store = () => useLessonStore.getState();

/** A numeric check: the kind whose answer box can show a calculator. */
const numericPayload = () => {
  const payload = syntheticPayload();
  payload.node.check_items = [{ ...payload.node.check_items[0], response_type: "numeric", options: [], prompt: "SYNTHETIC count the shapes" }];
  return payload;
};

const asStudent = (grade: number) => useStudentStore.setState({ studentProfile: { grade } as StudentProfile });

beforeEach(async () => {
  lessonFixture.reset();
  store().reset();
  localStorage.clear();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
  await store().load(LESSON_ID);
  useLessonStore.setState({ payload: numericPayload() });
});

describe("StepCard: a check", () => {
  it("writes its own words in the session language", () => {
    asStudent(8);
    act(() => store().setSessionLanguage("hi"));
    render(<StepCard />);
    expect(screen.getByRole("button", { name: /संकेत/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /उत्तर जाँचें/ })).toBeInTheDocument();
    expect(screen.queryByText("Hint")).not.toBeInTheDocument();
  });

  it("falls back to English for a language with no words of its own", () => {
    asStudent(8);
    localStorage.setItem("gened_voice_language", "fr"); // not one of the eight: ignored
    render(<StepCard />);
    expect(screen.getByRole("button", { name: /hint/i })).toBeInTheDocument();
  });
});

describe("StepCard: the tutor presents the check (backend ADR 0045)", () => {
  it("shows no check until the tutor has presented it, then shows it", () => {
    const base = store().instance!;
    act(() => useLessonStore.setState({ instance: { ...base, active_node: { ...base.active_node!, check_presented: false } } }));
    const { container, unmount } = render(<StepCard />);
    expect(screen.queryByRole("button", { name: /check answer/i })).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/SYNTHETIC count the shapes/);
    unmount();
    act(() => useLessonStore.setState({ instance: { ...base, active_node: { ...base.active_node!, check_presented: true } } }));
    render(<StepCard />);
    expect(screen.getByText(/SYNTHETIC count the shapes/)).toBeInTheDocument();
  });
});

describe("StepCard: a part that is not finished", () => {
  beforeEach(() => {
    const payload = syntheticPayload();
    payload.node.check_items = [];
    useLessonStore.setState({
      payload,
      instance: makeLessonInstance({
        active_node: { ...makeLessonInstance().active_node!, engagement_count: 1, engagement_required: 2, check_item_ids: [] },
      }),
    });
  });

  it("never shows a count of replies, and no Next step, however many replies were sent (backend ADR 0044)", () => {
    for (const count of [0, 1, 2, 9]) {
      useLessonStore.setState({
        instance: makeLessonInstance({
          active_node: { ...makeLessonInstance().active_node!, engagement_count: count, engagement_required: 2, check_item_ids: [], done_available: false },
        }),
      });
      const { container, unmount } = render(<StepCard />);
      expect(container.textContent ?? "").not.toMatch(/repl(y|ies)|count|of 2|talk it through|unlock/i);
      expect(screen.queryByRole("button", { name: /next step/i })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("offers Next step only where a legacy plan still advertises done_available", () => {
    useLessonStore.setState({
      instance: makeLessonInstance({
        active_node: {
          ...makeLessonInstance().active_node!,
          engagement_count: 2,
          engagement_required: 2,
          check_item_ids: [],
          done_available: true,
        },
      }),
    });
    render(<StepCard />);
    expect(screen.getByRole("button", { name: /next step/i })).toBeInTheDocument();
  });
});
