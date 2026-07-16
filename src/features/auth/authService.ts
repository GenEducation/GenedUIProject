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
  age?: string;
  grade?: string;
  school_board?: string;
  phone?: string;
  otp_code?: string;
  parent_email?: string;
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
  organization?: string;
  website?: string | null;
  school_board?: string;
  age?: number;
  name?: string;
  ai_name?: string;
  preferred_voice?: string;
  plan?: "FREE" | "PRO";
  plan_expires_at?: string | null;
}

export interface SignInFields {
  username: string;
  password: string;
}

async function handleAuthError(response: Response, defaultMsg: string): Promise<never> {
  let errorMessage = defaultMsg;
  try {
    const errorData = await response.json();
    // Prefer the top-level `message` from the structured error shape
    if (typeof errorData.message === "string") {
      errorMessage = errorData.message;
    } else if (Array.isArray(errorData.detail)) {
      // Legacy: FastAPI validation error shape — remove once all endpoints migrated
      errorMessage = errorData.detail.map((err: any) => err.msg).join(", ");
    } else if (typeof errorData.detail === "string") {
      // Legacy: old ad-hoc shape — remove once all endpoints migrated
      errorMessage = errorData.detail;
    }
  } catch (e) {
    const errorText = await response.text().catch(() => "");
    errorMessage = errorText || errorMessage;
  }
  throw new Error(errorMessage);
}

export async function signIn(data: SignInFields): Promise<AuthTokenResponse> {
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/sign-in`, {
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
  const body: any = {
    password: data.password,
    role: data.role.toUpperCase(),
  };

  if (data.username) body.username = data.username;

  if (data.role === "student") {
    if (data.parent_email) body.parent_email = data.parent_email;
    if (data.email) body.email_id = data.email;
    if (data.otp_code) body.otp_code = data.otp_code;
    if (data.grade) body.grade = Number(data.grade);
  } else {
    body.email_id = data.email;
    body.otp_code = data.otp_code;
    if (data.role === "parent") {
      if (data.phone) body.phone = data.phone;
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
  const body: any = {
    token,
    role: data.role?.toUpperCase(),
  };

  if (data.username) body.username = data.username;

  if (data.role === "student") {
    if (data.grade) body.grade = Number(data.grade);
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
  school_board?: string;
  ai_name?: string;
  preferred_voice?: string;
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
