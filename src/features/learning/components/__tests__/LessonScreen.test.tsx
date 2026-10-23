import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { LESSON_ID, lessonFixture } from "@/test/msw/handlers/lesson";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { useLessonStore } from "../../useLessonStore";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/student/lesson/x" }));
import { LessonScreen } from "../LessonScreen";

/** Pretend to be a given screen: "portrait" (phone upright) or "compact" (< 1024px). */
function mockViewport(kind: "portrait" | "compact") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: kind === "portrait" ? true : query.includes("1023px"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

afterEach(() => {
  // @ts-expect-error -- jsdom has no matchMedia; tests that need one add it.
  delete window.matchMedia;
  sessionStorage.clear();
});

beforeEach(() => {
  lessonFixture.reset();
  useLessonStore.getState().reset();
  useLessonLaunch.setState({ instanceId: null, chapter: null, subject: null });
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe("LessonScreen", () => {
  it("shows where you are, the session clock, and the three panels", async () => {
    useLessonLaunch.setState({
      instanceId: LESSON_ID,
      subject: "Mathematics",
      chapter: { chapter_id: "c", source_id: "s", number: 2, title: "SYNTHETIC chapter 2", book_title: "B", palette: "mathematics:1", card: null },
    });
    render(<LessonScreen instanceId={LESSON_ID} />);

    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Mathematics" })).toHaveAttribute("href", "/student/subjects/Mathematics");
    expect(within(crumbs).getByText("SYNTHETIC chapter 2")).toHaveAttribute("aria-current", "page");
    // No student signed in here, so the chapter clock has nothing to read yet.
    expect(screen.getByRole("timer")).toHaveAccessibleName("Chapter time loading");
    expect(screen.getByRole("link", { name: "Leave lesson" })).toHaveAttribute("href", "/student/subjects/Mathematics");

    expect(screen.getByRole("region", { name: "Whiteboard" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Chat with your tutor" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "SYNTHETIC node 2" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Steps completed" })).toHaveAttribute("aria-valuenow", "1");
    // The tutor opens a fresh node in the chat, and only there.
    expect(await within(screen.getByRole("region", { name: "Chat with your tutor" })).findByText("SYNTHETIC reply.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Whiteboard" })).queryByText("SYNTHETIC reply.")).toBeNull();
  });

  it("shows one clock: this chapter's time from the server, so a refresh or another tab continues it", async () => {
    useStudentStore.setState({ studentProfile: { user_id: "00000000-0000-4000-8000-0000000000bb" } as never });
    render(<LessonScreen instanceId={LESSON_ID} />);
    // 12.4 credited minutes = 12:24, counting on from there.
    await waitFor(() => expect(screen.getByRole("timer")).toHaveAccessibleName(/^Chapter time 12:2\d$/));
    expect(screen.getAllByRole("timer")).toHaveLength(1);
    expect(screen.queryByText("Session time")).toBeNull();
    useStudentStore.setState({ studentProfile: null });
  });

  it("on a phone held upright, goes straight to the landscape lesson, turned to fill the screen", () => {
    mockViewport("portrait");
    const { unmount } = render(<LessonScreen instanceId={LESSON_ID} />);
    // no prompt, no portrait tabs: the same board and chat side by side as a phone held sideways
    expect(screen.queryByText("Turn your phone sideways")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("region", { name: "Whiteboard" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Chat with your tutor" })).toBeInTheDocument();
    // jsdom's 1024 × 768 window, held "upright": laid out 768 wide × 1024 tall, turned to fill the screen
    const root = document.querySelector('[data-orientation="turned"]') as HTMLElement;
    expect(root.style.transform).toBe("translateX(1024px) rotate(90deg) scale(1)");
    expect(root.style.width).toBe("768px");
    expect(root.style.height).toBe("1024px");
    // dragging code is told the screen is turned, and untold when the lesson closes
    expect(document.documentElement.dataset.lessonRotated).toBe("true");
    unmount();
    expect(document.documentElement.dataset.lessonRotated).toBeUndefined();
  });

  it("Voice opens voice mode and Chat goes back to typing", () => {
    render(<LessonScreen instanceId={LESSON_ID} />);
    expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    expect(screen.getByRole("button", { name: "Voice" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers a retry when the lesson can't be read", async () => {
    render(<LessonScreen instanceId="not-this-lesson" />);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
    await waitFor(() => expect(within(alert).getByRole("link", { name: "Back to chapters" })).toHaveAttribute("href", "/student"));
  });
});
