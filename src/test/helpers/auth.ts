/**
 * Seed the localStorage keys that AuthGuard and authFetch read, so tests can render
 * authenticated views without going through the real login flow.
 */
export type UserRole = "student" | "teacher" | "parent" | "admin" | "partner";

export interface SeedAuthOptions {
  token?: string;
  profile?: Record<string, unknown>;
}

export function seedAuthLocalStorage(role: UserRole = "student", options: SeedAuthOptions = {}) {
  const token = options.token ?? "test-token";
  const profile = {
    user_id: "u_test",
    email_id: "test@example.com",
    role,
    ...options.profile,
  };
  localStorage.setItem("gened_auth_token", token);
  localStorage.setItem("gened_user_profile", JSON.stringify(profile));
  localStorage.setItem("gened_user_role", role);
  return { token, role, profile };
}

export function clearAuthLocalStorage() {
  localStorage.removeItem("gened_auth_token");
  localStorage.removeItem("gened_user_profile");
  localStorage.removeItem("gened_user_role");
  localStorage.removeItem("gened_partner_id");
}
