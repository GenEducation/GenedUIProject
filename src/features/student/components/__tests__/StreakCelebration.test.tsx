import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakCelebration, streakMoment } from "../StreakCelebration";

describe("streakMoment", () => {
  it("celebrates nothing on a first visit (no record on this device)", () => {
    expect(streakMoment(null, { current: 5, longest: 9 })).toBeNull();
  });

  it("celebrates a longer streak from day 2 up", () => {
    expect(streakMoment({ current: 3, longest: 9 }, { current: 4, longest: 9 })).toEqual({ kind: "up", days: 4 });
    expect(streakMoment({ current: 0, longest: 9 }, { current: 1, longest: 9 })).toBeNull();
  });

  it("calls it a record when the streak passes the longest run seen", () => {
    expect(streakMoment({ current: 5, longest: 5 }, { current: 6, longest: 6 })).toEqual({ kind: "record", days: 6 });
  });

  it("stays quiet when the streak is the same or broke", () => {
    expect(streakMoment({ current: 4, longest: 9 }, { current: 4, longest: 9 })).toBeNull();
    expect(streakMoment({ current: 4, longest: 9 }, { current: 1, longest: 9 })).toBeNull();
  });
});

describe("StreakCelebration", () => {
  beforeEach(() => localStorage.clear());

  it("only remembers the streak on a first visit, then celebrates once when it grows", () => {
    const { rerender } = render(<StreakCelebration userId="u1" stats={{ currentStreak: 3, longestStreak: 8 }} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<StreakCelebration userId="u1" stats={{ currentStreak: 4, longestStreak: 8 }} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("4 days in a row!");
  });

  it("shows the record version when the streak beats the longest run", () => {
    localStorage.setItem("zoovi_streak_seen:u1", JSON.stringify({ current: 7, longest: 7 }));
    render(<StreakCelebration userId="u1" stats={{ currentStreak: 8, longestStreak: 8 }} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Your best run yet!");
  });

  it("waits while another moment holds the screen", () => {
    localStorage.setItem("zoovi_streak_seen:u1", JSON.stringify({ current: 2, longest: 9 }));
    const { rerender } = render(<StreakCelebration userId="u1" stats={{ currentStreak: 3, longestStreak: 9 }} held />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<StreakCelebration userId="u1" stats={{ currentStreak: 3, longestStreak: 9 }} held={false} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("3 days in a row!");
  });
});
