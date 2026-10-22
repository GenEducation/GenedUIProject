import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { teacherService } from "../teacherService";
import { ApiRequestError } from "@/utils/authFetch";
import { seedAuthLocalStorage } from "@/test/helpers/auth";

// teacherService calls authFetch, which wraps the global fetch. We stub fetch and
// let the real authFetch run — that way the allow403 branch is genuinely exercised
// and the auth headers are injected from seeded localStorage.

/** Queue one Response for the next fetch call and capture the call args. */
function stubFetch(body: unknown, status = 200) {
  const init = { status, headers: { "Content-Type": "application/json" } };
  const response =
    typeof body === "string" ? new Response(body, init) : new Response(JSON.stringify(body), init);
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** URL + method of the first fetch call. */
function firstCall(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init, body: init?.body ? JSON.parse(init.body) : undefined };
}

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("teacher", { profile: { user_id: "t1" } });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("teacherService.getStudents — response normalization", () => {
  it("passes through the documented envelope shape", async () => {
    const fetchMock = stubFetch({
      students: [{ student_id: "s1", status: "APPROVED" }],
      total_count: 1,
      pending_count: 0,
      approved_count: 1,
    });
    const res = await teacherService.getStudents("t1");
    expect(res.students).toHaveLength(1);
    expect(res.approved_count).toBe(1);
    expect(firstCall(fetchMock).url).toMatch(/\/teacher\/students\?teacher_id=t1$/);
  });

  it("normalizes a bare array into the envelope with computed counts", async () => {
    stubFetch([
      { student_id: "s1", status: "PENDING" },
      { student_id: "s2", status: "APPROVED" },
      { student_id: "s3", status: "PENDING" },
    ]);
    const res = await teacherService.getStudents("t1");
    expect(res.total_count).toBe(3);
    expect(res.pending_count).toBe(2);
    expect(res.approved_count).toBe(1);
  });
});

describe("teacherService — graceful degradation to []", () => {
  it("getRequests returns [] when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(teacherService.getRequests("t1")).resolves.toEqual([]);
  });

  it("getRequests unwraps a nested {requests:[...]} shape", async () => {
    stubFetch({ requests: [{ student_id: "s1" }] });
    await expect(teacherService.getRequests("t1")).resolves.toHaveLength(1);
  });

  it("getChats unwraps chats/sessions and returns [] on error", async () => {
    stubFetch({ sessions: [{ session_id: "x1" }] });
    await expect(teacherService.getChats("t1", "s1")).resolves.toEqual([{ session_id: "x1" }]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    await expect(teacherService.getChats("t1", "s1")).resolves.toEqual([]);
  });

  it("getChatMessages unwraps {messages:[...]} and returns [] on error", async () => {
    stubFetch({ messages: [{ message_id: "m1" }] });
    await expect(teacherService.getChatMessages("t1", "s1", "sess1")).resolves.toHaveLength(1);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    await expect(teacherService.getChatMessages("t1", "s1", "sess1")).resolves.toEqual([]);
  });
});

describe("teacherService — request shaping", () => {
  it("inviteStudent POSTs the payload with teacher_id in the query", async () => {
    const fetchMock = stubFetch({ student_id: "s1", status: "PENDING" });
    await teacherService.inviteStudent("t1", { student_email_or_username: "kid@x.com", subject: "Math" });
    const { url, init, body } = firstCall(fetchMock);
    expect(url).toMatch(/\/teacher\/students\/invite\?teacher_id=t1$/);
    expect(init.method).toBe("POST");
    expect(body).toEqual({ student_email_or_username: "kid@x.com", subject: "Math" });
  });

  it("deleteStudent DELETEs the encoded student + teacher ids", async () => {
    const fetchMock = stubFetch("", 200);
    await teacherService.deleteStudent("t 1", "s/1");
    const { url, init } = firstCall(fetchMock);
    expect(init.method).toBe("DELETE");
    expect(url).toContain("/teacher/students/s%2F1");
    expect(url).toContain("teacher_id=t%201");
  });
});

describe("teacherService.assignStudent — allow403 recoverable path", () => {
  it("returns the updated student on success", async () => {
    stubFetch({ student_id: "s1", status: "APPROVED", subject: "Math" });
    const res = await teacherService.assignStudent("t1", "s1", { status: "APPROVED", subject: "Math" });
    expect(res.status).toBe("APPROVED");
  });

  it("throws ApiRequestError (not a sign-out) on a 403 approval block", async () => {
    stubFetch(
      { error_code: "TCHR_1104", message: "Approval blocked: student not admitted.", request_id: "r1" },
      403,
    );
    const err = await teacherService
      .assignStudent("t1", "s1", { status: "APPROVED", subject: "Math" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.error_code).toBe("TCHR_1104");
    expect(err.message).toMatch(/not admitted/i);
  });
});
