import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { learnerFixture, lastOpenedChapter, lastRecentLimit, makeRecentChapter } from "@/test/msw/handlers/learner";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { resetSubjectCatalogForTests } from "@/features/subjects/subjectCatalog";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }) }));
vi.mock("framer-motion", async () =>
  (await import("@/features/partner/components/visuals/__tests__/framerPassthrough")).framerPassthrough(),
);
vi.mock("@/features/student/components/StudentHomeSidebar", () => ({ StudentHomeSidebar: () => null }));
vi.mock("@/components/NotificationBell", () => ({ NotificationBell: () => null }));

import { StudentHome } from "../StudentHome";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const fetchSessions = vi.fn(async () => {});

beforeEach(() => {
  push.mockReset();
  fetchSessions.mockClear();
  resetSubjectCatalogForTests();
  learnerFixture.reset();
  useLessonLaunch.setState({ instanceId: null, chapter: null, subject: null });
  localStorage.setItem("gened_auth_token", "token-synthetic");
  useStudentStore.setState({
    studentProfile: { user_id: "u-synthetic", username: "synthetic", role: "STUDENT", grade: 6, school_board: "CBSE" },
    recentChats: [],
    availableAgents: [],
    fetchSessions,
    fetchAvailableAgents: vi.fn(async () => {}),
    fetchStudentStats: vi.fn(async () => {}),
  });
});

const recentSection = () => screen.getByRole("heading", { name: "Recent chapters" }).closest("div")!.parentElement!;

describe("StudentHome — recent chapters", () => {
  it("continues the latest chapter in progress, and lists the others without the old session list", async () => {
    learnerFixture.setRecent([
      makeRecentChapter(1, { chapter_title: "SYNTHETIC finished", state: "completed", nodes_done: 11, nodes_total: 11 }),
      makeRecentChapter(2, { chapter_title: "SYNTHETIC in progress", nodes_done: 3, nodes_total: 9 }),
      makeRecentChapter(3, { chapter_title: "SYNTHETIC older", subject: "science", palette: "science:1" }),
    ]);
    render(<StudentHome />);

    // Continue learning: the most recent chapter still in progress, not the finished one above it.
    const continueBtn = await screen.findByRole("button", { name: /Continue Learning/ });
    expect(screen.getByText("SYNTHETIC in progress")).toBeInTheDocument();
    expect(continueBtn).toBeInTheDocument();
    // a chapter they already started: "pick up", with when they last studied it
    expect(screen.getByText("Pick up where you left off")).toBeInTheDocument();
    expect(screen.getByText("· 2h ago")).toBeInTheDocument();
    expect(screen.queryByText(/learning goal/i)).toBeNull();

    const list = recentSection();
    expect(within(list).getByRole("button", { name: /SYNTHETIC finished, Mathematics, finished/ })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: /SYNTHETIC older, Science, 33% done/ })).toBeInTheDocument();
    // the chapter in the Continue card isn't listed twice
    expect(within(list).queryByText("SYNTHETIC in progress")).toBeNull();

    expect(lastRecentLimit).toBe(20);
    expect(fetchSessions).not.toHaveBeenCalled(); // the deprecated session list isn't read any more
  });

  it("resumes a chapter's own lesson, handing the lesson page its title and subject", async () => {
    const chapter = makeRecentChapter(2, { chapter_title: "SYNTHETIC in progress" });
    learnerFixture.setRecent([chapter]);
    render(<StudentHome />);

    fireEvent.click(await screen.findByRole("button", { name: /Continue Learning/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/student/lesson/${chapter.instance_id}`));
    expect(useLessonLaunch.getState()).toMatchObject({
      instanceId: chapter.instance_id,
      subject: "Mathematics",
      chapter: { title: "SYNTHETIC in progress", number: 2 },
    });
    expect(lastOpenedChapter).toBeNull(); // no new lesson opened
  });

  it("reopens a finished chapter's own lesson for review", async () => {
    const finished = makeRecentChapter(1, { chapter_title: "SYNTHETIC finished", state: "completed" });
    learnerFixture.setRecent([finished]);
    render(<StudentHome />);

    fireEvent.click(await screen.findByRole("button", { name: /SYNTHETIC finished/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/student/lesson/${finished.instance_id}`));
    expect(lastOpenedChapter).toBeNull();
  });

  it("starts an abandoned chapter afresh", async () => {
    const abandoned = makeRecentChapter(4, { chapter_title: "SYNTHETIC abandoned", state: "abandoned" });
    learnerFixture.setRecent([abandoned]);
    render(<StudentHome />);

    fireEvent.click(await screen.findByRole("button", { name: /SYNTHETIC abandoned/ }));
    await waitFor(() => expect(lastOpenedChapter).toBe(abandoned.chapter_id));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/student\/lesson\/11111111-/)));
  });

  it("shows a chapter's cover card, or its palette until it has one", async () => {
    learnerFixture.setRecent([
      makeRecentChapter(1, { state: "completed", card: { image_url: "/v1/visual-images/card-9?exp=1&sig=synthetic", width: 1024, height: 576 } }),
      makeRecentChapter(3, { state: "completed" }),
    ]);
    render(<StudentHome />);
    const img = await screen.findByTestId("recent-chapter-card");
    expect(img.getAttribute("src")).toMatch(/\/v1\/visual-images\/card-9\?exp=1&sig=synthetic$/);
    expect(screen.getAllByTestId("recent-chapter-fallback")).toHaveLength(1);
  });

  it("invites a new student to start, and offers a retry when the list can't load", async () => {
    const { unmount } = render(<StudentHome />);
    expect(await screen.findByText(/No chapters yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue Learning/ })).toBeNull();
    unmount();

    server.use(http.get(`${BASE}/v1/learner/recent-chapters`, () => HttpResponse.json({ message: "SYNTHETIC down" }, { status: 500 }), { once: true }));
    render(<StudentHome />);
    expect(await screen.findByText("Your recent chapters couldn't load.")).toBeInTheDocument();
    learnerFixture.setRecent([makeRecentChapter(1, { state: "completed", chapter_title: "SYNTHETIC back" })]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("SYNTHETIC back")).toBeInTheDocument();
  });
});
