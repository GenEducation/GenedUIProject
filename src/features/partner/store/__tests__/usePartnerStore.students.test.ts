import { describe, it, expect, beforeEach } from "vitest";
import { lastStatusChange, partnerStudentsFixture, SYNTHETIC_PARTNER } from "@/test/msw/handlers/partnerStudents";
import { partnerStudentsService } from "../../services/partnerStudentsService";
import { usePartnerStore } from "../usePartnerStore";

const id = (n: number) => partnerStudentsFixture.member(n, "APPROVED").id;

beforeEach(() => {
  partnerStudentsFixture.reset();
  usePartnerStore.setState({ students: [], pendingRequests: [], numberOfPendingRequests: 0, totalEnrollments: 0 });
  localStorage.setItem("gened_auth_token", "token-synthetic");
  localStorage.setItem("gened_partner_id", JSON.stringify(SYNTHETIC_PARTNER));
});

describe("usePartnerStore — a school's students", () => {
  it("lists approved students and the approval queue; rejected and revoked students are in neither", async () => {
    await usePartnerStore.getState().fetchStudents();
    const state = usePartnerStore.getState();
    expect(state.students.map((s) => s.name)).toEqual(["synthetic_student_1"]);
    expect(state.pendingRequests).toEqual([
      { id: id(2), name: "SYNTHETIC Student 2", grade: "6", initials: "SS", status: "PENDING" },
    ]);
    expect(state.numberOfPendingRequests).toBe(1);
    expect(state.totalEnrollments).toBe(1);
  });

  it("approves a request with PATCH status=APPROVED and moves it to the students", async () => {
    await usePartnerStore.getState().fetchStudents();
    await usePartnerStore.getState().approveRequest(id(2));
    expect(lastStatusChange).toEqual({ studentId: id(2), status: "APPROVED" });
    const state = usePartnerStore.getState();
    expect(state.pendingRequests).toEqual([]);
    expect(state.students.map((s) => s.id)).toEqual([id(2), id(1)]);
    expect(state.totalEnrollments).toBe(2);
  });

  it("rejects a request with PATCH status=REJECTED, and it stays out after a refetch", async () => {
    await usePartnerStore.getState().fetchStudents();
    await usePartnerStore.getState().rejectRequest(id(2));
    expect(lastStatusChange).toEqual({ studentId: id(2), status: "REJECTED" });
    await usePartnerStore.getState().fetchStudents();
    expect(usePartnerStore.getState().pendingRequests).toEqual([]);
  });

  it("removes a student with DELETE", async () => {
    await usePartnerStore.getState().fetchStudents();
    await usePartnerStore.getState().removeStudent(id(1));
    expect(partnerStudentsFixture.get(id(1))).toBeUndefined();
    expect(usePartnerStore.getState().students).toEqual([]);
    expect(usePartnerStore.getState().totalEnrollments).toBe(0);
  });

  it("revokes a student with PATCH status=REVOKED: gone from the list, record kept, out after a refetch", async () => {
    await usePartnerStore.getState().fetchStudents();
    await usePartnerStore.getState().revokeStudent(id(1));
    expect(lastStatusChange).toEqual({ studentId: id(1), status: "REVOKED" });
    expect(partnerStudentsFixture.get(id(1))).toBeDefined();
    expect(usePartnerStore.getState().students).toEqual([]);
    expect(usePartnerStore.getState().totalEnrollments).toBe(0);
    await usePartnerStore.getState().fetchStudents();
    expect(usePartnerStore.getState().students).toEqual([]);
  });

  it("surfaces the backend's reason when an action is refused", async () => {
    await expect(usePartnerStore.getState().approveRequest("33333333-0000-4000-8000-000000000999")).rejects.toThrow(
      /association not found/,
    );
  });

  it("does nothing without a signed-in partner", async () => {
    localStorage.removeItem("gened_partner_id");
    await usePartnerStore.getState().fetchStudents();
    expect(usePartnerStore.getState().students).toEqual([]);
    await expect(usePartnerStore.getState().removeStudent(id(1))).rejects.toThrow("No partner ID found");
  });
});

describe("partnerStudentsService", () => {
  it("reads a student's profile, and null for a student who isn't the school's", async () => {
    expect(await partnerStudentsService.profile(SYNTHETIC_PARTNER, id(1))).toMatchObject({ username: "synthetic_student_1", status: "APPROVED" });
    expect(await partnerStudentsService.profile(SYNTHETIC_PARTNER, "33333333-0000-4000-8000-000000000999")).toBeNull();
  });

  it("splits the counts row off the students list", async () => {
    const { rows, counts } = await partnerStudentsService.students(SYNTHETIC_PARTNER);
    expect(rows).toHaveLength(4);
    expect(counts).toEqual({ total_count: 4, pending_count: 1, approved_count: 1 });
  });

  it("can revoke a membership", async () => {
    await partnerStudentsService.setStatus(SYNTHETIC_PARTNER, id(1), "REVOKED");
    expect(partnerStudentsFixture.get(id(1))?.status).toBe("REVOKED");
  });
});
