import type { Page } from "@playwright/test";
import type { AuthTokenResponse } from "../../src/features/auth/authService";
import { makeAuthToken } from "../fixtures";

export type Role = "student" | "teacher" | "parent" | "admin";

type AuthSeed = { role: string; token: AuthTokenResponse };

/**
 * Seeds the three gened_* localStorage keys via page.addInitScript so the app
 * boots as "logged in" before its first paint — no real login flow needed.
 * Must be called before page.goto().
 */
export async function seedAuth(
  page: Page,
  role: Role,
  overrides: Partial<AuthTokenResponse> = {},
) {
  const token = makeAuthToken({ role, ...overrides });
  await page.addInitScript(
    ({ role, token }: AuthSeed) => {
      localStorage.setItem("gened_auth_token", token.access_token);
      localStorage.setItem("gened_user_profile", JSON.stringify(token));
      localStorage.setItem("gened_user_role", role);
    },
    { role, token } as AuthSeed,
  );
}
