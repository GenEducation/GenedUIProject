import { describe, it, expect, beforeEach, vi } from "vitest";

import { autoResetStore } from "@/test/helpers/resetStores";
import { installLocationStub } from "@/test/helpers/location";
import { ApiRequestError } from "@/utils/authFetch";
import type { TeacherProfile } from "../useTeacherStore";

vi.mock("../../services/teacherService", () => ({
  teacherService: {
    getOverview: vi.fn(),
    getStudents: vi.fn(),
    getRequests: vi.fn(),
    inviteStudent: vi.fn(),
    assignStudent: vi.fn(),
    deleteStudent: vi.fn(),
    getChats: vi.fn(),
    getChatMessages: vi.fn(),
  },
}));

import { teacherService } from "../../services/teacherService";
import { useTeacherStore } from "../useTeacherStore";

const svc = vi.mocked(teacherService, true);

autoResetStore(useTeacherStore);

const profile: TeacherProfile = {
  user_id: "t1",
  username: "ms_ada",
  email: "ada@school.edu",
  role: "TEACHER",
  full_name: "Ada Lovelace",
  title: "Math Teacher",
  subjects: ["Math"],
};

function apiError(over: Partial<ConstructorParameters<typeof ApiRequestError>[0]> = {}) {
  return new ApiRequestError({
    status: 403,
    error_code: "TCHR_1104",
    message: "Approval blocked.",
    request_id: "r1",
    retryable: false,
    details: {},
    ...over,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.getOverview.mockResolvedValue({ total_students: 1, pending: 0, approved: 1 });
});

describe("useTeacherStore — no-profile guards", () => {
  it("fetchStudents is a no-op without a profile (service never called)", async () => {
    await useTeacherStore.getState().fetchStudents();
    expect(svc.getStudents).not.toHaveBeenCalled();
  });

  it("approve returns a not-signed-in failure without a profile", async () => {
    const res = await useTeacherStore.getState().approve("s1", "Math");
    expect(res).toEqual({ ok: false, message: "Not signed in." });
  });
});

describe("useTeacherStore.approve — optimistic update + error mapping", () => {
  beforeEach(() => {
    useTeacherStore.setState({
      teacherProfile: profile,
      students: [
        { student_id: "s1", status: "PENDING" },
        { student_id: "s2", status: "PENDING" },
      ],
    });
  });

  it("optimistically flips the approved student to APPROVED and refetches overview", async () => {
    svc.assignStudent.mockResolvedValue({ student_id: "s1", status: "APPROVED", subject: "Math" });

    const res = await useTeacherStore.getState().approve("s1", "Math");

    expect(res).toEqual({ ok: true });
    const students = useTeacherStore.getState().students;
    expect(students.find((s) => s.student_id === "s1")?.status).toBe("APPROVED");
    expect(students.find((s) => s.student_id === "s2")?.status).toBe("PENDING");
    expect(svc.getOverview).toHaveBeenCalled();
    expect(useTeacherStore.getState().approvingId).toBeNull();
  });

  it("maps an ApiRequestError to {ok:false, message, code} and leaves state unchanged", async () => {
    svc.assignStudent.mockRejectedValue(apiError());

    const res = await useTeacherStore.getState().approve("s1", "Math");

    expect(res).toEqual({ ok: false, message: "Approval blocked.", code: "TCHR_1104" });
    // No optimistic mutation should have stuck
    expect(useTeacherStore.getState().students.find((s) => s.student_id === "s1")?.status).toBe("PENDING");
    expect(useTeacherStore.getState().approvingId).toBeNull();
  });

  it("returns a generic failure for a non-Api error", async () => {
    svc.assignStudent.mockRejectedValue(new Error("kaboom"));
    const res = await useTeacherStore.getState().approve("s1", "Math");
    expect(res).toEqual({ ok: false, message: "Something went wrong. Please try again." });
  });
});

describe("useTeacherStore.remove — optimistic filter", () => {
  it("drops the removed student and refetches overview", async () => {
    useTeacherStore.setState({
      teacherProfile: profile,
      students: [
        { student_id: "s1", status: "APPROVED" },
        { student_id: "s2", status: "APPROVED" },
      ],
    });
    svc.deleteStudent.mockResolvedValue(undefined);

    await useTeacherStore.getState().remove("s1");

    expect(useTeacherStore.getState().students.map((s) => s.student_id)).toEqual(["s2"]);
    expect(svc.getOverview).toHaveBeenCalled();
    expect(useTeacherStore.getState().isRemoving).toBeNull();
  });

  it("rethrows and clears the removing flag on failure", async () => {
    useTeacherStore.setState({
      teacherProfile: profile,
      students: [{ student_id: "s1", status: "APPROVED" }],
    });
    svc.deleteStudent.mockRejectedValue(new Error("nope"));

    await expect(useTeacherStore.getState().remove("s1")).rejects.toThrow("nope");
    // Optimistic filter must NOT have removed the student on failure
    expect(useTeacherStore.getState().students).toHaveLength(1);
    expect(useTeacherStore.getState().isRemoving).toBeNull();
  });
});

describe("useTeacherStore.invite — refetches roster + overview", () => {
  it("calls inviteStudent then refreshes students and overview", async () => {
    useTeacherStore.setState({ teacherProfile: profile });
    svc.inviteStudent.mockResolvedValue({
      teacher_id: "t1",
      student_id: "s9",
      status: "PENDING",
      subject: "Math",
      requested_at: "now",
    });
    svc.getStudents.mockResolvedValue({ students: [{ student_id: "s9", status: "PENDING" }] });

    await useTeacherStore.getState().invite("kid@x.com", "Math");

    expect(svc.inviteStudent).toHaveBeenCalledWith("t1", {
      student_email_or_username: "kid@x.com",
      subject: "Math",
    });
    expect(svc.getStudents).toHaveBeenCalled();
    expect(svc.getOverview).toHaveBeenCalled();
    expect(useTeacherStore.getState().isInviting).toBe(false);
  });
});

describe("useTeacherStore — report/analytics view transitions", () => {
  beforeEach(() => {
    useTeacherStore.setState({ teacherProfile: profile });
  });

  it("openReport switches to chats view, selects the student, and loads chats", async () => {
    svc.getChats.mockResolvedValue([{ session_id: "sess1" }]);
    await useTeacherStore.getState().openReport({ student_id: "s1", status: "APPROVED" });

    const s = useTeacherStore.getState();
    expect(s.view).toBe("chats");
    expect(s.selectedStudent?.student_id).toBe("s1");
    expect(s.chats).toEqual([{ session_id: "sess1" }]);
    expect(s.isFetchingChats).toBe(false);
  });

  it("openAnalytics switches to analytics view without fetching", () => {
    useTeacherStore.getState().openAnalytics({ student_id: "s1", status: "APPROVED" });
    expect(useTeacherStore.getState().view).toBe("analytics");
    expect(svc.getChats).not.toHaveBeenCalled();
  });

  it("closeReport resets back to the roster and clears the selection", () => {
    useTeacherStore.setState({ view: "chats", selectedStudent: { student_id: "s1", status: "APPROVED" }, chats: [{ session_id: "x" }] });
    useTeacherStore.getState().closeReport();
    const s = useTeacherStore.getState();
    expect(s.view).toBe("roster");
    expect(s.selectedStudent).toBeNull();
    expect(s.chats).toEqual([]);
  });

  it("openSession loads messages for the active session", async () => {
    useTeacherStore.setState({ selectedStudent: { student_id: "s1", status: "APPROVED" } });
    svc.getChatMessages.mockResolvedValue([{ message_id: "m1", content: "hi" }]);

    await useTeacherStore.getState().openSession("sess1");

    const s = useTeacherStore.getState();
    expect(s.activeSessionId).toBe("sess1");
    expect(s.chatMessages).toEqual([{ message_id: "m1", content: "hi" }]);
    expect(svc.getChatMessages).toHaveBeenCalledWith("t1", "s1", "sess1");
  });

  it("closeSession clears the active session + messages", () => {
    useTeacherStore.setState({ activeSessionId: "sess1", chatMessages: [{ message_id: "m1" }] });
    useTeacherStore.getState().closeSession();
    expect(useTeacherStore.getState().activeSessionId).toBeNull();
    expect(useTeacherStore.getState().chatMessages).toEqual([]);
  });
});

describe("useTeacherStore — fetch happy paths", () => {
  beforeEach(() => {
    useTeacherStore.setState({ teacherProfile: profile });
  });

  it("fetchOverview stores the overview and clears the loading flag", async () => {
    await useTeacherStore.getState().fetchOverview();
    expect(useTeacherStore.getState().overview).toEqual({ total_students: 1, pending: 0, approved: 1 });
    expect(useTeacherStore.getState().isFetchingOverview).toBe(false);
  });

  it("fetchStudents stores the roster", async () => {
    svc.getStudents.mockResolvedValue({ students: [{ student_id: "s1", status: "PENDING" }] });
    await useTeacherStore.getState().fetchStudents();
    expect(useTeacherStore.getState().students).toEqual([{ student_id: "s1", status: "PENDING" }]);
    expect(useTeacherStore.getState().isFetchingStudents).toBe(false);
  });

  it("fetchRequests stores the requests", async () => {
    svc.getRequests.mockResolvedValue([{ student_id: "s1" }]);
    await useTeacherStore.getState().fetchRequests();
    expect(useTeacherStore.getState().requests).toEqual([{ student_id: "s1" }]);
  });
});

describe("useTeacherStore — filter setters", () => {
  it("each setter writes its slice of filter state", () => {
    const st = useTeacherStore.getState();
    st.setStatusFilter("PENDING");
    st.setSubjectFilter("Mathematics");
    st.setSearch("ada");
    st.setSort("name");
    const s = useTeacherStore.getState();
    expect(s.statusFilter).toBe("PENDING");
    expect(s.subjectFilter).toBe("Mathematics");
    expect(s.search).toBe("ada");
    expect(s.sort).toBe("name");
  });
});

describe("useTeacherStore.logoutTeacher", () => {
  it("clears auth localStorage + profile and redirects home", () => {
    const loc = installLocationStub();
    localStorage.setItem("gened_auth_token", "x");
    useTeacherStore.setState({ teacherProfile: profile, students: [{ student_id: "s1", status: "APPROVED" }] });

    useTeacherStore.getState().logoutTeacher();

    expect(localStorage.getItem("gened_auth_token")).toBeNull();
    expect(useTeacherStore.getState().teacherProfile).toBeNull();
    expect(useTeacherStore.getState().students).toEqual([]);
    expect(loc.href).toBe("/");
  });
});
