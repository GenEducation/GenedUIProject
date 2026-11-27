import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("StudentHome — recent chapters", () => {
  it("continues the latest chapter in progress, and puts each subject's last chapter on its card (no separate list)", async () => {
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
    // the hero says which chapter it is, and how far along, in steps
    expect(screen.getByText("Mathematics · Chapter 2")).toBeInTheDocument();
    expect(screen.getByText(/^3 of 9 steps/)).toBeInTheDocument();
    expect(screen.queryByText("Revisiting")).toBeNull();
    expect(screen.queryByText(/learning goal/i)).toBeNull();

    // no recent list on the dashboard any more: each subject card says where the student left off, and reopens it
    expect(screen.queryByRole("heading", { name: "Recent chapters" })).toBeNull();
    expect(screen.getByRole("button", { name: "Resume SYNTHETIC finished" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume SYNTHETIC older" })).toBeInTheDocument();

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

  it("reopens a finished chapter's own lesson for review from its subject card", async () => {
    const finished = makeRecentChapter(1, { chapter_title: "SYNTHETIC finished", state: "completed" });
    learnerFixture.setRecent([finished]);
    render(<StudentHome />);

    fireEvent.click(await screen.findByRole("button", { name: "Resume SYNTHETIC finished" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/student/lesson/${finished.instance_id}`));
    expect(lastOpenedChapter).toBeNull();
  });

  it("starts an abandoned chapter afresh", async () => {
    const abandoned = makeRecentChapter(4, { chapter_title: "SYNTHETIC abandoned", state: "abandoned" });
    learnerFixture.setRecent([abandoned]);
    render(<StudentHome />);

    fireEvent.click(await screen.findByRole("button", { name: "Resume SYNTHETIC abandoned" }));
    await waitFor(() => expect(lastOpenedChapter).toBe(abandoned.chapter_id));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/student\/lesson\/11111111-/)));
  });

  it("invites a new student to start, and offers a retry when the list can't load", async () => {
    const { unmount } = render(<StudentHome />);
    expect(await screen.findByText(/No chapters yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue Learning/ })).toBeNull();
    unmount();

    server.use(http.get(`${BASE}/v1/learner/recent-chapters`, () => HttpResponse.json({ message: "SYNTHETIC down" }, { status: 500 }), { once: true }));
    render(<StudentHome />);
    expect(await screen.findByText("We couldn't load your chapter")).toBeInTheDocument();
    learnerFixture.setRecent([makeRecentChapter(1, { state: "completed", chapter_title: "SYNTHETIC back" })]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Resume SYNTHETIC back" })).toBeInTheDocument();
  });
});
