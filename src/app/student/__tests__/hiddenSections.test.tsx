import { describe, it, expect, vi } from "vitest";

// next/navigation's redirect() throws to abort rendering; capture the target.
const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }));
vi.mock("next/navigation", () => ({ redirect }));

import PracticeLayout from "../assessments/layout";
import ScheduleLayout from "../schedule/layout";
import { FEATURES } from "@/constants/features";

describe("hidden student sections", () => {
  it("are switched off", () => {
    expect(FEATURES.practice).toBe(false);
    expect(FEATURES.schedule).toBe(false);
  });

  it.each([
    ["/student/assessments", PracticeLayout],
    ["/student/schedule", ScheduleLayout],
  ])("%s redirects to student home on the server", (_path, Layout) => {
    expect(() => Layout({ children: "page" })).toThrow("REDIRECT /student");
  });
});
