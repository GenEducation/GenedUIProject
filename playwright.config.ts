import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// For faster local iteration after a manual `npm run build`, you can temporarily
// change the command to just `npm run start -- -p 3100` to skip rebuilding.
export default defineConfig({
  testDir: "e2e/mocked",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_API_URL:
        process.env.NEXT_PUBLIC_API_URL ||
        "https://gateway-service-dev-479218009109.asia-south1.run.app",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID:
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        "ci-placeholder.apps.googleusercontent.com",
    },
  },
});
