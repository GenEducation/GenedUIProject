import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { useParentStore } from "../../../store/useParentStore";
import { ParentSettingsView } from "../ParentSettingsView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/parent/settings",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../../../services/parentService", () => ({
  parentService: {
    fetchStudentGrade: vi.fn(async () => 7),
    fetchLatestActivity: vi.fn(async () => null),
  },
}));

const PROFILE = { user_id: "p1", username: "priya", email: "priya@example.com", role: "parent", name: "priya sharma" };

function seed(overrides: Partial<ReturnType<typeof useParentStore.getState>> = {}) {
  const updateStudentStatus = vi.fn(async () => {});
  const unlinkStudent = vi.fn(async () => {});
  useParentStore.setState({
    parentProfile: PROFILE,
    linkedStudents: [
      { student_id: "s1", parent_id: "p1", status: "APPROVED", requested_at: "2026-09-01T00:00:00Z", name: "Aarav" },
      { student_id: "s2", parent_id: "p1", status: "PENDING", requested_at: new Date().toISOString(), name: "Meera" },
      { student_id: "s3", parent_id: "p1", status: "REJECTED", requested_at: "2026-09-01T00:00:00Z", name: "Old" },
    ],
    updateStudentStatus,
    unlinkStudent,
    ...overrides,
  });
  return { updateStudentStatus, unlinkStudent };
}

beforeEach(() => vi.clearAllMocks());

describe("ParentSettingsView", () => {
  it("puts waiting requests on top and approves one", async () => {
    const { updateStudentStatus } = seed();
    render(<ParentSettingsView />);
    expect(screen.getByRole("list", { name: "Waiting for your approval" })).toHaveTextContent("Meera");
    fireEvent.click(screen.getByRole("button", { name: "Approve Meera" }));
    // Approving is the parent's explicit confirmation, so it is asked for in words first.
    expect(updateStudentStatus).not.toHaveBeenCalled();
    expect(screen.getByText(/parent or legal guardian/i)).toHaveTextContent("Confirm that you are Meera's parent or legal guardian");
    fireEvent.click(screen.getByRole("button", { name: /yes, i'm their parent or guardian/i }));
    await waitFor(() => expect(updateStudentStatus).toHaveBeenCalledWith("s2", "APPROVED"));
  });

  it("says so when a decision fails, and lets the parent retry", async () => {
    seed({ updateStudentStatus: vi.fn(async () => { throw new Error("nope"); }) });
    render(<ParentSettingsView />);
    fireEvent.click(screen.getByRole("button", { name: "Decline Meera" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("didn't go through");
    expect(screen.getByRole("button", { name: "Decline Meera" })).not.toBeDisabled();
  });

  it("asks before removing a child", async () => {
    const { unlinkStudent } = seed();
    render(<ParentSettingsView />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Aarav" }));
    expect(unlinkStudent).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Unlink" }));
    expect(unlinkStudent).toHaveBeenCalledWith("s1");
  });
});
