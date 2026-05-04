/**
 * authFetch.ts
 *
 * A lightweight wrapper around the native `fetch` API that automatically
 * injects the JWT Bearer token from localStorage into every request.
 *
 * Usage:
 *   import { authFetch } from "@/utils/authFetch";
 *   const res = await authFetch("/api/students/123");
 */

/**
 * Reads the JWT token stored by the login flow and returns it.
 * Returns an empty string if not found (unauthenticated state).
 */
export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("gened_auth_token") ?? "";
}

/**
 * A drop-in replacement for `fetch` that automatically attaches
 * the Authorization: Bearer <token> header to every outgoing request.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
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

  // Automatically set Content-Type to application/json only if it's not already set 
  // and the body is NOT FormData (which needs the browser to set its own boundary).
  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // Global Error Handling
  if (response.status === 403) {
    // Graceful redirect for Forbidden errors
    if (typeof window !== "undefined") {
      window.location.href = "/?error=unauthorized";
    }
  }

  return response;
}
