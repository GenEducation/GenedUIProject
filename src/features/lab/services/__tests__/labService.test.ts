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

  it("creates a roster-backed class", async () => {
    const fetchMock = stubFetch({ grade: 4, section: "A", academic_year: "2026-27", student_count: 2 });

    await labService.createClass({
      partner_id: "partner-1",
      grade: 4,
      section: "A",
      academic_year: "2026-27",
      student_ids: ["student-1", "student-2"],
    });

    const call = firstCall(fetchMock);
    expect(call.url).toMatch(/\/lab\/classes$/);
    expect(call.method).toBe("POST");
    expect(call.body.student_ids).toEqual(["student-1", "student-2"]);
  });

  it("submits only explicit pre-activation seat assignments", async () => {
    const fetchMock = stubFetch({ assigned: 2, idle: 0, sessions: [] });

    await labService.activateSlot("slot-1", [
      { student_id: "student-1", device_id: "device-2" },
    ]);

    const call = firstCall(fetchMock);
    expect(call.method).toBe("POST");
    expect(call.body).toEqual({
      assignments: [{ student_id: "student-1", device_id: "device-2" }],
    });
  });

  it("keeps legacy no-body activation when every student is automatic", async () => {
    const fetchMock = stubFetch({ assigned: 2, idle: 0, sessions: [] });

    await labService.activateSlot("slot-1");

    const call = firstCall(fetchMock);
    expect(call.method).toBe("POST");
    expect(call.body).toBeUndefined();
  });
});
