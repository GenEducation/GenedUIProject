import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useLessonStore } from "../../useLessonStore";
import { LessonLanguageSelect } from "../LessonLanguageSelect";

const asLearner = (user_id: string, preferred_language: string | null = null) =>
  useStudentStore.setState({ studentProfile: { user_id, username: user_id, role: "student", preferred_language } as never });

beforeEach(() => {
  localStorage.clear();
  useLessonStore.getState().reset();
});

describe("LessonLanguageSelect: the lesson's one language selector", () => {
  it("is on screen before anything is said, showing the learner's profile language, and offers the eight session languages", () => {
    asLearner("learner-a", "mr");
    render(<LessonLanguageSelect />);
    const select = screen.getByRole("combobox", { name: "पाठाची भाषा" });
    expect(select).toHaveTextContent("मराठी");
    fireEvent.click(select);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "English", "हिन्दी", "Hinglish", "मराठी", "ਪੰਜਾਬੀ", "தமிழ்", "తెలుగు", "ಕನ್ನಡ",
    ]);
  });

  it("a pick overrides the profile, is remembered for that learner only, and never for the next learner on the browser", () => {
    asLearner("learner-a", "en");
    const { unmount } = render(<LessonLanguageSelect />);
    fireEvent.click(screen.getByRole("combobox", { name: "Lesson language" }));
    fireEvent.click(screen.getByRole("option", { name: "Hinglish" }));
    expect(useLessonStore.getState().sessionLanguage).toBe("hi-Latn");
    expect(screen.getByRole("combobox", { name: "Lesson ki bhasha" })).toHaveTextContent("Hinglish");
    expect(localStorage.getItem("gened_lesson_language:learner-a")).toBe("hi-Latn");
    unmount();

    // Another child signs in on the same browser: their own profile language, not the last child's pick.
    useLessonStore.getState().reset();
    asLearner("learner-b", "ta");
    render(<LessonLanguageSelect />);
    expect(screen.getByRole("combobox", { name: "பாட மொழி" })).toHaveTextContent("தமிழ்");
  });

  it("after a reload the same learner keeps their own pick", () => {
    asLearner("learner-a", "en");
    localStorage.setItem("gened_lesson_language:learner-a", "hi");
    render(<LessonLanguageSelect />);
    expect(screen.getByRole("combobox", { name: "पाठ की भाषा" })).toHaveTextContent("हिन्दी");
  });
});
