/**
 * Mobile auth service — ported from src/features/auth/authService.ts
 *
 * Same endpoints, same request shapes. Differences:
 *  - NEXT_PUBLIC_API_URL → EXPO_PUBLIC_API_URL
 *  - No `process.env` throw at module load (env may not be defined in dev)
 *  - `updateProfile` included so the Me screen can save voice preference
 */

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

export interface AuthTokenResponse {
  access_token:   string;
  token_type:     string;
  user_id:        string;
  username:       string;
  email?:         string;
  status:         string;
  role:           string;
  grade?:         number;
  name?:          string;
  ai_name?:       string;
  preferred_voice?: string;
  school_board?:  string;
  plan?:          "FREE" | "PRO";
  plan_expires_at?: string | null;
}

async function handleError(res: Response, fallback: string): Promise<never> {
  let msg = fallback;
  try {
    const body = await res.json();
    if (typeof body.message === "string") msg = body.message;
    else if (Array.isArray(body.detail)) msg = body.detail.map((e: any) => e.msg).join(", ");
    else if (typeof body.detail === "string") msg = body.detail;
  } catch {
    msg = (await res.text().catch(() => "")) || fallback;
  }
  throw new Error(msg);
}

/** POST /auth/sign-in  (username + password) */
export async function signIn(username: string, password: string): Promise<AuthTokenResponse> {
  const res = await fetch(`${BASE}/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) await handleError(res, "Sign-in failed.");
  return res.json();
}

/** POST /auth/sign-up  (student path only for now) */
export async function signUp(params: {
  username:     string;
  password:     string;
  grade:        number;
  parent_email: string;
  role:         "STUDENT" | "PARENT" | "PARTNER";
}): Promise<AuthTokenResponse> {
  const res = await fetch(`${BASE}/auth/sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) await handleError(res, "Sign-up failed.");
  return res.json();
}

/** POST /auth/google-sign-in  (ID token from Google native OAuth) */
export async function googleSignIn(idToken: string): Promise<AuthTokenResponse> {
  const res = await fetch(`${BASE}/auth/google-sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: idToken }),
  });
  if (!res.ok) await handleError(res, "Google sign-in failed.");
  return res.json();
}

/** POST /auth/send-otp */
export async function sendOtp(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) await handleError(res, "Failed to send OTP.");
  return res.json();
}
