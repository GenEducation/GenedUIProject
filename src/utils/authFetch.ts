export interface ApiError {
  status: number;
  error_code: string;
  message: string;
  request_id: string;
  retryable: boolean;
  retry_after?: number;
  details: Record<string, any>;
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly error_code: string;
  public readonly request_id: string;
  public readonly retryable: boolean;
  public readonly retry_after?: number;
  public readonly details: Record<string, any>;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiRequestError";
    this.status = apiError.status;
    this.error_code = apiError.error_code;
    this.request_id = apiError.request_id;
    this.retryable = apiError.retryable;
    this.retry_after = apiError.retry_after;
    this.details = apiError.details;
  }
}

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("gened_auth_token") ?? "";
}

export type AuthFetchOptions = RequestInit;

export async function authFetch(
  input: RequestInfo | URL,
  init?: AuthFetchOptions,
): Promise<Response> {
  const token = getAuthToken();

  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const profileStr = localStorage.getItem("gened_user_profile");
  if (profileStr) {
    try {
      const profile = JSON.parse(profileStr);
      if (profile.user_id) {
        headers.set("x-user-id", profile.user_id);
      }
    } catch (e) {
      console.error("Error parsing user profile for x-user-id header", e);
    }
  }

  const role = typeof window !== "undefined" ? localStorage.getItem("gened_user_role") : null;
  if (role) {
    headers.set("x-user-role", role.toUpperCase());
  }

  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") || "";

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("gened_auth_token");
        localStorage.removeItem("gened_user_profile");
        localStorage.removeItem("gened_user_role");
        window.location.href = "/?error=session_expired";
        // Hang the promise so no catch block runs while the page unloads
        return new Promise<Response>(() => {});
      }
      // SSR-only path
      throw new ApiRequestError({
        status: 401,
        error_code: "AUTH_1202",
        message: "Your session has expired. Please sign in again.",
        request_id: requestId,
        retryable: false,
        details: {},
      });
    }

    // 403 is a per-resource authorization outcome ("valid session, but you
    // can't access THIS"), not a session failure. It falls through to the
    // generic handler below and is thrown as ApiRequestError for the caller to
    // handle — never a global redirect (that bounces an authenticated user
    // back into the failing page and loops). Only 401 (above) is treated as
    // session expiry.
    let body: any = {};
    try {
      body = await response.json();
    } catch {
      // Non-JSON response — fall back to generic error
    }

    throw new ApiRequestError({
      status: response.status,
      error_code: body.error_code || `HTTP_${response.status}`,
      message: body.message || `Request failed with status ${response.status}`,
      request_id: body.request_id || requestId,
      retryable: body.retryable ?? false,
      retry_after: body.retry_after,
      details: body.details || {},
    });
  }

  return response;
}
