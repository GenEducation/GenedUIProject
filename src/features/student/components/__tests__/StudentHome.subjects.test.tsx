import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { resetSubjectCatalogForTests } from "@/features/subjects/subjectCatalog";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }) }));
vi.mock("framer-motion", async () =>
  (await import("@/features/partner/components/visuals/__tests__/framerPassthrough")).framerPassthrough(),
);
// Chrome around the subjects shelf is covered elsewhere.
vi.mock("@/features/student/components/StudentHomeSidebar", () => ({ StudentHomeSidebar: () => null }));
vi.mock("@/components/NotificationBell", () => ({ NotificationBell: () => null }));

import { StudentHome } from "../StudentHome";

beforeEach(() => {
  push.mockReset();
  resetSubjectCatalogForTests();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  useStudentStore.setState({
    studentProfile: { user_id: "u-synthetic", username: "synthetic", role: "STUDENT", grade: 6, school_board: "CBSE" },
    recentChats: [],
    // The MVP agent list is not where subjects come from any more.
    availableAgents: [],
    fetchSessions: vi.fn(async () => {}),
    fetchAvailableAgents: vi.fn(async () => {}),
    fetchStudentStats: vi.fn(async () => {}),
  });
});

describe("StudentHome — My subjects", () => {
  it("shows the taxonomy's subjects for the student's grade, each opening its chapter page", async () => {
    render(<StudentHome />);
    const maths = await screen.findByRole("button", { name: "Mathematics: see chapters" });
    // Grade 6 in the synthetic taxonomy: seven subjects.
    expect(screen.getAllByRole("button", { name: /: see chapters$/ })).toHaveLength(7);
    expect(screen.queryByRole("button", { name: "Chat" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Voice" })).toBeNull();

    fireEvent.click(maths);
    expect(push).toHaveBeenCalledWith("/student/subjects/Mathematics");

    fireEvent.click(screen.getByRole("button", { name: "Social & Political Science: see chapters" }));
    expect(push).toHaveBeenLastCalledWith("/student/subjects/Social%20%26%20Political%20Science");
  });

  it("offers only the subjects the taxonomy has for a lower grade", async () => {
    useStudentStore.setState({ studentProfile: { user_id: "u-synthetic", username: "synthetic", role: "STUDENT", grade: 4, school_board: "CBSE" } });
    render(<StudentHome />);
    await screen.findByRole("button", { name: "Mathematics: see chapters" });
    expect(screen.getAllByRole("button", { name: /: see chapters$/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "English: see chapters",
      "Mathematics: see chapters",
    ]);
  });
});
