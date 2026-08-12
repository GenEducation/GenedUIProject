import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored tooling/skill code — not part of the app source.
    ".gemini/**",
    ".claude/**",
  ]),
  // Design-audit token guard (P1/P3): the student app shell/nav/greeting
  // surfaces were migrated toward STUDENT_COLORS / globals.css tokens, but
  // ~100 raw hex literals still remain on these files (mostly rgba shadows
  // and gradient stops that were never tokenized) — that's pre-existing
  // debt, not something a lint error should block the build over today.
  // Flagged at "warn" so new hex on these already-audited files surfaces in
  // review instead of silently blending in, without breaking CI on debt
  // this plan explicitly deferred rather than mechanically sweeping (a
  // blind find/replace here previously re-introduced the alpha-suffix bug —
  // see the comment in theme/colors.ts). Not a blanket rule across
  // src/features/student: ~79 files (interactive blocks, pdf-viewer,
  // test-taking UI) still carry legitimate one-off illustration hex.
  {
    files: [
      "src/features/student/components/StudentHome.tsx",
      "src/features/student/components/StudentHomeSidebar.tsx",
      "src/features/student/components/StudentChatSidebar.tsx",
      "src/features/student/components/StudentChatMain.tsx",
      "src/features/student/components/StudentChatHub.tsx",
      "src/features/student/components/StudentProfile.tsx",
      "src/features/student/components/StudentVoiceView.tsx",
      "src/features/student/components/VoiceStage.tsx",
      "src/features/student/components/StreakStats.tsx",
      "src/features/student/components/SchedulePage.tsx",
      "src/features/student/components/AssessmentsPage.tsx",
      "src/components/ui/Button.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3}([0-9A-Fa-f]{2})?)?$/]",
          message:
            "Raw hex color literal. Use STUDENT_COLORS (theme/colors.ts) or a CSS var(--token) instead — this file was migrated off local hex palettes.",
        },
      ],
    },
  },
]);

export default eslintConfig;
