import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { visualsFixture } from "@/test/msw/handlers/visuals";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry } from "../SubjectRegistry";

const CUT = { first_page: 34, last_page: 44, reason: "solutions_appendix" as const, status: "pending" as const };

beforeEach(() => {
  visualsFixture.reset();
  sourcesFixture.reset(() => [
    makeSource({
      source_id: "synthetic-cut",
      state: "ready",
      chapter: { ordinal: 4, title: "SYNTHETIC cut chapter", first_pdf_page: 1, last_pdf_page: 33 },
      page_count: 44,
      excluded_pages: CUT,
    }),
    makeSource({ state: "ready", chapter: { ordinal: 5, title: "SYNTHETIC whole chapter", first_pdf_page: 1, last_pdf_page: 3 } }),
  ]);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
});

const rowFor = (title: string) => screen.getByText(title).closest(".group") as HTMLElement;

describe("SubjectRegistry — pages left out as the solutions appendix", () => {
  it("asks about the cut only on the chapter that has one", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC cut chapter");
    const note = within(rowFor("SYNTHETIC cut chapter")).getByRole("note");
    expect(note).toHaveTextContent("Pages 34–44 were left out");
    expect(within(rowFor("SYNTHETIC whole chapter")).queryByRole("note")).toBeNull();
  });

  it("confirms the cut and the question goes away", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC cut chapter");
    fireEvent.click(within(rowFor("SYNTHETIC cut chapter")).getByRole("button", { name: "Yes, leave them out" }));
    await waitFor(() => expect(within(rowFor("SYNTHETIC cut chapter")).queryByRole("note")).toBeNull());
    expect(sourcesFixture.get("synthetic-cut")?.excluded_pages?.status).toBe("confirmed");
  });

  it("includes the pages and the chapter runs again with the whole range", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC cut chapter");
    fireEvent.click(within(rowFor("SYNTHETIC cut chapter")).getByRole("button", { name: "No, include them" }));
    await waitFor(() => expect(sourcesFixture.get("synthetic-cut")?.state).toBe("queued"));
    expect(sourcesFixture.get("synthetic-cut")?.chapter.last_pdf_page).toBe(44);
    await waitFor(() => expect(within(rowFor("SYNTHETIC cut chapter")).queryByRole("note")).toBeNull());
  });

  it("cannot take the pages back while a run is going", async () => {
    sourcesFixture.setState("synthetic-cut", "running");
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC cut chapter");
    expect(within(rowFor("SYNTHETIC cut chapter")).getByRole("button", { name: "No, include them" })).toBeDisabled();
  });
});
