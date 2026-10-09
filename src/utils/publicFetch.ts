import { apiErrorFromResponse } from "./apiError";

/**
 * Like `authFetch`, but for anonymous/public endpoints: no Authorization or
 * x-user-* headers, and no 401/403 sign-out-and-redirect behavior. Still
 * throws `ApiRequestError` on non-OK responses so callers can branch on
 * `error_code`.
 */
export async function publicFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  return response;
}
