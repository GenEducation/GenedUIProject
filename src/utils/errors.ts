/**
 * Duck-typed view of a value caught in a `catch` block.
 *
 * `catch` bindings are `unknown` under `strict`, and what actually arrives
 * varies: `authFetch` throws `ApiRequestError` (carrying `status`,
 * `error_code` and `request_id`), `fetch` aborts throw a `DOMException` named
 * "AbortError", pdf.js throws a `RenderingCancelledException`, and
 * script-tag SDKs (Razorpay, Google Sign-In) reject with plain objects that
 * merely have a `message`.
 *
 * These are the fields the codebase actually reads off a caught value. Each is
 * optional because none is guaranteed to be present.
 */
export interface CaughtError {
  message?: string;
  name?: string;
  status?: number;
  error_code?: string;
  request_id?: string;
}

/**
 * Narrow a caught value to the fields above without asserting it is an
 * `Error`. Non-object throws (strings, null, undefined) yield an empty object,
 * so every property read is simply `undefined` — reproducing exactly what the
 * previous `catch (err: any)` sites did with `err?.field`.
 */
export function asError(error: unknown): CaughtError {
  return (error && typeof error === "object" ? error : {}) as CaughtError;
}
