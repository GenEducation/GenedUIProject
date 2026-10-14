import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { useStudentStore } from "@/features/student/store/useStudentStore";

import { LearningPreferencesCard } from "../LearningPreferencesCard";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

beforeEach(() => {
  // The card also loads the voice list and language settings; neither matters here.
  server.use(
    http.get(`${BASE}/voices`, () => HttpResponse.json([])),
    http.get(`${BASE}/students/:id/language-preferences`, () => HttpResponse.json({ preferred_language: "en", secondary_languages: [], multilingual_enabled: false })),
  );
  localStorage.setItem("gened_auth_token", "token-synthetic");
  useStudentStore.setState({
    studentProfile: { user_id: "u-synthetic", username: "synthetic", role: "STUDENT", grade: 6 },
    voicePrefs: { ...useStudentStore.getState().voicePrefs, listenMode: "continuous", pttHotkey: "Space" },
  });
});

const rows = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("Learning preferences — voice activation", () => {
  it("keeps the push-to-talk key inside the activation row, so switching modes never grows the card", () => {
    render(<LearningPreferencesCard index={0} />);
    const before = rows();
    expect(screen.getByText("Your tutor listens whenever you speak.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Push to talk" }));
    expect(rows()).toEqual(before); // no extra "Push-to-talk key" row
    expect(screen.queryByText("Your tutor listens whenever you speak.")).toBeNull();
    const key = screen.getByRole("button", { name: /Push-to-talk key: Space/ });
    expect(key.parentElement).toHaveTextContent(/^Hold\s*Space\s*to talk$/);
  });

  it("changes the key from the keycap itself", () => {
    useStudentStore.setState({ voicePrefs: { ...useStudentStore.getState().voicePrefs, listenMode: "ptt" } });
    render(<LearningPreferencesCard index={0} />);
    fireEvent.click(screen.getByRole("button", { name: /Push-to-talk key: Space/ }));
    expect(within(screen.getByRole("button", { name: /Cancel changing/ })).getByText(/Press any key/)).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "t", code: "KeyT" }));
    });
    expect(useStudentStore.getState().voicePrefs.pttHotkey).toBe("KeyT");
    expect(screen.getByRole("button", { name: /Push-to-talk key: T/ })).toBeInTheDocument();
  });
});

const VOICES = [
  { id: "voice_b", label: "Voice B", description: "A clear voice.", sample_url: "/voices/sample/voice_b?language=en&v=b", is_default: false },
  { id: "voice_a", label: "Voice A", description: "A calm voice.", sample_url: "/voices/sample/voice_a?language=en&v=a", is_default: true },
];

describe("Learning preferences — tutor voice (the backend's app voice catalog)", () => {
  beforeEach(() => {
    server.use(http.get(`${BASE}/voices`, () => HttpResponse.json(VOICES)));
  });

  const picker = () => screen.getByRole("combobox", { name: "Tutor voice" });

  it("shows the catalog's default, labelled, for a student who never picked, and can preview it", async () => {
    render(<LearningPreferencesCard index={0} />);
    await waitFor(() => expect(picker()).toHaveTextContent("Voice A (Default)"));
    expect(screen.getByRole("button", { name: "Play a sample of Voice A" })).toBeEnabled();
  });

  it("shows the saved tutor_voice and ignores the MVP's preferred_voice", async () => {
    useStudentStore.setState({
      studentProfile: { ...useStudentStore.getState().studentProfile!, tutor_voice: "voice_b", preferred_voice: "Kore" },
    });
    render(<LearningPreferencesCard index={0} />);
    await waitFor(() => expect(picker()).toHaveTextContent("Voice B"));
  });

  it("shows the default when the saved voice is no longer offered", async () => {
    useStudentStore.setState({ studentProfile: { ...useStudentStore.getState().studentProfile!, tutor_voice: "voice_gone" } });
    render(<LearningPreferencesCard index={0} />);
    await waitFor(() => expect(picker()).toHaveTextContent("Voice A (Default)"));
  });

  it("saves a pick as tutor_voice, never as preferred_voice", async () => {
    let sent: unknown;
    server.use(
      http.patch(`${BASE}/auth/profile`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ access_token: "token-next", user_id: "u-synthetic", tutor_voice: "voice_b" });
      }),
    );
    render(<LearningPreferencesCard index={0} />);
    await waitFor(() => expect(picker()).toHaveTextContent("Voice A (Default)"));
    fireEvent.click(picker());
    fireEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: /Voice B/ }));
    await waitFor(() => expect(useStudentStore.getState().studentProfile?.tutor_voice).toBe("voice_b"));
    expect(sent).toEqual({ user_id: "u-synthetic", tutor_voice: "voice_b" });
    expect(picker()).toHaveTextContent("Voice B");
  });
});
