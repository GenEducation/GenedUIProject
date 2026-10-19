import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { LESSON_ID, lessonFixture } from "@/test/msw/handlers/lesson";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { useLessonStore } from "../../useLessonStore";
import { formatDuration } from "../../useSessionTimer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/student/lesson/x" }));
import { LessonScreen } from "../LessonScreen";

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
    expect(screen.getByRole("timer")).toHaveAccessibleName("Session time 00:00");
    expect(screen.getByRole("link", { name: "Leave lesson" })).toHaveAttribute("href", "/student/subjects/Mathematics");

    expect(screen.getByRole("region", { name: "Whiteboard" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Chat with your tutor" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "SYNTHETIC node 2" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Steps completed" })).toHaveAttribute("aria-valuenow", "1");
    // The tutor opens a fresh node in the chat, and only there.
    expect(await within(screen.getByRole("region", { name: "Chat with your tutor" })).findByText("SYNTHETIC reply.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Whiteboard" })).queryByText("SYNTHETIC reply.")).toBeNull();
  });

  it("without launch info, falls back to a generic heading and exits home", () => {
    render(<LessonScreen instanceId={LESSON_ID} />);
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("Lesson")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leave lesson" })).toHaveAttribute("href", "/student");
  });

  it("switches panels with the mobile tabs", () => {
    render(<LessonScreen instanceId={LESSON_ID} />);
    const chatTab = screen.getByRole("tab", { name: "Chat" });
    expect(screen.getByRole("tab", { name: "Whiteboard" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(chatTab);
    expect(chatTab).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("lesson-pane-chat")?.className).toMatch(/(^| )flex( |$)/);
    expect(document.getElementById("lesson-pane-board")?.className).toMatch(/(^| )hidden( |$)/);
  });

  it("Voice opens voice mode, which says voice isn't available while it's switched off", async () => {
    render(<LessonScreen instanceId={LESSON_ID} />);
    expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    expect(screen.getByRole("button", { name: "Voice" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("Voice lessons aren't available yet. You can keep going in the chat.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to typing" }));
    expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers a retry when the lesson can't be read", async () => {
    render(<LessonScreen instanceId="not-this-lesson" />);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
    await waitFor(() => expect(within(alert).getByRole("link", { name: "Back to chapters" })).toHaveAttribute("href", "/student"));
  });
});

describe("formatDuration", () => {
  it("pads minutes and seconds, and adds hours past one", () => {
    expect(formatDuration(75)).toBe("01:15");
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});
