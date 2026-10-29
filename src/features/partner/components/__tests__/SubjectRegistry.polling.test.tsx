import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { makeSource, sourcesFixture } from "@/test/msw/handlers/sources";
import { visualsFixture } from "@/test/msw/handlers/visuals";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
vi.mock("../IngestedPdfViewer", () => ({ IngestedPdfViewer: () => null }));

import { SubjectRegistry, RUN_POLL_MS } from "../SubjectRegistry";

const running = makeSource({
  source_id: "synthetic-polled",
  state: "running",
  chapter: { ordinal: 1, title: "SYNTHETIC polled", first_pdf_page: 1, last_pdf_page: 1 },
  progress: { stage: "render", step: 1, steps: 9, done: 0, total: 0, percent: 5, updated_at: new Date().toISOString() },
});

const realFetch = usePartnerStore.getState().fetchSubjects;

beforeEach(() => {
  visualsFixture.reset();
  sourcesFixture.reset(() => [running]);
  usePartnerStore.setState({ subjects: [], subjectFilters: {}, subjectsError: null, subjectsFailures: 0, fetchSubjects: realFetch });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
  usePartnerStore.setState({ fetchSubjects: realFetch });
});

describe("SubjectRegistry — polling", () => {
  it("says it can't reach GenEd while list reads fail", async () => {
    usePartnerStore.setState({ subjectsError: "Failed to fetch", subjectsFailures: 2, fetchSubjects: vi.fn(async () => {}) });
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    expect(screen.getByText(/Can't reach GenEd, retrying/)).toBeInTheDocument();
  });

  it("skips ticks while the tab is hidden and polls in the background when visible", async () => {
    render(<SubjectRegistry onUploadClick={vi.fn()} />);
    await screen.findByText("SYNTHETIC polled");
    vi.useFakeTimers();
    const fetchSubjects = vi.fn(async () => {});
    act(() => usePartnerStore.setState({ fetchSubjects }));
    fetchSubjects.mockClear(); // the mount read re-runs with the new function

    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    await act(async () => { vi.advanceTimersByTime(RUN_POLL_MS * 3); });
    expect(fetchSubjects).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    await act(async () => { vi.advanceTimersByTime(RUN_POLL_MS); });
    expect(fetchSubjects).toHaveBeenCalledWith({ background: true });
  });
});
