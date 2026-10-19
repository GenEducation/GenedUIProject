import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { syntheticPdf, installNodeMultipart } from "@/test/multipart";
import { usePartnerStore } from "../usePartnerStore";

installNodeMultipart();

beforeEach(() => {
  sourcesFixture.reset(() => [
    makeSource({ state: "ready", chapter: { ordinal: 7, title: "SYNTHETIC chapter seven", first_pdf_page: 1, last_pdf_page: 3 } }),
  ]);
  usePartnerStore.setState({
    subjects: [],
    subjectFilters: {},
    subjectPagination: { total_count: 0, limit: 20, offset: 0 },
    viewerPdfUrl: null,
  });
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe("usePartnerStore — chapter sources", () => {
  it("lists sources as registry rows keyed by source_id", async () => {
    await usePartnerStore.getState().fetchSubjects();
    const [row] = usePartnerStore.getState().subjects;
    expect(row).toMatchObject({ title: "SYNTHETIC chapter seven", chapter_ordinal: 7, subject: "Mathematics", state: "ready" });
    expect(row.id).toBe(row.source_id);
    expect(usePartnerStore.getState().subjectPagination.total_count).toBe(1);
  });

  it("uploads a chapter, queues its first run and shows it first", async () => {
    usePartnerStore.setState({ subjectPagination: { total_count: 9, limit: 20, offset: 20 } });
    await usePartnerStore.getState().uploadSource({
      file: syntheticPdf(),
      board: "CBSE",
      publisher: "NCERT",
      subject: "Mathematics",
      grade: 6,
      book_title: "SYNTHETIC Book",
      edition_label: "SYNTHETIC TEST DATA",
      chapter_ordinal: 2,
      chapter_title: "SYNTHETIC new chapter",
      first_pdf_page: 1,
      last_pdf_page: 3,
      strand: "synthetic_strand",
      lo_codes: ["G6-MATH-LO1.2.1"],
    });
    const state = usePartnerStore.getState();
    expect(state.subjectPagination.offset).toBe(0);
    expect(state.subjects.find((s) => s.title === "SYNTHETIC new chapter")?.state).toBe("queued");
  });

  it("does not swallow a refused upload: the form shows the server's reason", async () => {
    await expect(
      usePartnerStore.getState().uploadSource({
        file: syntheticPdf(), board: "CBSE", publisher: "NCERT", subject: "Mathematics", grade: 6, book_title: "B",
        edition_label: "E", chapter_ordinal: 1, chapter_title: "C", first_pdf_page: 1, last_pdf_page: 9,
        strand: "s", lo_codes: ["G6-MATH-LO1.2.1"],
      }),
    ).rejects.toThrow(/within 1 to 3/);
  });

  it("opens the PDF from an object URL and frees it on close", async () => {
    const create = vi.fn(() => "blob:synthetic-1");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    await usePartnerStore.getState().fetchSubjects();
    const [row] = usePartnerStore.getState().subjects;

    await usePartnerStore.getState().openIngestedPdf(row);
    expect(usePartnerStore.getState()).toMatchObject({ viewerPdfUrl: "blob:synthetic-1", viewerTitle: row.title });

    usePartnerStore.getState().closePdfViewer();
    expect(revoke).toHaveBeenCalledWith("blob:synthetic-1");
    expect(usePartnerStore.getState().viewerPdfUrl).toBeNull();
  });
});
