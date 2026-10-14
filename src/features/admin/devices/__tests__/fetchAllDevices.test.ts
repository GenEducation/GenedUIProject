import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { fetchAllDevices, FLEET_FETCH_CAP } from "../fetchAllDevices";
import type { AdminDeviceListItem } from "../types";

const listFleetDevices = vi.hoisted(() => vi.fn());
vi.mock("../../adminService", () => ({ listFleetDevices }));

function page(count: number, total: number, pageNo = 1) {
  const items = Array.from({ length: count }, (_, i) => ({
    id: `d-${pageNo}-${i}`,
  })) as unknown as AdminDeviceListItem[];
  return { items, total, page: pageNo, page_size: 200 };
}

beforeEach(() => listFleetDevices.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("fetchAllDevices", () => {
  it("requests page 2 when the first full page is short of the total", async () => {
    listFleetDevices
      .mockResolvedValueOnce(page(200, 260, 1))
      .mockResolvedValueOnce(page(60, 260, 2));

    const res = await fetchAllDevices();

    expect(listFleetDevices).toHaveBeenCalledTimes(2);
    expect(listFleetDevices.mock.calls[1][0]).toMatchObject({ page: 2, page_size: 200 });
    expect(res.devices).toHaveLength(260);
    expect(res.truncated).toBe(false);
  });

  it("stops on a short page even if the server over-reports total", async () => {
    // Guards against an infinite loop when `total` and the data disagree.
    listFleetDevices.mockResolvedValue(page(5, 9999));

    const res = await fetchAllDevices();

    expect(listFleetDevices).toHaveBeenCalledTimes(1);
    expect(res.devices).toHaveLength(5);
    expect(res.truncated).toBe(true);
  });

  it("stops at the cap and reports truncation rather than silently hiding devices", async () => {
    const huge = FLEET_FETCH_CAP + 500;
    let pageNo = 0;
    listFleetDevices.mockImplementation(() => {
      pageNo += 1;
      return Promise.resolve(page(200, huge, pageNo));
    });

    const res = await fetchAllDevices();

    expect(res.devices).toHaveLength(FLEET_FETCH_CAP);
    expect(res.total).toBe(huge);
    expect(res.truncated).toBe(true);
  });
});
