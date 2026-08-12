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
});
