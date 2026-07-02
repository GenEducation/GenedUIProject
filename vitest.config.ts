import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**"],
    css: false,
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:0/test-api",
    },
    coverage: {
      provider: "v8",
      // A low global floor plus per-file ratchets on the modules Phase 1 covers.
      // Raise these as later phases add breadth; never chase a global 80 (voice/pdf
      // and the 200-component surface make that a vanity number).
      thresholds: {
        lines: 15,
        functions: 15,
        branches: 15,
        statements: 15,
        "src/utils/authFetch.ts": { lines: 90, functions: 90, branches: 85 },
        "src/features/auth/authService.ts": { lines: 75, functions: 85 },
        "src/features/student/store/useTestStore.ts": { lines: 65, functions: 85 },
        "src/components/auth/AuthGuard.tsx": { lines: 75 },
        "src/features/student/utils/heatmapUtils.ts": { lines: 95, functions: 100 },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
