import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts", "./vitest.setup.msw.ts"],
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
        // Phase 6 — portal breadth (teacher / parent / admin)
        "src/features/teacher/services/teacherService.ts": { lines: 80, functions: 85 },
        "src/features/teacher/store/useTeacherStore.ts": { lines: 80, functions: 85 },
        "src/features/teacher/utils/rosterUtils.ts": { lines: 95, functions: 100, branches: 80 },
        "src/features/parent/services/parentService.ts": { lines: 70, functions: 100 },
        "src/features/parent/store/useParentStore.ts": { lines: 80 },
        "src/features/admin/adminService.ts": { lines: 60 },
        "src/features/admin/components/DataTable.tsx": { lines: 95, branches: 80 },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
