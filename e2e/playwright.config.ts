import { defineConfig, devices } from "@playwright/test";

/** Real-browser tests of the lesson renderers against the local fixture page `/dev/checks` only (no backend, no auth, no network). */
const PORT = 3217;
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  webServer: {
    command: `./node_modules/.bin/next dev --webpack --port ${PORT}`, cwd: "..", // webpack: Turbopack refuses this worktree's symlinked node_modules
    url: `http://localhost:${PORT}/dev/checks`,
    // An address nothing listens on: the page's fixtures answer every lesson route, and nothing else may reach a backend.
    env: { NEXT_PUBLIC_API_URL: "http://127.0.0.1:9", NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet-touch", use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1100 }, hasTouch: true } },
  ],
});
