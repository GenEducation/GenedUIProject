let p5SourceCache: string | null = null;
let p5LoadPromise: Promise<string> | null = null;

/**
 * Fetches the p5.min.js library from CDN and returns its source code.
 * This ensures the iframe can load the script without external network requests 
 * and prevents CORS/sandbox issues when injected inline.
 */
export async function getP5Source(): Promise<string> {
  if (p5SourceCache) {
    return p5SourceCache;
  }

  if (p5LoadPromise) {
    return p5LoadPromise;
  }

  p5LoadPromise = fetch("https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load p5.js from CDN");
      return res.text();
    })
    .then((p5Source) => {
      p5SourceCache = p5Source;
      return p5Source;
    })
    .catch((error) => {
      console.error("Error loading p5.js:", error);
      p5LoadPromise = null;
      throw error;
    });

  return p5LoadPromise;
}
