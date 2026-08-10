import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { autoResetStore } from "@/test/helpers/resetStores";
import { useStudentStore, type ChatSession } from "@/features/student/store/useStudentStore";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/student/voice/v1",
  useSearchParams: () => new URLSearchParams(),
}));

import { StudentVoiceView } from "../StudentVoiceView";

autoResetStore(useStudentStore);

const VOICE_SESSION = {
  id: "v1",
  title: "Study - Compound Interest",
  agentType: "tutor",
  agentIcon: "📘",
  lastActive: new Date().toISOString(),
  lastTopic: "",
  subject: "mathematics",
  source: "voice",
  // Present so the resume CTA reads "Resume", not the "Restart" variant that
  // missing voice metadata triggers.
  orchestrator_state: {},
} as unknown as ChatSession;

/**
 * Reopening a voice session from the chat sidebar used to flash the fresh-session
 * orb ("Tap to start") while the transcript was still in flight, because
 * hasHistory is false until it lands.
 */
describe("StudentVoiceView while restoring history", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    useStudentStore.setState({
      studentProfile: { user_id: "u1", ai_name: "Nia" },
      activeChat: VOICE_SESSION,
      recentChats: [VOICE_SESSION],
      messages: [],
      isSessionsLoading: false,
      voiceSessionStatus: "idle",
    } as never);
  });

  it("shows a transcript loader instead of the empty-session UI", () => {
    useStudentStore.setState({ isHistoryLoading: true } as never);
    render(<StudentVoiceView />);

    expect(screen.getByText(/Loading transcript/i)).toBeInTheDocument();
    // Neither the fresh-session prompt nor a CTA that depends on the transcript.
    expect(screen.queryByText(/Say hello to get started/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Resume Voice Session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Session Completed/i)).not.toBeInTheDocument();
  });

  it("shows the Resume CTA once the transcript has arrived", () => {
    useStudentStore.setState({
      isHistoryLoading: false,
      messages: [
        { id: "m1", text: "Welcome back.", sender: "ai", timestamp: "10:00" },
      ],
    } as never);
    render(<StudentVoiceView />);

    expect(screen.queryByText(/Loading transcript/i)).not.toBeInTheDocument();
    expect(screen.getByText("Welcome back.")).toBeInTheDocument();
    expect(screen.getByText(/Resume Voice Session/i)).toBeInTheDocument();
  });
});
