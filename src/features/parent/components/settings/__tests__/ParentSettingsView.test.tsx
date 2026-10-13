import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";

import { useParentStore } from "../../../store/useParentStore";
import { ParentSettingsView } from "../ParentSettingsView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/parent/profile",
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
  it("names the parent once, in the account card", () => {
    seed();
    render(<ParentSettingsView />);
    expect(screen.getAllByText("Priya Sharma")).toHaveLength(1);
    // the email is shown in the account card; the guide only offers it as a copy button
    const account = screen.getByRole("region", { name: "Account" });
    expect(within(account).getByText("priya@example.com")).toBeInTheDocument();
    // username differs from the name, so it earns its own mention
    expect(screen.getByText(/@priya · Parent account/)).toBeInTheDocument();
  });

  it("lists connected children as compact rows, without a dashboard button", async () => {
    seed();
    render(<ParentSettingsView />);
    const list = screen.getByRole("list", { name: "Connected children" });
    expect(within(list).getByText("Aarav")).toBeInTheDocument();
    expect(within(list).queryByText("Old")).not.toBeInTheDocument();
    expect(await within(list).findByText(/Grade 7 · Connected/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.getByText("1 connected")).toBeInTheDocument();
  });

  it("puts waiting requests on top and approves one", async () => {
    const { updateStudentStatus } = seed();
    render(<ParentSettingsView />);
    expect(screen.getByRole("list", { name: "Waiting for your approval" })).toHaveTextContent("Meera");
    fireEvent.click(screen.getByRole("button", { name: "Approve Meera" }));
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

  it("walks through adding a child, with the parent's email to copy", () => {
    seed();
    render(<ParentSettingsView />);
    const guide = screen.getByRole("region", { name: "Add another child" });
    expect(within(guide).getAllByRole("listitem")).toHaveLength(3);
    expect(within(guide).getByText("Send you an invite")).toBeInTheDocument();
    expect(within(guide).getByRole("button", { name: "Copy priya@example.com" })).toBeInTheDocument();
  });

  it("points a parent with no children at the steps", () => {
    seed({ linkedStudents: [] });
    render(<ParentSettingsView />);
    expect(screen.getByText(/No children connected yet\. The steps below/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Waiting for your approval" })).not.toBeInTheDocument();
  });
});
