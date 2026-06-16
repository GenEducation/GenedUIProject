import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // These predate vitest and run under `node --test` (they import "node:test").
    // Keep them on their own runner instead of failing the vitest suite.
    exclude: [
      "node_modules/**",
      "src/features/student/utils/voiceStreamMerge.test.ts",
      "src/features/student/components/pdf-viewer/pointerGeometry.test.ts",
    ],
    css: false,
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:0/test-api",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
