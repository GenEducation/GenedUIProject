import { describe, it, expect, beforeEach, vi } from "vitest";

import { autoResetStore } from "@/test/helpers/resetStores";
import { installLocationStub } from "@/test/helpers/location";

vi.mock("../../services/parentService", () => ({
  parentService: {
    fetchLinkedStudents: vi.fn(),
    linkStudent: vi.fn(),
    updateStudentStatus: vi.fn(),
    unlinkStudent: vi.fn(),
  },
}));
vi.mock("../../../student/services/studentService", () => ({
  studentService: {
    fetchSessions: vi.fn(),
    fetchChatHistory: vi.fn(),
  },
}));

import { parentService } from "../../services/parentService";
import { useParentStore } from "../useParentStore";

const svc = vi.mocked(parentService, true);

autoResetStore(useParentStore);

const profile = { user_id: "p1", username: "mom", email: "mom@x.com", role: "parent" };

function linked(id: string, status: "PENDING" | "APPROVED" | "REJECTED") {
  return { student_id: id, parent_id: "p1", status, requested_at: "now" };
}

beforeEach(() => {
  vi.clearAllMocks();
  useParentStore.getState().setParentProfile(profile);
});

describe("useParentStore.fetchLinkedStudents — auto-select", () => {
  it("auto-selects the first APPROVED child when none is selected", async () => {
    svc.fetchLinkedStudents.mockResolvedValue([
      linked("s1", "PENDING"),
      linked("s2", "APPROVED"),
      linked("s3", "APPROVED"),
    ]);
    await useParentStore.getState().fetchLinkedStudents();
    expect(useParentStore.getState().selectedStudentId).toBe("s2");
  });

  it("leaves an existing selection untouched", async () => {
    useParentStore.setState({ selectedStudentId: "s9" });
    svc.fetchLinkedStudents.mockResolvedValue([linked("s2", "APPROVED")]);
    await useParentStore.getState().fetchLinkedStudents();
    expect(useParentStore.getState().selectedStudentId).toBe("s9");
  });
});

describe("useParentStore.setSelectedStudentId", () => {
  it("selecting a child resets sessions/history and switches to analytics", () => {
    useParentStore.setState({
      selectedStudentSessions: [{ id: 1 }],
      activeSessionId: "sess",
      activeSessionHistory: [{ m: 1 }],
      activeDashboardView: "chat",
    });
    useParentStore.getState().setSelectedStudentId("s2");
    const s = useParentStore.getState();
    expect(s.selectedStudentId).toBe("s2");
    expect(s.selectedStudentSessions).toEqual([]);
    expect(s.activeSessionId).toBeNull();
    expect(s.activeSessionHistory).toEqual([]);
    expect(s.activeDashboardView).toBe("analytics");
  });
});

describe("useParentStore.updateStudentStatus — optimistic", () => {
  it("auto-selects a newly approved child when nothing was selected", async () => {
    useParentStore.setState({ linkedStudents: [linked("s1", "PENDING")], selectedStudentId: null });
    svc.updateStudentStatus.mockResolvedValue(linked("s1", "APPROVED"));

    await useParentStore.getState().updateStudentStatus("s1", "APPROVED");

    expect(useParentStore.getState().selectedStudentId).toBe("s1");
  });

  it("rethrows on service failure", async () => {
    useParentStore.setState({ linkedStudents: [linked("s1", "PENDING")] });
    svc.updateStudentStatus.mockRejectedValue(new Error("nope"));
    await expect(useParentStore.getState().updateStudentStatus("s1", "APPROVED")).rejects.toThrow("nope");
  });
});

describe("useParentStore.unlinkStudent — reselection", () => {
  it("resets selection to null when no approved child remains", async () => {
    useParentStore.setState({
      linkedStudents: [linked("s1", "APPROVED"), linked("s2", "PENDING")],
      selectedStudentId: "s1",
    });
    svc.unlinkStudent.mockResolvedValue(undefined);

    await useParentStore.getState().unlinkStudent("s1");

    expect(useParentStore.getState().selectedStudentId).toBeNull();
  });
});

describe("useParentStore.linkNewStudent", () => {
  it("links then refetches the roster", async () => {
    svc.linkStudent.mockResolvedValue(linked("s5", "PENDING"));
    svc.fetchLinkedStudents.mockResolvedValue([linked("s5", "PENDING")]);

    await useParentStore.getState().linkNewStudent("s5");

    expect(svc.linkStudent).toHaveBeenCalledWith("p1", "s5");
    expect(svc.fetchLinkedStudents).toHaveBeenCalled();
  });
});

describe("useParentStore.logoutParent", () => {
  it("clears auth localStorage + state and redirects home", () => {
    const loc = installLocationStub();
    localStorage.setItem("gened_auth_token", "x");
    useParentStore.setState({ linkedStudents: [linked("s1", "APPROVED")], selectedStudentId: "s1" });

    useParentStore.getState().logoutParent();

    expect(localStorage.getItem("gened_auth_token")).toBeNull();
    expect(useParentStore.getState().parentProfile).toBeNull();
    expect(useParentStore.getState().linkedStudents).toEqual([]);
    expect(useParentStore.getState().selectedStudentId).toBeNull();
    expect(loc.href).toBe("/");
  });
});
