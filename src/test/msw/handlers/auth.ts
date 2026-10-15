import { http, HttpResponse } from "msw";
import { makeAuthToken } from "../../fixtures/authToken";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

/** Happy-path auth handlers; tests override per-case with server.use(...). */
export const authHandlers = [
  http.post(`${BASE}/auth/sign-in`, () => HttpResponse.json(makeAuthToken())),
  // The code a student asks to be sent to their parent's address at sign-up (guardian linking).
  http.post(`${BASE}/auth/send-otp/guardian`, () =>
    HttpResponse.json({ status: "success", message: "Code sent to your parent." }),
  ),
];
