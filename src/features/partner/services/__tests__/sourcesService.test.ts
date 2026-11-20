import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { syntheticPdf, installNodeMultipart } from "@/test/multipart";
import {
  lastUpload,
  makeSource,
  sourcesFixture,
} from "@/test/msw/handlers/sources";
import { ApiRequestError } from "@/utils/authFetch";
import { sourcesService } from "../sourcesService";

installNodeMultipart();

beforeEach(() => {
  sourcesFixture.reset(() => [makeSource(), makeSource({ state: "ready" })]);
  localStorage.setItem("gened_auth_token", "token-synthetic");
  localStorage.setItem("gened_user_role", "partner");
});

describe("sourcesService", () => {
  it("uploads the chapter as multipart, with one lo_codes field per outcome", async () => {
    const created = await sourcesService.register({
      file: syntheticPdf(),
      board: "CBSE",
      publisher: "NCERT",
      subject: "Mathematics",
      grade: 6,
      book_title: "SYNTHETIC Book",
      edition_label: "SYNTHETIC TEST DATA",
      chapter_ordinal: 2,
      chapter_title: "SYNTHETIC chapter",
      first_pdf_page: 1,
      last_pdf_page: 3,
      strand: "synthetic_strand",
      lo_codes: ["G6-MATH-LO1.1.1", "G6-MATH-LO1.2.1"],
    });
    expect(created.state).toBe("registered");
    expect(lastUpload).toMatchObject({
      subject: "Mathematics",
      grade: "6",
      chapter_ordinal: "2",
      lo_codes: ["G6-MATH-LO1.1.1", "G6-MATH-LO1.2.1"],
      full_coverage_codes: [],
    });
  });

  it("surfaces a 409 with the server's reason and keeps the session", async () => {
    const queued = makeSource({ state: "queued" });
    sourcesFixture.set(queued);
    await sourcesService.cancel(queued.source_id);
    await sourcesService.cancel(queued.source_id).then(
      () => expect.unreachable(),
      (e) => {
        expect(e).toBeInstanceOf(ApiRequestError);
        expect(e.status).toBe(409);
        expect(e.message).toMatch(/still waiting to start/);
      },
    );
    expect(localStorage.getItem("gened_auth_token")).toBe("token-synthetic");
  });

  it("deletes a chapter with DELETE /v1/sources/{id}, and surfaces the server's refusal for one it keeps", async () => {
    const failed = makeSource({ state: "failed" });
    const ready = makeSource({ state: "running" });
    sourcesFixture.set(failed);
    sourcesFixture.set(ready);
    await sourcesService.remove(failed.source_id);
    expect(sourcesFixture.get(failed.source_id)).toBeUndefined();
    await sourcesService.remove(ready.source_id).then(
      () => expect.unreachable(),
      (e) => {
        expect(e).toBeInstanceOf(ApiRequestError);
        expect(e.status).toBe(409);
        expect(e.message).toMatch(/running cannot be deleted/);
      },
    );
    expect(sourcesFixture.get(ready.source_id)).toBeDefined();
  });

  it("sends the optional full-coverage codes as one field each", async () => {
    await sourcesService.register({
      file: syntheticPdf(),
      board: "CBSE",
      publisher: "NCERT",
      subject: "Mathematics",
      grade: 6,
      book_title: "SYNTHETIC Book",
      edition_label: "SYNTHETIC TEST DATA",
      chapter_ordinal: 3,
      chapter_title: "SYNTHETIC chapter",
      first_pdf_page: 1,
      last_pdf_page: 3,
      strand: "synthetic_strand",
      lo_codes: ["G6-MATH-LO1.1.1"],
      full_coverage_codes: ["G6-MATH-LO1.1.1"],
    });
    expect(lastUpload).toMatchObject({ full_coverage_codes: ["G6-MATH-LO1.1.1"] });
  });
});

describe("sourcesService — review and bank requests", () => {
  // Every call below: the route, method and body it sends, answered with a stub.
  type Seen = { method: string; path: string; body: unknown };
  let seen: Seen[] = [];
  const record = (reply: () => Response) => async ({ request }: { request: Request }) => {
    const text = request.method === "GET" ? "" : await request.text();
    seen.push({
      method: request.method,
      path: new URL(request.url).pathname.replace(/^.*?\/v1\//, "/v1/"),
      body: text ? JSON.parse(text) : null,
    });
    return reply();
  };
  const bank = () => HttpResponse.json({ version: "bank-v2" });

  beforeEach(() => {
    seen = [];
    server.use(
      http.get("*/v1/activity-reviews/:id", record(() => HttpResponse.json([{ evaluation_id: "ev-1" }]))),
      http.post("*/v1/activity-reviews/:id/:evaluation/override", record(() => new HttpResponse(null, { status: 204 }))),
      http.put("*/v1/sources/:id/bank/questions/:qid", record(bank)),
      http.post("*/v1/sources/:id/bank/questions", record(bank)),
      http.post("*/v1/sources/:id/bank/concepts/:key/keep", record(bank)),
      http.post("*/v1/sources/:id/bank/refill", record(bank)),
      http.get("*/v1/sources/:id/pdf", record(() => new HttpResponse("%PDF-SYNTHETIC", { headers: { "Content-Type": "application/pdf" } }))),
    );
  });

  it("reads a chapter's activity reviews and overrides one verdict", async () => {
    expect(await sourcesService.activityReviews("src 1")).toEqual([{ evaluation_id: "ev-1" }]);
    await sourcesService.overrideActivityVerdict("src 1", "ev-1", 2, "met", "Clear in the recording");
    expect(seen).toEqual([
      { method: "GET", path: "/v1/activity-reviews/src%201", body: null },
      {
        method: "POST",
        path: "/v1/activity-reviews/src%201/ev-1/override",
        body: { objective: 2, verdict: "met", reason: "Clear in the recording" },
      },
    ]);
  });

  it("edits, creates and refills bank questions and keeps a held concept", async () => {
    const question = { objective: 1, prompt: "SYNTHETIC prompt" } as never;
    await sourcesService.editQuestion("src-1", "q-7", 3, question);
    await sourcesService.createQuestion("src-1", question);
    await sourcesService.keepConcept("src-1", "fractions/equal parts");
    await sourcesService.refillPart("src-1", "sec-2");
    expect((await sourcesService.refillPart("src-1", "sec-2", ["a market"])).version).toBe("bank-v2");
    expect(seen).toEqual([
      { method: "PUT", path: "/v1/sources/src-1/bank/questions/q-7", body: { version: 3, question } },
      { method: "POST", path: "/v1/sources/src-1/bank/questions", body: { question } },
      { method: "POST", path: "/v1/sources/src-1/bank/concepts/fractions%2Fequal%20parts/keep", body: null },
      { method: "POST", path: "/v1/sources/src-1/bank/refill", body: { section_key: "sec-2", hints: [] } },
      { method: "POST", path: "/v1/sources/src-1/bank/refill", body: { section_key: "sec-2", hints: ["a market"] } },
    ]);
  });

  it("downloads the uploaded PDF as a blob", async () => {
    const blob = await sourcesService.pdfBlob("src-1");
    expect(blob.size).toBe("%PDF-SYNTHETIC".length);
    expect(blob.type).toBe("application/pdf");
    expect(seen).toEqual([{ method: "GET", path: "/v1/sources/src-1/pdf", body: null }]);
  });
});
