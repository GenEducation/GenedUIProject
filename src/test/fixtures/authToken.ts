import type { AuthTokenResponse } from "@/features/auth/authService";

/** A realistic sign-in response; override role/fields per test. */
export function makeAuthToken(over: Partial<AuthTokenResponse> = {}): AuthTokenResponse {
  return {
    access_token: "test-jwt",
    token_type: "Bearer",
    user_id: "u_student",
    username: "ada",
    status: "active",
    role: "student",
    grade: 6,
    name: "Ada Lovelace",
    ...over,
  };
}
