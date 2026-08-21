import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// `no-restricted-syntax` options are REPLACED, not merged, when a later flat-config
// block names the same rule. Both guards below therefore share these selector
// objects, and any block covering a file in both sets must list both selectors —
// otherwise the later block silently switches the earlier guard off.
const HEX_LITERAL_SELECTOR = {
  selector: "Literal[value=/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3}([0-9A-Fa-f]{2})?)?$/]",
  message:
    "Raw hex color literal. Use STUDENT_COLORS (theme/colors.ts) or a CSS var(--token) instead — this file was migrated off local hex palettes.",
};

const RAW_BUTTON_SELECTOR = {
  selector: "JSXOpeningElement[name.name='button']",
  message:
    "Raw <button>. Use <Button> from @/components/ui/Button so this control gets the shared variants, sizes, hover/active, focus-visible ring, disabled and loading states. If this genuinely cannot use it, disable this rule on the line with a reason.",
};

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
  // Button system guard. The shared <Button> (src/components/ui/Button.tsx) is
  // the single source of button styling, focus rings, disabled/loading states,
  // and the `type="button"` default. Before it, the audit found 442 raw
  // <button> tags across 140 files with 8 border radii, 20+ padding combos, 6
  // disabled opacities and effectively no keyboard focus styling.
  //
  // "warn", not "error": ~350 raw <button> tags are still un-migrated, so
  // erroring would break the build on debt the migration is working through in
  // waves. The point is that *new* raw buttons surface in review. Flip to
  // "error" once the remaining waves land.
  //
  // Legitimate exceptions (add an eslint-disable-next-line with a reason):
  // bespoke non-rectangular controls, and buttons whose size is dictated by an
  // inline style object rather than the design system's sm/md/lg ladder — see
  // the voice UI and interactive maths blocks.
  {
    files: ["src/features/**/*.tsx", "src/components/**/*.tsx", "src/app/**/*.tsx"],
    ignores: [
      "src/components/ui/Button.tsx", // defines it
      "src/app/dev/buttons/page.tsx", // the reference gallery
      "**/__tests__/**",
    ],
    rules: {
      "no-restricted-syntax": ["warn", RAW_BUTTON_SELECTOR],
    },
  },
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
      // Both selectors, and this block MUST stay after the button guard:
      // later blocks replace the rule outright, so listing only the hex
      // selector here would switch the button guard off on these 12 files.
      "no-restricted-syntax": ["warn", HEX_LITERAL_SELECTOR, RAW_BUTTON_SELECTOR],
    },
  },
]);

export default eslintConfig;
