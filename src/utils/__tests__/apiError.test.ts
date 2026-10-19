import { describe, it, expect } from "vitest";
import { apiErrorFromResponse } from "../apiError";
import { ApiRequestError } from "../authFetch";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "x-request-id": "hdr-1" } });

describe("apiErrorFromResponse — the backend's three error shapes", () => {
  it("business error keeps code, message, retry_after", async () => {
    const err = await apiErrorFromResponse(json(429, {
      status: "error", error_code: "AUTH_1207", message: "Too many codes.",
      request_id: "9f1c", retryable: true, details: {}, retry_after: 120,
    }));
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 429, error_code: "AUTH_1207", message: "Too many codes.", request_id: "9f1c", retryable: true, retry_after: 120 });
  });

  it("422 validation: readable message without the 'Value error,' prefix, plus details.fields", async () => {
    const err = await apiErrorFromResponse(json(422, { detail: [
      { type: "value_error", loc: ["body", "password"], msg: "Value error, Password must be at least 8 characters." },
      { type: "extra_forbidden", loc: ["body", "STUDENT", "school_board"], msg: "Extra inputs are not permitted" },
    ] }));
    expect(err.error_code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Password must be at least 8 characters., Extra inputs are not permitted");
    expect(err.details.fields).toEqual({ password: "Password must be at least 8 characters.", school_board: "Extra inputs are not permitted" });
    expect(err.request_id).toBe("hdr-1");
  });

  it("403 permission: string detail becomes the message", async () => {
    const err = await apiErrorFromResponse(json(403, { detail: "Permission denied: Student ID mismatch." }));
    expect(err).toMatchObject({ error_code: "PERMISSION_DENIED", message: "Permission denied: Student ID mismatch." });
  });

  it("non-JSON body falls back to the caller's message, then a generic one", async () => {
    expect((await apiErrorFromResponse(new Response("oops", { status: 502 }), "Signup failed.")).message).toBe("Signup failed.");
    expect((await apiErrorFromResponse(new Response("oops", { status: 502 }))).message).toBe("Request failed with status 502");
  });
});
