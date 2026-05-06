export const AUTH_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL|| "";

if (!AUTH_API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_AUTH_API_URL is required. Set it in your .env.local file.",
  );
}

export interface SignUpFields {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: "student" | "parent" | "partner";
  age?: string;
  grade?: string;
  school_board?: string;
  phone?: string;
  organization?: string;
  website?: string;
  otp_code?: string;
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
}

export interface SignInFields {
  username: string;
  password: string;
}

async function handleAuthError(response: Response, defaultMsg: string): Promise<never> {
  let errorMessage = defaultMsg;
  try {
    const errorData = await response.json();
    if (Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail.map((err: any) => err.msg).join(", ");
    } else {
      errorMessage = errorData.detail || errorData.message || errorMessage;
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
    username: data.username,
    email_id: data.email,
    password: data.password,
    role: data.role.toUpperCase(),
    otp_code: data.otp_code,
  };

  if (data.role === "student") {
    if (data.age) body.age = Number(data.age);
    if (data.grade) body.grade = Number(data.grade);
    if (data.school_board) body.school_board = data.school_board;
  } else if (data.role === "parent") {
    if (data.phone) body.phone = data.phone;
  } else if (data.role === "partner") {
    if (data.organization) body.organization = data.organization;
    if (data.website) body.website = data.website;
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
    username: data.username,
    role: data.role?.toUpperCase(),
  };

  if (data.role === "student") {
    if (data.age) body.age = Number(data.age);
    if (data.grade) body.grade = Number(data.grade);
    if (data.school_board) body.school_board = data.school_board;
  } else if (data.role === "parent") {
    if (data.phone) body.phone = data.phone;
  } else if (data.role === "partner") {
    if (data.organization) body.organization = data.organization;
    if (data.website) body.website = data.website;
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

