import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { autoResetStore } from "@/test/helpers/resetStores";
import { useStudentStore, type ChatSession } from "@/features/student/store/useStudentStore";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

import { StudentChatSidebar } from "../StudentChatSidebar";

autoResetStore(useStudentStore);

const SESSIONS = [
  {
    id: "v1",
    title: "Study - Compound Interest",
    agentType: "tutor",
    agentIcon: "📘",
    lastActive: new Date().toISOString(),
    lastTopic: "",
    subject: "mathematics",
    source: "voice",
  },
  {
    id: "c1",
    title: "Study - Simple Interest",
    agentType: "tutor",
    agentIcon: "📘",
    lastActive: new Date().toISOString(),
    lastTopic: "",
    subject: "mathematics",
    source: "webapp",
  },
] as unknown as ChatSession[];

function seed(extra: Record<string, unknown> = {}) {
  useStudentStore.setState({
    recentChats: SESSIONS,
    isSessionsLoading: false,
    ...extra,
  } as never);
}

function renderSidebar() {
  return render(
    <StudentChatSidebar activeChatId="c1" isOpen onClose={vi.fn()} />,
  );
}

describe("StudentChatSidebar", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    seed();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists both voice and chat sessions — the sidebar is no longer split by modality", () => {
    renderSidebar();
    expect(screen.getByText("Study - Compound Interest")).toBeInTheDocument();
    expect(screen.getByText("Study - Simple Interest")).toBeInTheDocument();
  });

  it("marks each row with its modality badge", () => {
    renderSidebar();
    expect(screen.getByTitle("Voice session")).toBeInTheDocument();
    expect(screen.getByTitle("Chat session")).toBeInTheDocument();
  });

  it("routes a voice session to the voice route and a chat session to the chat route", () => {
    renderSidebar();

    fireEvent.click(screen.getByText("Study - Compound Interest"));
    expect(routerMock.push).toHaveBeenCalledWith("/student/voice/v1");

    fireEvent.click(screen.getByText("Study - Simple Interest"));
    expect(routerMock.push).toHaveBeenCalledWith("/student/chat/c1");
  });

  it("confirms before leaving a live voice call for a chat session, and stays put on cancel", () => {
    seed({ voiceSessionStatus: "active" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderSidebar();

    fireEvent.click(screen.getByText("Study - Simple Interest"));
    expect(confirm).toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("does not confirm when the live call is only switching to another voice session", () => {
    seed({ voiceSessionStatus: "active" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderSidebar();

    fireEvent.click(screen.getByText("Study - Compound Interest"));
    expect(confirm).not.toHaveBeenCalled();
    expect(routerMock.push).toHaveBeenCalledWith("/student/voice/v1");
  });
});
