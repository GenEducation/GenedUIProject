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
import { studentService } from "../../../student/services/studentService";
import { useParentStore } from "../useParentStore";

const svc = vi.mocked(parentService, true);
const studentSvc = vi.mocked(studentService, true);

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

  it("does not auto-select when there is no approved child", async () => {
    svc.fetchLinkedStudents.mockResolvedValue([linked("s1", "PENDING")]);
    await useParentStore.getState().fetchLinkedStudents();
    expect(useParentStore.getState().selectedStudentId).toBeNull();
  });

  it("leaves an existing selection untouched", async () => {
    useParentStore.setState({ selectedStudentId: "s9" });
    svc.fetchLinkedStudents.mockResolvedValue([linked("s2", "APPROVED")]);
    await useParentStore.getState().fetchLinkedStudents();
    expect(useParentStore.getState().selectedStudentId).toBe("s9");
  });

  it("is a no-op without a parent profile", async () => {
    useParentStore.setState({ parentProfile: null });
    await useParentStore.getState().fetchLinkedStudents();
    expect(svc.fetchLinkedStudents).not.toHaveBeenCalled();
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

  it("clearing selection (null) does not force the analytics view", () => {
    useParentStore.setState({ activeDashboardView: "profile" });
    useParentStore.getState().setSelectedStudentId(null);
    expect(useParentStore.getState().activeDashboardView).toBe("profile");
  });
});

describe("useParentStore.updateStudentStatus — optimistic", () => {
  it("optimistically updates the child's status locally", async () => {
    useParentStore.setState({ linkedStudents: [linked("s1", "PENDING")], selectedStudentId: "s1" });
    svc.updateStudentStatus.mockResolvedValue(linked("s1", "APPROVED"));

    await useParentStore.getState().updateStudentStatus("s1", "APPROVED");

    expect(useParentStore.getState().linkedStudents[0].status).toBe("APPROVED");
  });

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
  it("removes the child and re-selects the next approved when the selected one is unlinked", async () => {
    useParentStore.setState({
      linkedStudents: [linked("s1", "APPROVED"), linked("s2", "APPROVED")],
      selectedStudentId: "s1",
      activeDashboardView: "chat",
    });
    svc.unlinkStudent.mockResolvedValue(undefined);

    await useParentStore.getState().unlinkStudent("s1");

    const s = useParentStore.getState();
    expect(s.linkedStudents.map((x) => x.student_id)).toEqual(["s2"]);
    expect(s.selectedStudentId).toBe("s2");
    expect(s.activeDashboardView).toBe("analytics");
  });

  it("resets selection to null when no approved child remains", async () => {
    useParentStore.setState({
      linkedStudents: [linked("s1", "APPROVED"), linked("s2", "PENDING")],
      selectedStudentId: "s1",
    });
    svc.unlinkStudent.mockResolvedValue(undefined);

    await useParentStore.getState().unlinkStudent("s1");

    expect(useParentStore.getState().selectedStudentId).toBeNull();
  });

  it("keeps the current selection when a different child is unlinked", async () => {
    useParentStore.setState({
      linkedStudents: [linked("s1", "APPROVED"), linked("s2", "APPROVED")],
      selectedStudentId: "s1",
    });
    svc.unlinkStudent.mockResolvedValue(undefined);

    await useParentStore.getState().unlinkStudent("s2");

    expect(useParentStore.getState().selectedStudentId).toBe("s1");
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

describe("useParentStore — session drill-down (via studentService)", () => {
  it("fetchStudentSessions stores the child's sessions", async () => {
    studentSvc.fetchSessions.mockResolvedValue({ sessions: [{ id: "sess1" }] } as never);
    await useParentStore.getState().fetchStudentSessions("s1");
    expect(useParentStore.getState().selectedStudentSessions).toEqual([{ id: "sess1" }]);
    expect(useParentStore.getState().isFetchingSessions).toBe(false);
  });

  it("fetchSessionHistory stores the session transcript", async () => {
    studentSvc.fetchChatHistory.mockResolvedValue({ history: [{ m: "hi" }] } as never);
    await useParentStore.getState().fetchSessionHistory("s1", "sess1");
    expect(useParentStore.getState().activeSessionHistory).toEqual([{ m: "hi" }]);
    expect(useParentStore.getState().isFetchingHistory).toBe(false);
  });
});

describe("useParentStore — view setters", () => {
  it("setDashboardView and setActiveSessionId write their slices", () => {
    useParentStore.getState().setDashboardView("schedule");
    useParentStore.getState().setActiveSessionId("sess9");
    expect(useParentStore.getState().activeDashboardView).toBe("schedule");
    expect(useParentStore.getState().activeSessionId).toBe("sess9");
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
