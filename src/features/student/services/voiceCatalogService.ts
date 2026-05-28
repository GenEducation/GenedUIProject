import type { GeminiVoice } from "@/constants/geminiVoices";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/**
 * Pull the tutor voice catalog from the backend.
 *
 * Endpoint is intentionally public (no auth) so the catalog + previews work
 * for an `<audio src=...>` tag without juggling Authorization headers. The
 * payload contains only generic preview metadata, no user data.
 *
 * Relative `sample_url` values returned by the BE are rewritten to absolute
 * URLs here so the audio element can play them as-is.
 */
export async function fetchVoices(): Promise<GeminiVoice[]> {
  const res = await fetch(`${API_BASE_URL}/voices`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Failed to load voice catalog: ${res.status}`);
  }
  const list = (await res.json()) as Array<{
    id: string;
    label: string;
    description: string;
    sample_url: string;
  }>;
  return list.map((v) => ({
    ...v,
    sample_url:
      v.sample_url.startsWith("http://") || v.sample_url.startsWith("https://")
        ? v.sample_url
        : `${API_BASE_URL}${v.sample_url}`,
  }));
}
