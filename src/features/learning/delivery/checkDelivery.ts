/**
 * Check delivery (backend ADR 0035 decision 5): the server counts an answer to a check only after the client confirmed the
 * check was delivered in this session, `POST /v1/instances/{id}/checks/{item}/delivered`.
 *
 * - `screen`: the check card was actually rendered and visible. `voice`: the tutor's audio played to its end.
 * - The server binds a confirmation to the check, the active node, the round the answer would land in and the session. The
 *   round is the server's to count (`round_ordinal`, or the next one when none is open); the client only keys on it so a check
 *   shown again in a new round is confirmed again.
 * - Interrupted playback confirms nothing, so it sends nothing (the server refuses `completed: false`, `delivery_not_completed`).
 * - A retry or a duplicate event reuses one `request_id` per binding and channel; the server treats a replay as one delivery.
 * - A failure is retried a bounded number of times with the same id and is never shown to the learner.
 */

export type DeliveryChannel = "screen" | "voice";

/** `DeliveryBody` in the backend contract. `completed` is always true: an incomplete delivery is never sent. */
export interface DeliveryBody {
  request_id: string;
  session_id: string;
  channel: DeliveryChannel;
  completed: true;
}

/** What a confirmation is bound to. `round` is the round ordinal the answer would land in, as the client reads it. */
export interface DeliveryBinding {
  instanceId: string;
  instanceNodeId: string;
  itemId: string;
  round: string;
  sessionId: string;
}

export type DeliveryOutcome = "confirmed" | "failed" | "skipped";

export interface DeliveryDeps {
  send: (instanceId: string, itemId: string, body: DeliveryBody) => Promise<unknown>;
  newId: () => string;
  sleep: (ms: number) => Promise<void>;
  /** Asked before every attempt: false once the check, node, round or session is no longer the one on screen (nothing is sent). */
  stillCurrent: (binding: DeliveryBinding, channel: DeliveryChannel) => boolean;
}

/** Waits between attempts: one try, then three retries. */
export const RETRY_DELAYS_MS = [500, 1500, 4000] as const;

export const bindingKey = (b: DeliveryBinding, channel: DeliveryChannel): string =>
  [channel, b.instanceId, b.instanceNodeId, b.itemId, b.round, b.sessionId].join("|");

/** A network failure, a timeout, a rate limit or a server error may succeed later; any other refusal never will. */
export function isRetryable(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status !== "number" || status >= 500 || status === 408 || status === 429;
}

interface Entry {
  requestId: string;
  status: "inflight" | "confirmed" | "failed";
  promise: Promise<DeliveryOutcome>;
}

export class DeliveryLedger {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly deps: DeliveryDeps) {}

  /**
   * Confirm one delivery. A binding already confirmed or in flight is not sent again (a duplicate event); one that gave up
   * is tried again with the same request id.
   */
  confirm(binding: DeliveryBinding, channel: DeliveryChannel): Promise<DeliveryOutcome> {
    const key = bindingKey(binding, channel);
    const existing = this.entries.get(key);
    if (existing && existing.status !== "failed") return existing.promise;
    const entry: Entry = { requestId: existing?.requestId ?? this.deps.newId(), status: "inflight", promise: Promise.resolve("skipped") };
    entry.promise = this.run(binding, channel, entry);
    this.entries.set(key, entry);
    return entry.promise;
  }

  /** The delivery in flight for this binding, if any (an answer waits for it rather than racing it). */
  inflight(binding: DeliveryBinding, channel: DeliveryChannel): Promise<DeliveryOutcome> | null {
    const entry = this.entries.get(bindingKey(binding, channel));
    return entry?.status === "inflight" ? entry.promise : null;
  }

  /** The request id used for a binding, for tests and diagnostics. */
  requestId(binding: DeliveryBinding, channel: DeliveryChannel): string | null {
    return this.entries.get(bindingKey(binding, channel))?.requestId ?? null;
  }

  /** Mark a binding as not confirmed (the server said it was not delivered), so the next confirm sends it again, same id. */
  forget(binding: DeliveryBinding, channel: DeliveryChannel): void {
    const entry = this.entries.get(bindingKey(binding, channel));
    if (entry && entry.status === "confirmed") entry.status = "failed";
  }

  clear(): void {
    this.entries.clear();
  }

  private async run(binding: DeliveryBinding, channel: DeliveryChannel, entry: Entry): Promise<DeliveryOutcome> {
    const body: DeliveryBody = { request_id: entry.requestId, session_id: binding.sessionId, channel, completed: true };
    for (let attempt = 0; ; attempt += 1) {
      // Re-checked every time: a retry never sends for a check, round or session that has moved on.
      if (!this.deps.stillCurrent(binding, channel)) {
        entry.status = "failed";
        return "skipped";
      }
      try {
        await this.deps.send(binding.instanceId, binding.itemId, body);
        entry.status = "confirmed";
        return "confirmed";
      } catch (error) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined || !isRetryable(error)) {
          entry.status = "failed";
          return "failed";
        }
        await this.deps.sleep(delay);
      }
    }
  }
}
