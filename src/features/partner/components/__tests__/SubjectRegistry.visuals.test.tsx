import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { visualsFixture, SYNTHETIC_SOURCE } from "@/test/msw/handlers/visuals";
import { makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { SYNTHETIC_REPORT } from "@/test/syntheticReport";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
// The PDF viewer renders pdf.js; the store's openIngestedPdf is what these tests care about.
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry, LIST_POLL_MS } from "../SubjectRegistry";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

let listCalls = 0;
const realOpenIngestedPdf = usePartnerStore.getState().openIngestedPdf;

beforeEach(() => {
  visualsFixture.reset();
  sourcesFixture.reset(() => [
    makeSource({ source_id: SYNTHETIC_SOURCE, state: "ready", chapter: { ordinal: 1, title: "SYNTHETIC with visuals", first_pdf_page: 1, last_pdf_page: 3 } }),
    makeSource({ state: "registered", chapter: { ordinal: 2, title: "SYNTHETIC not started", first_pdf_page: 1, last_pdf_page: 3 } }),
    makeSource({ state: "failed", detail: "SYNTHETIC: the PDF could not be read", chapter: { ordinal: 3, title: "SYNTHETIC failed", first_pdf_page: 1, last_pdf_page: 3 } }),
    makeSource({ state: "queued", chapter: { ordinal: 4, title: "SYNTHETIC queued", first_pdf_page: 1, last_pdf_page: 3 } }),
  ]);
  usePartnerStore.setState({
    subjects: [],
    subjectFilters: {},
    subjectPagination: { total_count: 0, limit: 20, offset: 0 },
    openIngestedPdf: realOpenIngestedPdf,
  });
  listCalls = 0;
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.endsWith("/v1/sources")) listCalls += 1;
  });
});

afterEach(() => {
  server.events.removeAllListeners();
  vi.useRealTimers();
});

const rowFor = (title: string) => screen.getByText(title).closest(".group") as HTMLElement;
const renderRegistry = async () => {
  render(<SubjectRegistry onUploadClick={vi.fn()} />);
  await screen.findByText("SYNTHETIC with visuals");
};

describe("SubjectRegistry — chapter sources", () => {
  it("lists the partner's sources with their state and only the actions that state allows", async () => {
    await renderRegistry();

    const ready = rowFor("SYNTHETIC with visuals");
    expect(within(ready).getByText("Ready for your review")).toBeInTheDocument();
    expect(within(ready).getByRole("button", { name: "Run ingestion again" })).toBeInTheDocument();
    expect(within(ready).queryByRole("button", { name: "Delete" })).toBeNull();

    const fresh = rowFor("SYNTHETIC not started");
    expect(within(fresh).getByText("Not started")).toBeInTheDocument();
    expect(within(fresh).getByRole("button", { name: "Start ingestion" })).toBeInTheDocument();
    expect(within(fresh).getByRole("button", { name: "Delete" })).toBeInTheDocument();

    const failed = rowFor("SYNTHETIC failed");
    expect(within(failed).getByText("SYNTHETIC: the PDF could not be read")).toBeInTheDocument();
    expect(within(failed).getByRole("button", { name: "Retry ingestion" })).toBeInTheDocument();

    const queued = rowFor("SYNTHETIC queued");
    expect(within(queued).getByRole("button", { name: "Stop Ingestion" })).toBeInTheDocument();
    expect(within(queued).queryByRole("button", { name: /Start ingestion|Run ingestion again|Retry/ })).toBeNull();
    expect(within(queued).queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("explains a refused action instead of failing silently", async () => {
    server.use(
      http.post(`${BASE}/v1/sources/:id/ingestions`, () =>
        HttpResponse.json({ message: "SYNTHETIC: this chapter is already running." }, { status: 409 }),
      ),
    );
    await renderRegistry();
    fireEvent.click(within(rowFor("SYNTHETIC not started")).getByRole("button", { name: "Start ingestion" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("SYNTHETIC: this chapter is already running.");
  });

  it("asks before re-running a chapter with results, starts nothing on Cancel, and retries a failed one at once", async () => {
    let runs = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && new URL(request.url).pathname.endsWith("/ingestions")) runs += 1;
    });
    await renderRegistry();
    const rerun = () => fireEvent.click(within(rowFor("SYNTHETIC with visuals")).getByRole("button", { name: "Run ingestion again" }));

    rerun();
    expect(screen.getByText("Run this chapter again?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Run this chapter again?")).toBeNull();

    rerun();
    fireEvent.click(screen.getByRole("button", { name: "Run again" }));
    await waitFor(() => expect(runs).toBe(1));

    // A failed run has nothing to lose: Retry starts straight away.
    fireEvent.click(within(rowFor("SYNTHETIC failed")).getByRole("button", { name: "Retry ingestion" }));
    expect(screen.queryByText("Run this chapter again?")).toBeNull();
    await waitFor(() => expect(runs).toBe(2));
  });

  it("keeps polling while a run is queued or running, and stops when none is", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderRegistry();
    const before = listCalls;
    await act(() => vi.advanceTimersByTimeAsync(LIST_POLL_MS));
    await waitFor(() => expect(listCalls).toBe(before + 1));

    const queuedId = usePartnerStore.getState().subjects.find((x) => x.title === "SYNTHETIC queued")!.id;
    sourcesFixture.setState(queuedId, "ready");
    await act(() => vi.advanceTimersByTimeAsync(LIST_POLL_MS));
    await waitFor(() => expect(within(rowFor("SYNTHETIC queued")).getByText("Ready for your review")).toBeInTheDocument());
    const settled = listCalls;
    await act(() => vi.advanceTimersByTimeAsync(LIST_POLL_MS * 2));
    expect(listCalls).toBe(settled);
  });

  it("shows a processing chapter's phase, stage and percent from the backend's progress", async () => {
    const running = makeSource({
      state: "running",
      chapter: { ordinal: 5, title: "SYNTHETIC running", first_pdf_page: 1, last_pdf_page: 36 },
      progress: { stage: "read_pages", step: 2, steps: 9, done: 12, total: 36, percent: 42.7, updated_at: "2026-10-13T10:00:00Z" },
    });
    sourcesFixture.set(running);
    await renderRegistry();

    const row = rowFor("SYNTHETIC running");
    expect(within(row).getByRole("status")).toHaveTextContent("Reading pages · 12 of 36 pages");
    expect(within(row).getByText("42%")).toBeInTheDocument();
    const bar = within(row).getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
  });

});

describe("SubjectRegistry — ingestion report", () => {
  it("links a chapter that didn't pass checks to a plain-language report", async () => {
    const id = sourcesFixture.get(SYNTHETIC_SOURCE)!.source_id;
    sourcesFixture.set({ ...sourcesFixture.get(id)!, state: "invalid", detail: "the bundle failed validation; see the report" });
    sourcesFixture.setReport(id, SYNTHETIC_REPORT);
    const openIngestedPdf = vi.fn();
    usePartnerStore.setState({ openIngestedPdf });
    await renderRegistry();

    expect(within(rowFor("SYNTHETIC not started")).queryByRole("button", { name: /report|needs fixing/ })).toBeNull();
    fireEvent.click(within(rowFor("SYNTHETIC with visuals")).getByRole("button", { name: "What needs fixing" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/isn't taught by any concept in this chapter: G6-MATH-LO1\.2\.1/)).toBeInTheDocument();
    expect(within(dialog).getByText(/3 textbook figures need to be linked/)).toBeInTheDocument();
    expect(within(dialog).getByText(/You can fix this/)).toBeInTheDocument();
    expect(within(dialog).getAllByText("Concepts")[0].nextSibling).toHaveTextContent("8");
    expect(within(dialog).getByRole("button", { name: /Technical details for GenEd/ })).toBeInTheDocument();
    expect(openIngestedPdf).not.toHaveBeenCalled();
  });
});

describe("SubjectRegistry — visuals", () => {
  it("opens the popup without opening the PDF", async () => {
    const openIngestedPdf = vi.fn();
    usePartnerStore.setState({ openIngestedPdf });
    await renderRegistry();
    fireEvent.click(await screen.findByRole("button", { name: /Review visuals/ }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Open SYNTHETIC shape 1" })).toBeInTheDocument();
    expect(openIngestedPdf).not.toHaveBeenCalled();
  });
});
