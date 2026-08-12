import { ApiRequestError } from "./authFetch";

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
    const requestId = response.headers.get("x-request-id") || "";

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
