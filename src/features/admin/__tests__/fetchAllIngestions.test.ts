import { afterEach, describe, expect, it, vi } from "vitest";

const listSourceIngestions = vi.hoisted(() => vi.fn());
vi.mock("../adminService", () => ({ listSourceIngestions }));

import { INGESTIONS_FETCH_CAP, fetchAllIngestions } from "../fetchAllIngestions";

function page(items: number, total: number, offset = 0) {
  return {
    items: Array.from({ length: items }, (_, i) => ({ source_id: `s${offset + i}` })),
    total_count: total,
    limit: 200,
    offset,
  };
}

afterEach(() => listSourceIngestions.mockReset());

describe("fetchAllIngestions", () => {
  // The same trap the Users list hit: the MVP's list was unpaginated, the new
  // backend caps `limit` at 200 and answers 422 above it.
  it("never asks for more than the server's maximum", async () => {
    listSourceIngestions.mockResolvedValue(page(12, 12));
    await fetchAllIngestions();
    for (const [params] of listSourceIngestions.mock.calls) {
      expect(params.limit).toBeLessThanOrEqual(200);
    }
  });

  it("returns a single short page without asking for another", async () => {
    listSourceIngestions.mockResolvedValue(page(12, 12));

    const res = await fetchAllIngestions();

    expect(res.sources).toHaveLength(12);
    expect(res.truncated).toBe(false);
    expect(listSourceIngestions).toHaveBeenCalledTimes(1);
  });

  it("walks the offset until the whole list is in hand", async () => {
    listSourceIngestions
      .mockResolvedValueOnce(page(200, 450, 0))
      .mockResolvedValueOnce(page(200, 450, 200))
      .mockResolvedValueOnce(page(50, 450, 400));

    const res = await fetchAllIngestions();

    expect(res.sources).toHaveLength(450);
    expect(res.truncated).toBe(false);
    expect(listSourceIngestions.mock.calls.map(([p]) => p.offset)).toEqual([0, 200, 400]);
  });

  it("stops at the cap and says the list is incomplete", async () => {
    listSourceIngestions.mockImplementation(({ offset }: { offset: number }) =>
      Promise.resolve(page(200, 10_000, offset)),
    );

    const res = await fetchAllIngestions();

    expect(res.sources.length).toBeGreaterThanOrEqual(INGESTIONS_FETCH_CAP);
    expect(res.truncated).toBe(true);
  });

  it("stops on a full page that the server cannot actually follow", async () => {
    // A server reporting a total larger than it will ever return would loop
    // forever on the total check alone; the short-page check is what ends it.
    listSourceIngestions
      .mockResolvedValueOnce(page(200, 9_999, 0))
      .mockResolvedValueOnce(page(7, 9_999, 200));

    const res = await fetchAllIngestions();

    expect(res.sources).toHaveLength(207);
    expect(res.truncated).toBe(true);
    expect(listSourceIngestions).toHaveBeenCalledTimes(2);
  });
});
