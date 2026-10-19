import { ApiRequestError } from "./authFetch";

/** One entry of a FastAPI 422 body: `{"detail": [{loc, msg, type}]}`. */
interface ValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}

/**
 * Error bodies come in three shapes (see the backend's API reference):
 * - business: `{error_code, message, request_id, retryable, details, retry_after?}`
 * - form validation (422): `{detail: [{loc, msg, type}]}`
 * - permission (403): `{detail: "Permission denied: ..."}`
 */
interface AnyErrorBody {
  error_code?: string;
  message?: string;
  request_id?: string;
  retryable?: boolean;
  retry_after?: number;
  details?: Record<string, unknown>;
  detail?: string | ValidationIssue[];
}

/** Pydantic prefixes custom validator messages with "Value error, "; users shouldn't see it. */
const cleanIssue = (msg: string) => msg.replace(/^Value error,\s*/, "");

/**
 * Turn a non-OK response into an `ApiRequestError`, whichever of the three
 * shapes the body uses. A 422 also carries `details.fields`, a map of the
 * offending field name to its message, so forms can mark the right input.
 */
export async function apiErrorFromResponse(response: Response, fallbackMessage?: string): Promise<ApiRequestError> {
  const requestId = response.headers.get("x-request-id") || "";
  let body: AnyErrorBody = {};
  try {
    body = await response.json();
  } catch {
    // Non-JSON response — fall back to a generic error
  }

  let message = body.message;
  let errorCode = body.error_code;
  let details = body.details || {};

  if (!message && Array.isArray(body.detail)) {
    const fields: Record<string, string> = {};
    const messages = body.detail.map((issue) => {
      const text = cleanIssue(issue.msg ?? "");
      const field = issue.loc?.[issue.loc.length - 1];
      if (typeof field === "string" && !(field in fields)) fields[field] = text;
      return text;
    });
    message = messages.filter(Boolean).join(", ");
    errorCode ??= "VALIDATION_ERROR";
    details = { ...details, fields };
  } else if (!message && typeof body.detail === "string") {
    message = body.detail;
    if (response.status === 403) errorCode ??= "PERMISSION_DENIED";
  }

  return new ApiRequestError({
    status: response.status,
    error_code: errorCode || `HTTP_${response.status}`,
    message: message || fallbackMessage || `Request failed with status ${response.status}`,
    request_id: body.request_id || requestId,
    retryable: body.retryable ?? false,
    retry_after: body.retry_after,
    details,
  });
}
