import type { EducationBoard } from "@/types/education";
import { apiErrorFromResponse } from "@/utils/apiError";

export const AUTH_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL|| "";

if (!AUTH_API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_AUTH_API_URL is required. Set it in your .env.local file.",
  );
}

export interface SignUpFields {
  username?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  // Partner accounts are admin-provisioned only; not a public signup role.
  role: "student" | "parent";
  /** Parent only: their name, which their connected child sees (`identity.parent_profiles`). */
  full_name?: string;
  age?: string;
  grade?: string;
  phone?: string;
  otp_code?: string;
  parent_email?: string;
  /**
   * The code `POST /auth/send-otp/guardian` emailed to `parent_email`, which the parent reads out to the student.
   * It verifies the parent's address, so the parent's account connects to this one automatically once they register
   * with that same address and confirm.
   */
  parent_otp_code?: string;
  /** A school to request on sign-up; the membership starts PENDING until that school approves. Omit to join GenEd. */
  partner_id?: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  email?: string;
  status: string;
  role: string;
  grade?: number;
  school_board?: EducationBoard;
  board?: EducationBoard;
  organization?: string;
  website?: string | null;
  // Parent-only.
  phone?: string;
  age?: number;
  name?: string;
  ai_name?: string;
  preferred_voice?: string;
  /** The tutor voice the student picked (an id from `GET /voices`), or null for the default. Returned by the profile
   *  routes (`GET`/`PATCH /auth/profile`), not by sign-in. */
  tutor_voice?: string | null;
  plan?: "FREE" | "PRO";
  plan_expires_at?: string | null;
  // Teacher-only fields, present when `role` is TEACHER.
  full_name?: string;
  title?: string;
  subjects?: string[];
  partner_id?: string;
}

export interface SignInFields {
  username: string;
  password: string;
}

/** Throws an `ApiRequestError` (an `Error`) so callers keep `message` and also get `error_code` / `retry_after`. */
async function handleAuthError(response: Response, defaultMsg: string): Promise<never> {
  throw await apiErrorFromResponse(response, defaultMsg);
}

/**
 * Sign in, optionally against a different backend.
 *
 * `baseUrl` exists for the admin console, which is being moved to the new
 * backend one screen group at a time and had its login left behind on the MVP
 * — the one thing standing between the console and not needing the MVP at all.
 * Both stacks issue the same token (HS256, the same claims, the same secret),
 * so a token from either verifies against both; this only decides which one
 * issues it. See `adminApiRouting.adminAuthBase`.
 */
export async function signIn(
  data: SignInFields,
  { baseUrl = AUTH_API_BASE_URL }: { baseUrl?: string } = {},
): Promise<AuthTokenResponse> {
  const response = await fetch(`${baseUrl}/auth/sign-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: data.username,
      password: data.password,
    }),
  });

  if (!response.ok) {
    await handleAuthError(response, "Signin request failed.");
  }

  return response.json();
}

export async function signUp(data: SignUpFields): Promise<AuthTokenResponse> {
  const body: Record<string, unknown> = {
    password: data.password,
    role: data.role.toUpperCase(),
  };

  if (data.username) body.username = data.username;

  if (data.role === "student") {
    if (data.parent_email) body.parent_email = data.parent_email.trim();
    if (data.parent_email && data.parent_otp_code) body.parent_otp_code = data.parent_otp_code.trim();
    if (data.email) body.email_id = data.email;
    if (data.otp_code) body.otp_code = data.otp_code;
    if (data.grade) body.grade = Number(data.grade);
    if (data.age) body.age = Number(data.age);
    if (data.partner_id) body.partner_id = data.partner_id;
  } else {
    body.email_id = data.email;
    body.otp_code = data.otp_code;
    if (data.role === "parent") {
      if (data.phone) body.phone = data.phone;
      if (data.full_name?.trim()) body.full_name = data.full_name.trim();
    }
  }

  const response = await fetch(`${AUTH_API_BASE_URL}/auth/sign-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleAuthError(response, "Signup request failed.");
  }

  return response.json();
}

export async function googleSignIn(token: string): Promise<AuthTokenResponse> {
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/google-sign-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    await handleAuthError(response, "Google Sign-in request failed.");
  }

  return response.json();
}

export async function googleSignUp(token: string, data: Partial<SignUpFields>): Promise<AuthTokenResponse> {
  const body: Record<string, unknown> = {
    token,
    role: data.role?.toUpperCase(),
  };

  // The backend refuses unknown fields (422), so only send what each role accepts.
  if (data.role === "student") {
    if (data.grade) body.grade = Number(data.grade);
    if (data.age) body.age = Number(data.age);
    if (data.partner_id) body.partner_id = data.partner_id;
  } else if (data.role === "parent") {
    if (data.phone) body.phone = data.phone;
  }

  const response = await fetch(`${AUTH_API_BASE_URL}/auth/google-sign-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleAuthError(response, "Google Sign-up request failed.");
  }

  return response.json();
}

export async function sendOtp(email: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    await handleAuthError(response, "Failed to send OTP");
  }

  return response.json();
}

/**
 * Emails a verification code to the parent or guardian address a student is signing up with. The backend answers
 * the same whether or not anyone has an account at that address; the code verifies nothing but this address.
 */
export async function sendGuardianOtp(email: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/send-otp/guardian`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!response.ok) {
    await handleAuthError(response, "Failed to send the code to your parent");
  }

  return response.json();
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    await handleAuthError(response, "Failed to initiate password reset");
  }

  return response.json();
}

export async function resetPassword(data: {
  email: string;
  otp_code: string;
  new_password: string;
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.email,
      otp_code: data.otp_code,
      new_password: data.new_password,
    }),
  });
  if (!response.ok) {
    await handleAuthError(response, "Failed to reset password");
  }

  return response.json();
}

/**
 * Pull a fresh profile from the auth-service. Used by the profile page to
 * heal stale localStorage entries written before newer fields (like
 * `preferred_voice`) existed.
 */
export async function fetchProfile(userId: string): Promise<AuthTokenResponse> {
  const token = localStorage.getItem("gened_auth_token");
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/profile/${userId}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    await handleAuthError(response, "Failed to load profile.");
  }
  return response.json();
}

export async function updateProfile(data: {
  user_id: string;
  name?: string;
  age?: number;
  ai_name?: string;
  preferred_voice?: string;
  tutor_voice?: string;
}): Promise<AuthTokenResponse> {
  const token = localStorage.getItem("gened_auth_token");
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    await handleAuthError(response, "Profile update failed.");
  }
  return response.json();
}

export async function confirmDevicePairing(data: {
  user_code: string;
  student_id: string;
}): Promise<{ status: string; pushed: boolean; student_id: string }> {
  const token = localStorage.getItem("gened_auth_token");
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/device/pairing/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      user_code: data.user_code.trim().toUpperCase(),
      student_id: data.student_id,
    }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: "Pairing request failed." };
    }
    // Throwing error data so caller can branch on error_code
    throw errorData;
  }
  
  return response.json();
}
