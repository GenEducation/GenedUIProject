import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { syntheticPdf, installNodeMultipart } from "@/test/multipart";
import { lastUpload, makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { ApiRequestError } from "@/utils/authFetch";
import { sourcesService } from "../sourcesService";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

installNodeMultipart();

beforeEach(() => {
  sourcesFixture.reset(() => [makeSource(), makeSource({ state: "ready" })]);
  localStorage.setItem("gened_auth_token", "token-synthetic");
  localStorage.setItem("gened_user_role", "partner");
});

describe("sourcesService", () => {
  it("lists with only the filters that are set", async () => {
    let seen: URL | null = null;
    server.use(
      http.get(`${BASE}/v1/sources`, ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json({ items: [], total_count: 0, limit: 20, offset: 0 });
      }),
    );
    await sourcesService.list({ state: "ready", grade: 6, subject: "", search: undefined, limit: 20, offset: 0 });
    expect(seen!.searchParams.get("state")).toBe("ready");
    expect(seen!.searchParams.get("grade")).toBe("6");
    expect(seen!.searchParams.get("offset")).toBe("0");
    expect(seen!.searchParams.has("subject")).toBe(false);
    expect(seen!.searchParams.has("search")).toBe(false);
  });

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

  it("reads the PDF as a blob and the picker's reference data", async () => {
    const [first] = (await sourcesService.list()).items;
    const blob = await sourcesService.pdfBlob(first.source_id);
    expect(blob.type).toBe("application/pdf");
    expect((await sourcesService.learningOutcomes("CBSE", "Mathematics", 6)).map((o) => o.code)).toContain("G6-MATH-LO1.2.1");
    expect(await sourcesService.learningOutcomes("CBSE", "Science", 7)).toEqual([]);
    expect(await sourcesService.strands("Mathematics")).toEqual(["synthetic_existing"]);
  });
});
