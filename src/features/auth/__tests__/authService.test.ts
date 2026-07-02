import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  signIn,
  signUp,
  googleSignIn,
  googleSignUp,
  sendOtp,
  requestPasswordReset,
  resetPassword,
  fetchProfile,
  type AuthTokenResponse,
} from "../authService";

const TOKEN: AuthTokenResponse = {
  access_token: "jwt",
  token_type: "Bearer",
  user_id: "u1",
  username: "ada",
  status: "active",
  role: "STUDENT",
};

function stubFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(TOKEN), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function stubFetchError(body: unknown, status = 400) {
  const init = { status };
  const response = typeof body === "string" ? new Response(body, init) : new Response(JSON.stringify(body), init);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

/** URL + parsed JSON body of the first fetch call. */
function firstCall(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init, body: init?.body ? JSON.parse(init.body) : undefined };
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authService — request shaping", () => {
  it("signIn posts {username, password} to /auth/sign-in", async () => {
    const fetchMock = stubFetchOk();
    await signIn({ username: "ada", password: "pw" });
    const { url, body, init } = firstCall(fetchMock);
    expect(url).toMatch(/\/auth\/sign-in$/);
    expect(init.method).toBe("POST");
    expect(body).toEqual({ username: "ada", password: "pw" });
  });

  it("signUp (student) renames email→email_id, coerces grade, uppercases role, includes parent_email/otp", async () => {
    const fetchMock = stubFetchOk();
    await signUp({
      role: "student",
      email: "kid@x.com",
      password: "pw",
      grade: "7",
      otp_code: "1234",
      parent_email: "mom@x.com",
      username: "kid",
    });
    const { url, body } = firstCall(fetchMock);
    expect(url).toMatch(/\/auth\/sign-up$/);
    expect(body).toEqual({
      password: "pw",
      role: "STUDENT",
      username: "kid",
      parent_email: "mom@x.com",
      email_id: "kid@x.com",
      otp_code: "1234",
      grade: 7, // Number, not "7"
    });
  });

  it("signUp (student) omits grade and email when not provided", async () => {
    const fetchMock = stubFetchOk();
    await signUp({ role: "student", email: "", password: "pw" });
    const { body } = firstCall(fetchMock);
    expect(body).not.toHaveProperty("grade");
    expect(body).not.toHaveProperty("email_id");
    expect(body).toEqual({ password: "pw", role: "STUDENT" });
  });

  it("signUp (parent) always sends email_id + otp_code and includes phone", async () => {
    const fetchMock = stubFetchOk();
    await signUp({ role: "parent", email: "mom@x.com", password: "pw", otp_code: "9999", phone: "555" });
    const { body } = firstCall(fetchMock);
    expect(body).toEqual({
      password: "pw",
      role: "PARENT",
      email_id: "mom@x.com",
      otp_code: "9999",
      phone: "555",
    });
  });

  it("googleSignIn posts {token} to /auth/google-sign-in", async () => {
    const fetchMock = stubFetchOk();
    await googleSignIn("gtoken");
    const { url, body } = firstCall(fetchMock);
    expect(url).toMatch(/\/auth\/google-sign-in$/);
    expect(body).toEqual({ token: "gtoken" });
  });

  it("googleSignUp (student) sends token, role, and Number(grade)", async () => {
    const fetchMock = stubFetchOk();
    await googleSignUp("gtoken", { role: "student", grade: "8" });
    const { url, body } = firstCall(fetchMock);
    expect(url).toMatch(/\/auth\/google-sign-up$/);
    expect(body).toEqual({ token: "gtoken", role: "STUDENT", grade: 8 });
  });

  it("sendOtp and requestPasswordReset post {email}", async () => {
    const otpMock = stubFetchOk();
    await sendOtp("a@x.com");
    expect(firstCall(otpMock).url).toMatch(/\/auth\/send-otp$/);
    expect(firstCall(otpMock).body).toEqual({ email: "a@x.com" });

    vi.unstubAllGlobals();
    const resetMock = stubFetchOk();
    await requestPasswordReset("a@x.com");
    expect(firstCall(resetMock).url).toMatch(/\/auth\/forgot-password$/);
    expect(firstCall(resetMock).body).toEqual({ email: "a@x.com" });
  });

  it("resetPassword posts {email, otp_code, new_password}", async () => {
    const fetchMock = stubFetchOk();
    await resetPassword({ email: "a@x.com", otp_code: "1234", new_password: "newpw" });
    const { url, body } = firstCall(fetchMock);
    expect(url).toMatch(/\/auth\/reset-password$/);
    expect(body).toEqual({ email: "a@x.com", otp_code: "1234", new_password: "newpw" });
  });

  it("fetchProfile attaches the Bearer token from localStorage", async () => {
    localStorage.setItem("gened_auth_token", "tok-xyz");
    const fetchMock = stubFetchOk();
    await fetchProfile("u1");
    const { url, init } = firstCall(fetchMock);
    expect(url).toMatch(/\/auth\/profile\/u1$/);
    expect(init.headers.Authorization).toBe("Bearer tok-xyz");
  });
});

describe("authService — handleAuthError precedence", () => {
  it("prefers a top-level message", async () => {
    stubFetchError({ message: "Bad creds", detail: "ignored" });
    await expect(signIn({ username: "a", password: "b" })).rejects.toThrow("Bad creds");
  });

  it("joins a FastAPI detail[] array by msg", async () => {
    stubFetchError({ detail: [{ msg: "field a" }, { msg: "field b" }] });
    await expect(signIn({ username: "a", password: "b" })).rejects.toThrow("field a, field b");
  });

  it("falls back to a detail string", async () => {
    stubFetchError({ detail: "single detail" });
    await expect(signIn({ username: "a", password: "b" })).rejects.toThrow("single detail");
  });

  it("throws (with the default message) when the error body is not JSON", async () => {
    stubFetchError("totally not json");
    await expect(signIn({ username: "a", password: "b" })).rejects.toThrow("Signin request failed.");
  });
});
