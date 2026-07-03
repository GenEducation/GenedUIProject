import { describe, it, expect, beforeEach } from "vitest";
import { http } from "msw";

import { server } from "@/test/msw/server";
import { makeSseResponse } from "@/test/helpers/sse";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useStudentStore } from "@/features/student/store/useStudentStore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

autoResetStore(useStudentStore);

/** Register an SSE stream for the chat endpoint from the given frames. */
function streamChat(frames: string[]) {
  server.use(http.post(`${BASE}/text/april-query`, () => makeSseResponse(frames)));
}

const chunk = (text: string) => JSON.stringify({ type: "chunk", text });
const done = JSON.stringify({ type: "done", status: "success" });

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("student");
  useStudentStore.getState().setStudentProfile({
    user_id: "u_student",
    username: "ada",
    role: "student",
    grade: 6,
    ai_name: "Aanya",
  } as never);
});

describe("chat send/receive (integration)", () => {
  it("adds the user bubble optimistically before the stream resolves", () => {
    streamChat([chunk("Hi"), done]);

    // Fire the send but don't await — the user message is pushed synchronously.
    void useStudentStore.getState().sendMessage("What is photosynthesis?", undefined, { isTypedQuery: true });

    const user = useStudentStore.getState().messages.find((m) => m.sender === "user");
    expect(user?.text).toBe("What is photosynthesis?");
  });

  it("accumulates streamed chunks into a single assistant message", async () => {
    streamChat([chunk("Hel"), chunk("lo"), done]);

    await useStudentStore.getState().sendMessage("hi", undefined, { isTypedQuery: true });

    const ai = useStudentStore.getState().messages.find((m) => m.sender === "ai");
    expect(ai?.text).toBe("Hello");
  });

  it("clears the typing flag once the done frame arrives", async () => {
    streamChat([chunk("Done"), done]);

    await useStudentStore.getState().sendMessage("hi", undefined, { isTypedQuery: true });

    expect(useStudentStore.getState().isAITyping).toBe(false);
  });
});
