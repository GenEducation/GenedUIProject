export const AUTH_API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "";

if (!AUTH_API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_AUTH_API_URL is required. Set it in your .env.local file.",
  );
}

export interface SignUpFields {
  username: string;
  email: string;
  password: string;
  role: "student" | "parent" | "partner";
  age?: string;
  grade?: string;
  school_board?: string;
  partner_id?: string;
  phone?: string;
  organization?: string;
  website?: string;
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
}

export interface SignInFields {
  username: string;
  password: string;
}

export async function signIn(data: SignInFields): Promise<AuthTokenResponse> {
  const response = await fetch(`${AUTH_API_BASE_URL}/sign-in`, {
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
    const errorText = await response.text();
    throw new Error(errorText || "Signin request failed.");
  }

  return response.json();
}

export async function signUp(data: SignUpFields): Promise<AuthTokenResponse> {
  const body: any = {
    username: data.username,
    email_id: data.email,
    password: data.password,
    role: data.role.toUpperCase(),
  };

  if (data.role === "student") {
    if (data.age) body.age = Number(data.age);
    if (data.grade) body.grade = Number(data.grade);
    if (data.school_board) body.school_board = data.school_board;
    if (data.partner_id) body.partner_id = data.partner_id;
  } else if (data.role === "parent") {
    if (data.phone) body.phone = data.phone;
  } else if (data.role === "partner") {
    if (data.organization) body.organization = data.organization;
    if (data.website) body.website = data.website;
  }

  const response = await fetch(`${AUTH_API_BASE_URL}/sign-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Signup request failed.");
  }

  return response.json();
}
