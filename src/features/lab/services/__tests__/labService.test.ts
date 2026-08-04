import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { labService } from "../labService";

function stubFetch(body: unknown) {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function firstCall(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0];
  return {
    url: String(url),
    method: init?.method,
    body: init?.body ? JSON.parse(init.body) : undefined,
  };
}

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("partner", { profile: { user_id: "partner-1" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("labService physical-device commissioning", () => {
  it("confirms a short code without a plaintext token contract", async () => {
    const fetchMock = stubFetch({
      status: "APPROVED",
      pairing_id: "pair-1",
      device: { id: "device-1", lab_id: "lab-1", health_status: "OFFLINE" },
    });

    const result = await labService.confirmDevicePairing({
      lab_id: "lab-1",
      user_code: "K7M4QP",
      device_label: "Desk 1",
      is_spare: false,
      existing_device_id: null,
    });

    const call = firstCall(fetchMock);
    expect(call.url).toMatch(/\/lab\/device-pairings\/confirm$/);
    expect(call.method).toBe("POST");
    expect(call.body).toEqual({
      lab_id: "lab-1",
      user_code: "K7M4QP",
      device_label: "Desk 1",
      is_spare: false,
      existing_device_id: null,
    });
    expect(result).not.toHaveProperty("device_token");
  });

  it("reads the authoritative pre-start capacity hint", async () => {
    const fetchMock = stubFetch({
      slot_id: "slot-1",
      limit: 24,
      required: 3,
      active: 0,
      lab_active: 0,
      reserved: 0,
      available: 24,
      can_start: true,
    });

    const result = await labService.getSlotCapacity("slot/1");

    expect(firstCall(fetchMock).url).toContain("/lab/slots/slot%2F1/capacity");
    expect(result.can_start).toBe(true);
    expect(result.limit).toBe(24);
  });

  it("moves a device by target Lab without rotating its credential", async () => {
    const fetchMock = stubFetch({
      id: "device-1",
      lab_id: "lab-2",
      device_label: "Desk 1",
    });

    await labService.moveDevice("device-1", { target_lab_id: "lab-2" });

    const call = firstCall(fetchMock);
    expect(call.url).toMatch(/\/lab\/devices\/device-1\/move$/);
    expect(call.method).toBe("POST");
    expect(call.body).toEqual({ target_lab_id: "lab-2" });
  });

  it("lists resumable pairing progress for a Lab", async () => {
    const fetchMock = stubFetch([]);
    await labService.listDevicePairings("lab/1");
    expect(firstCall(fetchMock).url).toContain("/lab/labs/lab%2F1/device-pairings");
  });
});
