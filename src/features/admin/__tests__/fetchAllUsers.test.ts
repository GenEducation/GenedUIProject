import { afterEach, describe, expect, it, vi } from "vitest";

const listUsers = vi.hoisted(() => vi.fn());
vi.mock("../adminService", () => ({ listUsers }));

import { USERS_FETCH_CAP, fetchAllUsers } from "../fetchAllUsers";

function page(items: number, total: number) {
  return {
    items: Array.from({ length: items }, (_, i) => ({ id: `u${i}` })),
    total,
    page: 1,
    page_size: 200,
  };
}

afterEach(() => listUsers.mockReset());

describe("fetchAllUsers", () => {
  // The regression this exists for: the screen asked for one page of 1000,
  // which the MVP allowed and the new backend rejects with a 422.
  it("never asks for more than the server's maximum", async () => {
    listUsers.mockResolvedValue(page(25, 25));
    await fetchAllUsers();
    for (const [params] of listUsers.mock.calls) {
      expect(params.pageSize).toBeLessThanOrEqual(200);
    }
  });

  it("returns a single short page without asking for another", async () => {
    listUsers.mockResolvedValue(page(25, 25));
    const res = await fetchAllUsers();
    expect(res.users).toHaveLength(25);
    expect(res.total).toBe(25);
    expect(res.truncated).toBe(false);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it("pages until the whole list is in hand", async () => {
    listUsers
      .mockResolvedValueOnce(page(200, 450))
      .mockResolvedValueOnce(page(200, 450))
      .mockResolvedValueOnce(page(50, 450));
    const res = await fetchAllUsers();
    expect(res.users).toHaveLength(450);
    expect(res.truncated).toBe(false);
    expect(listUsers.mock.calls.map(([p]) => p.page)).toEqual([1, 2, 3]);
  });

  it("passes the caller's filters through on every page", async () => {
    listUsers.mockResolvedValueOnce(page(200, 300)).mockResolvedValueOnce(page(100, 300));
    await fetchAllUsers({ role: "STUDENT", q: "ada" });
    for (const [params] of listUsers.mock.calls) {
      expect(params).toMatchObject({ role: "STUDENT", q: "ada" });
    }
  });

  // Without this, a server reporting a total larger than it can return loops
  // forever.
  it("stops on a short page even when total claims there is more", async () => {
    listUsers.mockResolvedValue(page(10, 999999));
    const res = await fetchAllUsers();
    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(res.truncated).toBe(true);
  });

  it("stops at the cap and says the list is incomplete", async () => {
    listUsers.mockResolvedValue(page(200, USERS_FETCH_CAP * 2));
    const res = await fetchAllUsers();
    expect(res.users.length).toBeGreaterThanOrEqual(USERS_FETCH_CAP);
    expect(res.truncated).toBe(true);
  });
});
