import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { parentService } from "../parentService";
import { ApiRequestError } from "@/utils/authFetch";
import { seedAuthLocalStorage } from "@/test/helpers/auth";

// parentService uses authFetch (wraps global fetch). We stub fetch and let the real
// authFetch run, so the auth headers are injected from seeded localStorage.

function stubFetch(body: unknown, status = 200) {
  const init = { status, headers: { "Content-Type": "application/json" } };
  const response =
    typeof body === "string" ? new Response(body, init) : new Response(JSON.stringify(body), init);
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function firstCall(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init, body: init?.body ? JSON.parse(init.body) : undefined };
}

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("parent", { profile: { user_id: "p1" } });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parentService — request shaping", () => {
  it("linkStudent POSTs {parent_id, student_id} to /parent/link", async () => {
    const fetchMock = stubFetch({ student_id: "s1", parent_id: "p1", status: "PENDING", requested_at: "now" });
    await parentService.linkStudent("p1", "s1");
    const { url, init, body } = firstCall(fetchMock);
    expect(url).toMatch(/\/parent\/link$/);
    expect(init.method).toBe("POST");
    expect(body).toEqual({ parent_id: "p1", student_id: "s1" });
  });

  it("updateStudentStatus PATCHes {status} to the student status endpoint", async () => {
    const fetchMock = stubFetch({ student_id: "s1", parent_id: "p1", status: "APPROVED", requested_at: "now" });
    await parentService.updateStudentStatus("p1", "s1", "APPROVED");
    const { url, init, body } = firstCall(fetchMock);
    expect(url).toMatch(/\/parent\/link\/s1\/status\?parent_id=p1$/);
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ status: "APPROVED" });
  });
});

describe("parentService — non-ok responses reject", () => {
  // NOTE: authFetch throws ApiRequestError for any non-ok response *before*
  // parentService's own `if (!response.ok) throw new Error(...)` can run, so those
  // bespoke "Failed to ..." messages are effectively unreachable. These tests pin
  // the ACTUAL surfaced error (ApiRequestError with .status) rather than the dead code.
  it("fetchLinkedStudents rejects with ApiRequestError on 500", async () => {
    stubFetch({ error: "boom" }, 500);
    const err = await parentService.fetchLinkedStudents("p1").catch((e) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.status).toBe(500);
  });
});
