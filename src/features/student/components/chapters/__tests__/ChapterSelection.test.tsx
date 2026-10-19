import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { chapterListReads, lastOpenedChapter, learnerFixture, makeChapter } from "@/test/msw/handlers/learner";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }) }));
vi.mock("framer-motion", async () =>
  (await import("@/features/partner/components/visuals/__tests__/framerPassthrough")).framerPassthrough(),
);
vi.mock("@/features/student/components/StudentHomeSidebar", () => ({ StudentHomeSidebar: () => null }));
vi.mock("@/components/student/SidebarToggle", () => ({ SidebarToggle: () => null }));

import { ChapterSelection } from "../ChapterSelection";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

beforeEach(() => {
  learnerFixture.reset();
  push.mockReset();
  useLessonLaunch.setState({ instanceId: null, chapter: null, subject: null });
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

const tile = (n: number, title: string) => screen.findByRole("button", { name: `Chapter ${n}: ${title}` });

describe("ChapterSelection", () => {
  it("shows each chapter as a tile: the cover card when accepted, the palette gradient otherwise", async () => {
    render(<ChapterSelection subject="Mathematics" />);
    const withCard = await tile(1, "SYNTHETIC chapter 1");
    const withoutCard = await tile(2, "SYNTHETIC chapter 2");

    const img = within(withCard).getByTestId("chapter-card-image");
    expect(img.getAttribute("src")).toBe(`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || ""}/v1/visual-images/card-1?exp=1&sig=synthetic`);
    expect(within(withoutCard).getByTestId("chapter-card-fallback")).toBeInTheDocument();
    // The card carries its own title (the card kit sets it); the app sets one only on the gradient.
    expect(within(withCard).queryByText("SYNTHETIC chapter 1")).toBeNull();
    expect(within(withoutCard).getByText("SYNTHETIC chapter 2")).toBeInTheDocument();
    expect(within(withoutCard).queryByTestId("chapter-card-image")).toBeNull();

    expect(screen.getByText("Grade 6")).toBeInTheDocument();
    expect(screen.getByText("3 chapters ready")).toBeInTheDocument();
  });

  it("groups the chapters by book when there is more than one", async () => {
    render(<ChapterSelection subject="Mathematics" />);
    const second = await screen.findByRole("region", { name: "SYNTHETIC Second Book" });
    expect(within(second).getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "SYNTHETIC Book" })).toBeInTheDocument();
  });

  it("does not group a single book", async () => {
    learnerFixture.reset(() => [makeChapter(), makeChapter()]);
    render(<ChapterSelection subject="Mathematics" />);
    await tile(1, "SYNTHETIC chapter 1");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("says so when the school has published nothing for the subject", async () => {
    render(<ChapterSelection subject="Science" />);
    expect(await screen.findByText("No chapters yet")).toBeInTheDocument();
    expect(screen.getByText(/hasn't published any Science chapters/)).toBeInTheDocument();
  });

  it("shows the server's reason when the list fails, and retries", async () => {
    server.use(
      http.get(`${BASE}/v1/learner/chapters`, () => HttpResponse.json({ message: "SYNTHETIC: list unavailable." }, { status: 500 }), { once: true }),
    );
    render(<ChapterSelection subject="Mathematics" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("SYNTHETIC: list unavailable.");
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await tile(1, "SYNTHETIC chapter 1")).toBeInTheDocument();
  });

  it("opens the lesson for a tile and goes to it", async () => {
    render(<ChapterSelection subject="Mathematics" />);
    fireEvent.click(await tile(2, "SYNTHETIC chapter 2"));

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    const chapter2 = "00000000-0000-4000-8000-000000000002";
    expect(lastOpenedChapter).toBe(chapter2);
    const instanceId = `11111111-0000-4000-8000-${chapter2.slice(-12)}`;
    expect(push).toHaveBeenCalledWith(`/student/lesson/${instanceId}`);
    expect(useLessonLaunch.getState()).toMatchObject({ instanceId, subject: "Mathematics", chapter: { title: "SYNTHETIC chapter 2" } });
  });

  it("keeps the student on the page with the reason when a chapter can't be opened", async () => {
    server.use(
      http.post(`${BASE}/v1/chapters/:id/instances`, () => HttpResponse.json({ message: "SYNTHETIC: not available." }, { status: 404 })),
    );
    render(<ChapterSelection subject="Mathematics" />);
    const t = await tile(1, "SYNTHETIC chapter 1");
    fireEvent.click(t);
    expect(await screen.findByRole("alert")).toHaveTextContent("SYNTHETIC: not available.");
    expect(push).not.toHaveBeenCalled();
    expect(t).toBeEnabled();
  });

  it("refetches the list once when a card fails (expired signature), then shows the gradient", async () => {
    render(<ChapterSelection subject="Mathematics" />);
    const t = await tile(1, "SYNTHETIC chapter 1");
    const reads = chapterListReads;

    fireEvent.error(within(t).getByTestId("chapter-card-image"));
    await waitFor(() => expect(chapterListReads).toBe(reads + 1));
    // The same URL came back: the gradient stays, and no second refetch.
    const again = await tile(1, "SYNTHETIC chapter 1");
    expect(within(again).getByTestId("chapter-card-fallback")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(chapterListReads).toBe(reads + 1);
  });
});
