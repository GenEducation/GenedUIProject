/**
 * Mobile equivalent of src/utils/authFetch.ts from the web app.
 *
 * Changes vs. the web version:
 *  - localStorage → expo-secure-store (async)
 *  - window.location.href → passed-in onSessionExpired callback
 *  - No SSR guard needed
 */
import { getToken, getProfile, clearSession } from "./storage";

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

  constructor(e: ApiError) {
    super(e.message);
    this.name        = "ApiRequestError";
    this.status      = e.status;
    this.error_code  = e.error_code;
    this.request_id  = e.request_id;
    this.retryable   = e.retryable;
    this.retry_after = e.retry_after;
    this.details     = e.details;
  }
}

let _onSessionExpired: (() => void) | null = null;

/** Call once in root layout with a function that navigates to /sign-in. */
export function registerSessionExpiredHandler(fn: () => void) {
  _onSessionExpired = fn;
}

export async function authFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const token   = await getToken();
  const profile = await getProfile();

  const headers = new Headers(init?.headers);

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (profile?.user_id) headers.set("x-user-id", profile.user_id);

  if (
    !headers.has("Content-Type") &&
    init?.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, { ...init, headers });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") || "";

    if (response.status === 401 || response.status === 403) {
      await clearSession();
      _onSessionExpired?.();
      // Hang — navigation will unmount this call site
      return new Promise<Response>(() => {});
    }

    let body: any = {};
    try { body = await response.json(); } catch { /* non-JSON */ }

    throw new ApiRequestError({
      status:      response.status,
      error_code:  body.error_code  || `HTTP_${response.status}`,
      message:     body.message     || `Request failed with status ${response.status}`,
      request_id:  body.request_id  || requestId,
      retryable:   body.retryable   ?? false,
      retry_after: body.retry_after,
      details:     body.details     || {},
    });
  }

  return response;
}
