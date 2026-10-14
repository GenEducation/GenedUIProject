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
  it("offers no scientific keys to a grade 4 learner", () => {
    asStudent(4);
    render(<StepCard />);
    expect(screen.getByRole("heading", { name: "SYNTHETIC count the shapes" })).toBeInTheDocument();
    act(() => screen.getByRole("textbox").focus());
    expect(screen.queryByRole("group", { name: /calculator keys/i })).not.toBeInTheDocument();
  });

  it("offers them from grade 6", () => {
    asStudent(8);
    render(<StepCard />);
    act(() => screen.getByRole("textbox").focus());
    expect(screen.getByRole("group", { name: /calculator keys/i })).toBeInTheDocument();
  });

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

  it("says how many replies count so far", () => {
    render(<StepCard />);
    expect(screen.getByText(/talk it through/i)).toBeInTheDocument();
    expect(screen.getByText("Replies that count: 1 of 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next step/i })).not.toBeInTheDocument();
  });

  it("offers Next step once enough replies counted", () => {
    useLessonStore.setState({
      instance: makeLessonInstance({
        active_node: { ...makeLessonInstance().active_node!, engagement_count: 2, engagement_required: 2, check_item_ids: [] },
      }),
    });
    render(<StepCard />);
    expect(screen.getByRole("button", { name: /next step/i })).toBeInTheDocument();
  });
});
