import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
  { id: "voice_c", label: "Voice C", description: "An AI tutor voice: female.", sample_url: "/voices/sample/voice_c?language=en&v=c", is_default: false },
  { id: "voice_b", label: "Voice B", description: "An AI tutor voice: female.", sample_url: "/voices/sample/voice_b?language=en&v=b", is_default: false },
  { id: "voice_a", label: "Voice A", description: "An AI tutor voice: male.", sample_url: "/voices/sample/voice_a?language=en&v=a", is_default: true },
];

describe("Learning preferences — tutor voice catalogue (the backend's app voices)", () => {
  let played: string[];
  let patches: unknown[];

  beforeEach(() => {
    played = [];
    patches = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      played.push(this.src);
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    server.use(
      http.get(`${BASE}/voices`, () => HttpResponse.json(VOICES)),
      http.patch(`${BASE}/auth/profile`, async ({ request }) => {
        const body = (await request.json()) as { tutor_voice?: string };
        patches.push(body);
        return HttpResponse.json({ access_token: "token-next", user_id: "u-synthetic", tutor_voice: body.tutor_voice });
      }),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  const openCatalogue = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Change voice" }));
    return screen.findByRole("radiogroup", { name: "Tutor voices" });
  };

  it("shows the catalogue's default, labelled, for a student who never picked, and can preview it", async () => {
    render(<LearningPreferencesCard index={0} />);
    expect(await screen.findByText("Voice A (Default)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play a sample of Voice A" }));
    expect(played).toEqual([expect.stringContaining("/voices/sample/voice_a")]);
    expect(patches).toEqual([]);
  });

  it("lists every voice with its own preview, and hearing one never saves it", async () => {
    render(<LearningPreferencesCard index={0} />);
    const list = await openCatalogue();
    expect(within(list).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual([
      "Voice A (Default)",
      "Voice B",
      "Voice C",
    ]); // alphabetical, as the catalogue service sorts it
    expect(within(list).getByRole("radio", { name: "Voice A (Default)" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(list).getByRole("button", { name: "Play a sample of Voice C" }));
    fireEvent.click(within(list).getByRole("button", { name: "Play a sample of Voice B" }));
    expect(played).toEqual([expect.stringContaining("voice_c"), expect.stringContaining("voice_b")]);
    expect(within(list).getByRole("button", { name: "Stop the sample of Voice B" })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: "Play a sample of Voice C" })).toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it("choosing a voice saves it as tutor_voice, never preferred_voice, and marks it chosen", async () => {
    render(<LearningPreferencesCard index={0} />);
    const list = await openCatalogue();
    fireEvent.click(within(list).getByRole("radio", { name: "Voice C" }));
    await waitFor(() => expect(useStudentStore.getState().studentProfile?.tutor_voice).toBe("voice_c"));
    expect(patches).toEqual([{ user_id: "u-synthetic", tutor_voice: "voice_c" }]);
    expect(within(list).getByRole("radio", { name: "Voice C" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("radiogroup", { name: "Tutor voices" })).toBeNull());
    expect(screen.getByText("Voice C")).toBeInTheDocument();
  });

  it("shows the saved tutor_voice and ignores the MVP's preferred_voice", async () => {
    useStudentStore.setState({
      studentProfile: { ...useStudentStore.getState().studentProfile!, tutor_voice: "voice_b", preferred_voice: "Kore" },
    });
    render(<LearningPreferencesCard index={0} />);
    expect(await screen.findByText("Voice B")).toBeInTheDocument();
  });

  it("shows the default when the saved voice is no longer offered", async () => {
    useStudentStore.setState({ studentProfile: { ...useStudentStore.getState().studentProfile!, tutor_voice: "voice_gone" } });
    render(<LearningPreferencesCard index={0} />);
    expect(await screen.findByText("Voice A (Default)")).toBeInTheDocument();
  });

  it("says so when a save fails, and keeps the previous voice", async () => {
    server.use(http.patch(`${BASE}/auth/profile`, () => HttpResponse.json({ message: "Unsupported tutor voice" }, { status: 422 })));
    render(<LearningPreferencesCard index={0} />);
    const list = await openCatalogue();
    fireEvent.click(within(list).getByRole("radio", { name: "Voice B" }));
    expect(await screen.findByText(/Unsupported tutor voice|Profile update failed/)).toBeInTheDocument();
    expect(within(list).getByRole("radio", { name: "Voice A (Default)" })).toHaveAttribute("aria-checked", "true");
  });
});
