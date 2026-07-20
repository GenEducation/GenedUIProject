import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { authFetch, ApiRequestError } from "../authFetch";
import { installLocationStub, type LocationStub } from "@/test/helpers/location";
import { seedAuthLocalStorage } from "@/test/helpers/auth";

// authFetch reaches for the global fetch; each test stubs it with a canned Response.
function stubFetch(response: Response | Promise<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The last Headers object authFetch handed to fetch. */
function sentHeaders(fetchMock: ReturnType<typeof vi.fn>): Headers {
  return fetchMock.mock.calls[0][1].headers as Headers;
}

/** Resolve to "resolved" if the promise settles, "pending" if it out-waits the timer. */
async function race(p: Promise<unknown>): Promise<"resolved" | "pending"> {
  return Promise.race([
    p.then(() => "resolved" as const).catch(() => "resolved" as const),
    new Promise<"pending">((r) => setTimeout(() => r("pending"), 30)),
  ]);
}

let location: LocationStub;

beforeEach(() => {
  localStorage.clear();
  location = installLocationStub();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authFetch — header injection", () => {
  it("adds Authorization, x-user-id, and uppercased x-user-role from localStorage", async () => {
    seedAuthLocalStorage("student", { token: "tok-123", profile: { user_id: "u_9" } });
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    await authFetch("https://api.test/thing");

    const h = sentHeaders(fetchMock);
    expect(h.get("authorization")).toBe("Bearer tok-123");
    expect(h.get("x-user-id")).toBe("u_9");
    expect(h.get("x-user-role")).toBe("STUDENT");
  });

  it("omits the Authorization header when no token is present", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    await authFetch("https://api.test/thing");

    expect(sentHeaders(fetchMock).has("authorization")).toBe(false);
  });

  it("tolerates a corrupt gened_user_profile (still sends, no x-user-id)", async () => {
    localStorage.setItem("gened_auth_token", "tok");
    localStorage.setItem("gened_user_profile", "{not json");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    await authFetch("https://api.test/thing");

    expect(sentHeaders(fetchMock).has("x-user-id")).toBe(false);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("authFetch — Content-Type handling", () => {
  it("sets application/json when a non-FormData body is present", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    await authFetch("https://api.test/thing", { method: "POST", body: JSON.stringify({ a: 1 }) });

    expect(sentHeaders(fetchMock).get("content-type")).toBe("application/json");
  });

  it("does not set Content-Type for FormData bodies", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    await authFetch("https://api.test/thing", { method: "POST", body: new FormData() });

    expect(sentHeaders(fetchMock).has("content-type")).toBe(false);
  });

  it("never overrides a caller-provided Content-Type", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));

    await authFetch("https://api.test/thing", {
      method: "POST",
      body: "x=1",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    expect(sentHeaders(fetchMock).get("content-type")).toBe("application/x-www-form-urlencoded");
  });
});

describe("authFetch — 401 handling", () => {
  it("clears the session, redirects, and never resolves", async () => {
    seedAuthLocalStorage("student");
    stubFetch(new Response("{}", { status: 401 }));

    const outcome = await race(authFetch("https://api.test/thing"));

    expect(outcome).toBe("pending");
    expect(localStorage.getItem("gened_auth_token")).toBeNull();
    expect(localStorage.getItem("gened_user_profile")).toBeNull();
    expect(localStorage.getItem("gened_user_role")).toBeNull();
    expect(location.href).toBe("/?error=session_expired");
  });
});

describe("authFetch — 403 handling", () => {
  it("by default clears the session (incl. partner id), redirects to /, and never resolves", async () => {
    seedAuthLocalStorage("partner");
    localStorage.setItem("gened_partner_id", "p_1");
    stubFetch(new Response("{}", { status: 403 }));

    const outcome = await race(authFetch("https://api.test/thing"));

    expect(outcome).toBe("pending");
    expect(localStorage.getItem("gened_auth_token")).toBeNull();
    expect(localStorage.getItem("gened_partner_id")).toBeNull();
    expect(location.href).toBe("/");
  });

  it("with allow403 throws an ApiRequestError built from the body", async () => {
    seedAuthLocalStorage("teacher");
    stubFetch(
      new Response(
        JSON.stringify({ error_code: "TCHR_1104", message: "Blocked", retryable: true, retry_after: 5 }),
        { status: 403 },
      ),
    );

    await expect(authFetch("https://api.test/thing", { allow403: true })).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 403,
      error_code: "TCHR_1104",
      retryable: true,
      retry_after: 5,
    });
    // session is untouched on a recoverable 403
    expect(localStorage.getItem("gened_auth_token")).not.toBeNull();
  });
});

describe("authFetch — other errors", () => {
  it("throws ApiRequestError with HTTP_<status> fallback for a non-JSON body", async () => {
    stubFetch(new Response("gateway blew up", { status: 500, headers: { "x-request-id": "req-77" } }));

    await expect(authFetch("https://api.test/thing")).rejects.toMatchObject({
      status: 500,
      error_code: "HTTP_500",
      request_id: "req-77",
    });
  });

  it("prefers structured error fields from a JSON body", async () => {
    stubFetch(
      new Response(JSON.stringify({ error_code: "VALIDATION", message: "bad", request_id: "r-1" }), {
        status: 422,
      }),
    );

    await expect(authFetch("https://api.test/thing")).rejects.toMatchObject({
      status: 422,
      error_code: "VALIDATION",
      message: "bad",
      request_id: "r-1",
    });
  });

  it("returns the Response unchanged on success", async () => {
    const ok = new Response(JSON.stringify({ ok: true }), { status: 200 });
    stubFetch(ok);

    const res = await authFetch("https://api.test/thing");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("ApiRequestError is an Error with the message from the body", async () => {
    stubFetch(new Response(JSON.stringify({ message: "nope" }), { status: 400 }));

    const err = await authFetch("https://api.test/thing").catch((e) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.message).toBe("nope");
  });
});
