import { describe, it, expect } from "vitest";
import { DeliveryLedger, RETRY_DELAYS_MS, isRetryable, type DeliveryBinding, type DeliveryBody } from "../checkDelivery";

const binding = (over: Partial<DeliveryBinding> = {}): DeliveryBinding => ({
  instanceId: "inst", instanceNodeId: "node", itemId: "item-1", round: "1", sessionId: "session-1", ...over,
});

function setup(options: { failures?: number; status?: number; current?: (b: DeliveryBinding) => boolean } = {}) {
  const sent: Array<{ itemId: string; body: DeliveryBody }> = [];
  const sleeps: number[] = [];
  let failures = options.failures ?? 0;
  let n = 0;
  const ledger = new DeliveryLedger({
    send: async (_instance, itemId, body) => {
      sent.push({ itemId, body });
      if (failures > 0) {
        failures -= 1;
        throw Object.assign(new Error("failed"), { status: options.status });
      }
    },
    newId: () => `request-${++n}`,
    sleep: async (ms) => void sleeps.push(ms),
    stillCurrent: (b) => (options.current ? options.current(b) : true),
  });
  return { ledger, sent, sleeps };
}

describe("DeliveryLedger", () => {
  it("confirms a shown check once, with the session, the channel and completed true", async () => {
    const { ledger, sent } = setup();
    expect(await ledger.confirm(binding(), "screen")).toBe("confirmed");
    expect(sent).toEqual([{ itemId: "item-1", body: { request_id: "request-1", session_id: "session-1", channel: "screen", completed: true } }]);
  });

  it("a duplicate event, in flight or after, is one request id and one request", async () => {
    const { ledger, sent } = setup();
    const [a, b] = await Promise.all([ledger.confirm(binding(), "screen"), ledger.confirm(binding(), "screen")]);
    await ledger.confirm(binding(), "screen");
    expect([a, b]).toEqual(["confirmed", "confirmed"]);
    expect(sent).toHaveLength(1);
    expect(new Set(sent.map((s) => s.body.request_id)).size).toBe(1);
  });

  it("a read-aloud check is its own delivery, with its own request id", async () => {
    const { ledger, sent } = setup();
    await ledger.confirm(binding(), "screen");
    await ledger.confirm(binding(), "voice");
    expect(sent.map((s) => s.body.channel)).toEqual(["screen", "voice"]);
    expect(new Set(sent.map((s) => s.body.request_id)).size).toBe(2);
  });

  it("a reconnect (a new session id) or a new round confirms again; each has its own request id", async () => {
    const { ledger, sent } = setup();
    await ledger.confirm(binding(), "screen");
    await ledger.confirm(binding({ sessionId: "session-2" }), "screen");
    await ledger.confirm(binding({ round: "2" }), "screen");
    expect(sent.map((s) => [s.body.session_id, s.body.request_id])).toEqual([
      ["session-1", "request-1"], ["session-2", "request-2"], ["session-1", "request-3"],
    ]);
  });

  it("a failed request is retried with the same request id, a bounded number of times, then gives up quietly", async () => {
    const { ledger, sent, sleeps } = setup({ failures: 99, status: 503 });
    expect(await ledger.confirm(binding(), "screen")).toBe("failed");
    expect(sent).toHaveLength(1 + RETRY_DELAYS_MS.length);
    expect(new Set(sent.map((s) => s.body.request_id))).toEqual(new Set(["request-1"]));
    expect(sleeps).toEqual([...RETRY_DELAYS_MS]);
  });

  it("recovers when a retry succeeds, still on the same request id", async () => {
    const { ledger, sent } = setup({ failures: 2, status: 503 });
    expect(await ledger.confirm(binding(), "screen")).toBe("confirmed");
    expect(sent.map((s) => s.body.request_id)).toEqual(["request-1", "request-1", "request-1"]);
  });

  it("a network failure (no status) is retried", async () => {
    const { ledger, sent } = setup({ failures: 1 });
    expect(await ledger.confirm(binding(), "screen")).toBe("confirmed");
    expect(sent).toHaveLength(2);
  });

  it("a refusal (409) is not retried", async () => {
    const { ledger, sent } = setup({ failures: 1, status: 409 });
    expect(await ledger.confirm(binding(), "screen")).toBe("failed");
    expect(sent).toHaveLength(1);
  });

  it("after giving up, a later confirm tries again with the same request id", async () => {
    const { ledger, sent } = setup({ failures: 1, status: 409 });
    await ledger.confirm(binding(), "screen");
    await ledger.confirm(binding(), "screen");
    expect(sent.map((s) => s.body.request_id)).toEqual(["request-1", "request-1"]);
  });

  it("sends nothing for a check that is no longer the current one, and stops retrying when it stops being current", async () => {
    const none = setup({ current: () => false });
    expect(await none.ledger.confirm(binding({ itemId: "other-node-item" }), "screen")).toBe("skipped");
    expect(none.sent).toEqual([]);

    let current = true;
    const moving = setup({ failures: 99, status: 503, current: () => current });
    const pending = moving.ledger.confirm(binding(), "screen");
    current = false; // the round moved on while the first attempt was failing
    expect(await pending).toBe("skipped");
    expect(moving.sent.length).toBeLessThanOrEqual(2);
  });

  it("forget() lets a refused-as-not-delivered binding be confirmed again with the same id", async () => {
    const { ledger, sent } = setup();
    await ledger.confirm(binding(), "screen");
    ledger.forget(binding(), "screen");
    await ledger.confirm(binding(), "screen");
    expect(sent.map((s) => s.body.request_id)).toEqual(["request-1", "request-1"]);
  });

  it("retryable: network, timeout, rate limit and server errors only", () => {
    expect([undefined, 408, 429, 500, 503].map((status) => isRetryable({ status }))).toEqual([true, true, true, true, true]);
    expect([400, 401, 404, 409, 422].map((status) => isRetryable({ status }))).toEqual([false, false, false, false, false]);
  });
});
