import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { visualsFixture } from "@/test/msw/handlers/visuals";
import { ApiRequestError } from "@/utils/authFetch";
import { visualsService } from "../visualsService";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

beforeEach(() => {
  visualsFixture.reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  localStorage.setItem("gened_user_role", "partner");
});

describe("visualsService", () => {
  it("sends only the filters that are set", async () => {
    let seen: URL | null = null;
    server.use(
      http.get(`${BASE}/v1/visuals/candidates`, ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json([]);
      }),
    );

    await visualsService.listCandidates({ state: "rejected", source_id: "src-1", grade: 6, subject: "", before: undefined, limit: 24 });

    expect(seen!.searchParams.get("state")).toBe("rejected");
    expect(seen!.searchParams.get("source_id")).toBe("src-1");
    expect(seen!.searchParams.get("grade")).toBe("6");
    expect(seen!.searchParams.get("limit")).toBe("24");
    expect(seen!.searchParams.has("subject")).toBe(false);
    expect(seen!.searchParams.has("before")).toBe(false);
  });

  it("lists pending visuals newest first", async () => {
    const items = await visualsService.listCandidates();
    expect(items.map((v) => v.state)).toEqual(["pending", "pending"]);
    expect(items[0].created_at > items[1].created_at).toBe(true);
  });

  it("sends {content_hash, decision} for an accept", async () => {
    let body: unknown = null;
    server.use(
      http.post(`${BASE}/v1/visuals/candidates/:id/decision`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "vis-1", state: "accepted", regeneration_id: null });
      }),
    );

    await visualsService.decide("vis-1", { content_hash: "hash-vis-1", decision: "accept" });

    expect(body).toEqual({ content_hash: "hash-vis-1", decision: "accept" });
  });

  it("surfaces a 409 as ApiRequestError and keeps the session", async () => {
    await visualsService.decide("vis-3", { content_hash: "hash-vis-3", decision: "accept" }).then(
      () => expect.unreachable(),
      (e) => {
        expect(e).toBeInstanceOf(ApiRequestError);
        expect(e.status).toBe(409);
        expect(e.message).toBe("This visual was already decided.");
      },
    );
    expect(localStorage.getItem("gened_auth_token")).toBe("token-synthetic");
  });

  it("builds an absolute image src, or null", () => {
    expect(visualsService.imageSrc("/v1/visual-images/x?sig=1")).toBe(`${BASE}/v1/visual-images/x?sig=1`);
    expect(visualsService.imageSrc(null)).toBeNull();
  });
});
