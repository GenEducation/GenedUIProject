import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/utils/authFetch", () => ({ authFetch: vi.fn() }));

import { authFetch } from "@/utils/authFetch";
import { buildHeatmapMonths, getActivityColor, fetchActivityData, type HeatmapMonth } from "../heatmapUtils";

const authFetchMock = vi.mocked(authFetch);

const allDays = (months: HeatmapMonth[]) => months.flatMap((m) => m.weeks.flatMap((w) => w));
const findDay = (months: HeatmapMonth[], iso: string) => allDays(months).find((d) => d.date === iso);

describe("buildHeatmapMonths", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("builds full 7-day weeks with null padding slots", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"));
    const months = buildHeatmapMonths({});

    for (const m of months) {
      for (const week of m.weeks) {
        expect(week).toHaveLength(7);
      }
    }
    const padding = allDays(months).filter((d) => d.date === null);
    expect(padding.length).toBeGreaterThan(0);
    padding.forEach((p) => expect(p).toMatchObject({ count: 0, isFuture: false }));
  });

  it("spans roughly the last 365 days (includes the same month a year ago)", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"));
    const months = buildHeatmapMonths({});
    expect(months.some((m) => m.label === "Feb" && m.year === 2025)).toBe(true);
    expect(months.some((m) => m.label === "Feb" && m.year === 2026)).toBe(true);
  });

  it("flags days after today as future, today and earlier as not", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"));
    const months = buildHeatmapMonths({});
    expect(findDay(months, "2026-02-15")?.isFuture).toBe(false);
    expect(findDay(months, "2026-02-16")?.isFuture).toBe(true);
    expect(findDay(months, "2026-02-28")?.isFuture).toBe(true);
  });

  it("looks up activity counts from the input map, defaulting to 0", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"));
    const months = buildHeatmapMonths({ "2026-02-10": 5 });
    expect(findDay(months, "2026-02-10")?.count).toBe(5);
    expect(findDay(months, "2026-02-11")?.count).toBe(0);
  });

  it("handles Feb 29 in a leap year and omits it in a non-leap year", () => {
    vi.setSystemTime(new Date("2024-03-01T12:00:00"));
    const leap = buildHeatmapMonths({});
    expect(findDay(leap, "2024-02-29")).toBeDefined();

    vi.setSystemTime(new Date("2026-02-15T12:00:00"));
    const nonLeap = buildHeatmapMonths({});
    expect(findDay(nonLeap, "2026-02-29")).toBeUndefined();
  });
});

describe("getActivityColor", () => {
  it("returns the placeholder color for future days regardless of count", () => {
    expect(getActivityColor(4, true)).toBe("rgba(4,46,92,0.025)");
  });

  it("maps counts 0-3 and 4+ to distinct colors", () => {
    expect(getActivityColor(0, false)).toBe("rgba(4,46,92,0.06)");
    expect(getActivityColor(1, false)).toBe("#9be9a8");
    expect(getActivityColor(2, false)).toBe("#40c463");
    expect(getActivityColor(3, false)).toBe("#30a14e");
    expect(getActivityColor(9, false)).toBe("#216e39");
  });
});

describe("fetchActivityData", () => {
  beforeEach(() => authFetchMock.mockReset());

  it("returns the activities map on success", async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ activities: { "2026-01-01": 3 } }),
    } as unknown as Response);

    await expect(fetchActivityData("s1")).resolves.toEqual({ "2026-01-01": 3 });
    expect(authFetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/students\/s1\/activity\?days=365$/));
  });

  it("returns {} when the response has no activities field", async () => {
    authFetchMock.mockResolvedValue({ ok: true, json: async () => ({}) } as unknown as Response);
    await expect(fetchActivityData("s1")).resolves.toEqual({});
  });

  it("returns {} and logs when the response body fails to parse", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Response);

    const result = await fetchActivityData("s1");

    expect(result).toEqual({});
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("returns {} when the response is not ok", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authFetchMock.mockResolvedValue({ ok: false } as unknown as Response);

    await expect(fetchActivityData("s1")).resolves.toEqual({});
    errSpy.mockRestore();
  });
});
