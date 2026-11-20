/**
 * Resolves once the page under the loader has its on-screen images (the
 * dashboard's 3D renders, the home page's frames) loaded and decoded, so the
 * loader never lifts onto half-painted art.
 *
 * Only images in the viewport count — lazy ones further down would never
 * load while hidden. The set has to stay complete for `settleMs`, which
 * catches images that only mount after the page's data arrives. `timeoutMs`
 * caps the wait so a broken image can't hold the loader up.
 */
export function waitForPageVisuals({
  timeoutMs = 7000,
  settleMs = 450,
  pollMs = 120,
}: { timeoutMs?: number; settleMs?: number; pollMs?: number } = {}): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.resolve();

  return new Promise((resolve) => {
    const started = performance.now();
    let readySince: number | null = null;

    const pending = () =>
      Array.from(document.images).filter((img) => {
        if (img.closest("[data-loader-overlay]")) return false;
        const r = img.getBoundingClientRect();
        const onScreen = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
        // `complete` is also true for a broken image, which shouldn't block.
        return onScreen && !img.complete;
      }).length;

    const check = () => {
      const now = performance.now();
      if (now - started >= timeoutMs) return resolve();
      if (pending() === 0) {
        readySince ??= now;
        if (now - readySince >= settleMs) {
          // Fonts too: the dashboard's headings swap in otherwise.
          const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
          return void (fonts?.ready ?? Promise.resolve()).then(() => resolve(), () => resolve());
        }
      } else {
        readySince = null;
      }
      setTimeout(check, pollMs);
    };
    check();
  });
}
