import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchVoices } from "../voiceCatalogService";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchVoices", () => {
  it("sorts provider voices alphabetically for presentation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "Zephyr", label: "Zephyr", description: "Bright", sample_url: "/z" },
        { id: "Aoede", label: "Aoede", description: "Breezy", sample_url: "/a" },
      ],
    }));

    const voices = await fetchVoices();

    expect(voices.map((voice) => voice.id)).toEqual(["Aoede", "Zephyr"]);
  });

  it("keeps the backend's default flag and makes a relative sample URL absolute", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "voice_a", label: "Voice A", description: "Calm", sample_url: "/voices/sample/voice_a?language=en&v=1", is_default: true },
        { id: "voice_b", label: "Voice B", description: "Clear", sample_url: "https://cdn.test/b.wav" },
      ],
    }));

    const [a, b] = await fetchVoices();

    expect(a.is_default).toBe(true);
    expect(b.is_default).toBe(false);
    expect(a.sample_url).toMatch(/^https?:\/\/.+\/voices\/sample\/voice_a\?language=en&v=1$/);
    expect(b.sample_url).toBe("https://cdn.test/b.wav");
  });
});
