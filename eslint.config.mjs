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
    ".agents/**",
    // Minified / emscripten-generated vendor bundles that postinstall copies
    // into public/ (pdf.js worker, onnxruntime wasm glue). Not editable
    // source, and linting them produced ~2000 meaningless findings.
    "public/**",
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
  // Node build scripts under scripts/ are CommonJS by design (they are run
  // directly with `node`, outside the Next bundler, and are not part of the
  // app). Converting them to ESM buys nothing and risks breaking them, so
  // allow require() here rather than rewriting them.
  {
    files: ["scripts/**/*.js", "scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Test files: `any` is allowed. Mocks, stubs and fixture builders are
  // deliberately loose about shape, and typing them accurately produces noise
  // without catching real defects. The rule stays on for all app source.
  {
    files: [
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.setup.ts",
      "vitest.setup.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // React Compiler lint rules, newly enabled by eslint-config-next 16.2.1.
  //
  // They flag 57 sites across ~35 components. Each needs a per-site judgement
  // call rather than a sweep, and a good share of them are already-deliberate,
  // already-commented patterns — see the six-line note on the StrictMode-safe
  // render-time ref latch in ChatMessageBubble.tsx. Fixing them properly is the
  // only part of the lint cleanup that changes runtime behaviour, so it gets
  // its own pass; "warn" keeps them visible in review meanwhile without
  // blocking CI on the whole backlog.
  //
  // What is deferred, highest value first:
  //   - purity (16): Math.random() during render seeds the decorative particles
  //     in Confetti.tsx, SubjectOnboardingCelebration.tsx and
  //     TutorialCelebration.tsx. This is a real latent SSR-hydration mismatch
  //     and should be fixed first — move generation into useState(() => ...).
  //   - set-state-in-effect (30): ten identical admin-view data-load effects
  //     (useCallback(load) + useEffect(() => load(), [load]), see
  //     AgentsView.tsx), plus prop-sync effects in StudentChatInput.tsx,
  //     StudentHome.tsx and MessageElements.tsx that are better expressed as
  //     derived state or a key-based remount.
  //   - static-components (5): hoist the component definitions out of the
  //     parent bodies in BaseTenBlocks.tsx and FractionBar.tsx.
  //   - refs (5) and immutability (1): mostly intentional; these likely just
  //     need a documented eslint-disable-next-line each.
  //
  // rules-of-hooks stays an ERROR: its one violation (a useState after an early
  // return in SignUp.tsx) was a genuine bug and is fixed.
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
