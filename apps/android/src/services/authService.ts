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

/** POST /auth/sign-up */
export async function signUp(params: {
  password:      string;
  role:          "STUDENT" | "PARENT" | "PARTNER";
  username?:     string;
  parent_email?: string;
  email_id?:     string;
  otp_code?:     string;
  grade?:        number;
  phone?:        string;
}): Promise<AuthTokenResponse> {
  const body: Record<string, unknown> = {
    password: params.password,
    role:     params.role,
  };
  if (params.username)     body.username     = params.username;
  if (params.parent_email) body.parent_email = params.parent_email;
  if (params.email_id)     body.email_id     = params.email_id;
  if (params.otp_code)     body.otp_code     = params.otp_code;
  if (params.grade != null) body.grade       = Number(params.grade);
  if (params.phone)        body.phone        = params.phone;

  const res = await fetch(`${BASE}/auth/sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

/** POST /auth/google-sign-up  (ID token + role for a new Google account) */
export async function googleSignUp(
  idToken: string,
  data: {
    role:    "STUDENT" | "PARENT" | "PARTNER";
    username?: string;
    grade?:    number;
    phone?:    string;
  },
): Promise<AuthTokenResponse> {
  const body: Record<string, unknown> = {
    token: idToken,
    role:  data.role,
  };
  if (data.username)      body.username = data.username;
  if (data.grade != null) body.grade    = Number(data.grade);
  if (data.phone)         body.phone    = data.phone;

  const res = await fetch(`${BASE}/auth/google-sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleError(res, "Google sign-up failed.");
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
