import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { http } from "msw";
import { server } from "@/test/msw/server";
import { makeVisual, visualsFixture } from "@/test/msw/handlers/visuals";
import { REGEN_POLL_MS, useVisualDetail } from "../useVisualDetail";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

function rejectedWithQueuedRegen() {
  return makeVisual({
    id: "vis-rej",
    state: "rejected",
    decision: { decision: "reject", reason_codes: ["unclear"], note: null, actor_role: "PARTNER", decided_at: "2026-01-02T00:00:00Z" },
    regeneration: {
      id: "regen-1",
      state: "queued",
      attempts: 1,
      result_candidate_id: null,
      error: null,
      created_at: "2026-01-02T00:00:00Z",
      finished_at: null,
    },
  });
}

let reads = 0;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  visualsFixture.reset(() => [rejectedWithQueuedRegen()]);
  reads = 0;
  server.events.on("request:start", ({ request }) => {
    if (request.method === "GET" && request.url.startsWith(`${BASE}/v1/visuals/candidates/vis-rej`)) reads += 1;
  });
});

afterEach(() => {
  server.events.removeAllListeners();
  vi.useRealTimers();
});

const tick = () => act(() => vi.advanceTimersByTimeAsync(REGEN_POLL_MS));

describe("useVisualDetail — regeneration polling", () => {
  it("polls queued → claimed → done, then stops", async () => {
    const { result } = renderHook(() => useVisualDetail("vis-rej"));

    await waitFor(() => expect(result.current.detail?.regeneration?.state).toBe("queued"));
    expect(result.current.polling).toBe(true);

    await tick();
    await waitFor(() => expect(result.current.detail?.regeneration?.state).toBe("claimed"));

    await tick();
    await waitFor(() => expect(result.current.detail?.regeneration?.state).toBe("done"));
    expect(result.current.detail?.regeneration?.result_candidate_id).toBeTruthy();
    expect(result.current.polling).toBe(false);

    const readsAtDone = reads;
    await tick();
    await tick();
    expect(reads).toBe(readsAtDone);
  });

  it("stops on failed", async () => {
    visualsFixture.setRegenOutcome("failed");
    const { result } = renderHook(() => useVisualDetail("vis-rej"));

    await waitFor(() => expect(result.current.detail?.regeneration?.state).toBe("queued"));
    await tick();
    await tick();
    await waitFor(() => expect(result.current.detail?.regeneration?.state).toBe("failed"));
    expect(result.current.polling).toBe(false);
  });

  it("does not poll a visual with no regeneration in flight", async () => {
    visualsFixture.reset(() => [makeVisual({ id: "vis-rej" })]);
    const { result } = renderHook(() => useVisualDetail("vis-rej"));
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    const before = reads;
    await tick();
    expect(reads).toBe(before);
  });

  it("shows an error when the detail can't be read", async () => {
    server.use(http.get(`${BASE}/v1/visuals/candidates/:id`, () => new Response(null, { status: 500 })));
    const { result } = renderHook(() => useVisualDetail("vis-rej"));
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
