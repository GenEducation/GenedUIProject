import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { useParentStore } from "../../../store/useParentStore";
import { ParentSettingsView } from "../ParentSettingsView";
import { parentService } from "../../../services/parentService";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/parent/settings",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../../../services/parentService", () => ({
  parentService: {
    fetchStudentGrade: vi.fn(async () => 7),
    fetchLatestActivity: vi.fn(async () => null),
    updateParentName: vi.fn(async (name: string) => name.trim().replace(/\s+/g, " ")),
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
  it("lets a parent add the name their child sees, and keeps it", async () => {
    seed({ parentProfile: { ...PROFILE, name: undefined } });
    render(<ParentSettingsView />);
    expect(screen.getByText("Not added")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your name" }), { target: { value: "  Priya   Sharma " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(parentService.updateParentName).toHaveBeenCalledWith("Priya   Sharma"));
    await waitFor(() => expect(useParentStore.getState().parentProfile?.name).toBe("Priya Sharma"));
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("does not save an empty name", async () => {
    seed({ parentProfile: { ...PROFILE, name: undefined } });
    render(<ParentSettingsView />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your name" }), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please enter your name.");
    expect(parentService.updateParentName).not.toHaveBeenCalled();
  });
});
