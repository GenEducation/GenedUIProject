import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { makeVisual, visualsFixture } from "@/test/msw/handlers/visuals";
import type { Subject } from "../../store/usePartnerStore";
import { INDEX_LIMIT, INDEX_MAX_PAGES, useVisualsIndex } from "../useVisualsIndex";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const BIG = "synthetic-big-chapter";
const SMALL = "synthetic-small-chapter";
const chapter = (source_id: string) => ({ id: source_id, source_id, state: "ready" }) as unknown as Subject;
const subjects = [chapter(BIG), chapter(SMALL)];

beforeEach(() => {
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe("useVisualsIndex", () => {
  it("counts every pending visual exactly, past one page, with no '+' on any chapter", async () => {
    visualsFixture.reset(() => [
      ...Array.from({ length: INDEX_LIMIT + 50 }, () => makeVisual({ source_id: BIG })),
      ...Array.from({ length: 17 }, () => makeVisual({ source_id: SMALL })),
    ]);
    const { result } = renderHook(() => useVisualsIndex(subjects));
    await waitFor(() => expect(result.current.countsFor(subjects[0])?.pending).toBe(INDEX_LIMIT + 50));
    expect(result.current.countsFor(subjects[1])?.pending).toBe(17);
    expect(result.current.pendingMayBeMore(subjects[0])).toBe(false);
    expect(result.current.pendingMayBeMore(subjects[1])).toBe(false);
  });

  it("past the page cap, says '+' only for the chapters whose visuals reach the last page read", async () => {
    // Every page comes back full: the index stops at the cap with visuals left over.
    let page = 0;
    server.use(
      http.get(`${BASE}/v1/visuals/candidates`, ({ request }) => {
        if (new URL(request.url).searchParams.get("state") !== "pending") return HttpResponse.json([]);
        page += 1;
        const source = page === INDEX_MAX_PAGES ? BIG : SMALL;
        return HttpResponse.json(
          Array.from({ length: INDEX_LIMIT }, (_, i) => ({
            ...makeVisual({ source_id: source }),
            id: `p${page}-${i}`,
            created_at: `2026-01-01T00:00:${String(99 - page).padStart(2, "0")}Z`,
          })),
        );
      }),
    );
    const { result } = renderHook(() => useVisualsIndex(subjects));
    await waitFor(() => expect(result.current.pendingMayBeMore(subjects[0])).toBe(true));
    expect(result.current.pendingMayBeMore(subjects[1])).toBe(false);
    expect(page).toBe(INDEX_MAX_PAGES);
  });
});
