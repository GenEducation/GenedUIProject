import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { autoResetStore } from "@/test/helpers/resetStores";

const authFetchMock = vi.hoisted(() => vi.fn());
const restoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/utils/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/features/student/services/studentService", () => ({
  studentService: {
    fetchVoiceSessionRestore: restoreMock,
    fetchSessions: vi.fn().mockResolvedValue([]),
  },
}));

import { useStudentStore, type ChatSession } from "../useStudentStore";

autoResetStore(useStudentStore);

const session = (id: string, source: string) =>
  ({
    id,
    title: `Session ${id}`,
    agentType: "tutor",
    agentIcon: "📘",
    lastActive: new Date().toISOString(),
    lastTopic: "",
    source,
  }) as unknown as ChatSession;

/**
 * The sidebar now lists both modalities, so fetchChatHistory is routinely called
 * while the URL still points at the *other* surface — router.push has not settled
 * yet. Modality must come from the session, not window.location.
 */
describe("fetchChatHistory endpoint selection", () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    restoreMock.mockReset();
    authFetchMock.mockResolvedValue({ json: async () => ({ history: [] }) });
    restoreMock.mockResolvedValue({ history: [] });

    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { pathname: "/student/voice/v1", href: "http://localhost/" },
    });

    useStudentStore.setState({
      studentProfile: { user_id: "u1" },
      recentChats: [session("c1", "webapp"), session("v1", "voice")],
    } as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it("uses the text history endpoint for a chat session opened from the voice view", async () => {
    await useStudentStore.getState().fetchChatHistory("c1");

    expect(restoreMock).not.toHaveBeenCalled();
    expect(authFetchMock).toHaveBeenCalledOnce();
    expect(authFetchMock.mock.calls[0][0]).toContain("/get-history");
  });

  it("uses the voice restore endpoint for a voice session opened from the chat view", async () => {
    window.location.pathname = "/student/chat/c1";

    await useStudentStore.getState().fetchChatHistory("v1");

    expect(restoreMock).toHaveBeenCalledWith("v1", expect.anything());
    expect(authFetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the URL for a session that isn't in recentChats yet (cold load)", async () => {
    useStudentStore.setState({ recentChats: [] } as never);

    await useStudentStore.getState().fetchChatHistory("unknown");

    expect(restoreMock).toHaveBeenCalledOnce();
  });

  it("flags isHistoryLoading for the duration of the fetch", async () => {
    let seen: boolean | undefined;
    restoreMock.mockImplementation(async () => {
      seen = useStudentStore.getState().isHistoryLoading;
      return { history: [] };
    });

    await useStudentStore.getState().fetchChatHistory("v1");

    expect(seen).toBe(true);
    expect(useStudentStore.getState().isHistoryLoading).toBe(false);
  });
});
