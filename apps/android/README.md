# GenEd — Android app (Expo / React Native)

Native mobile app for the GenEd **student portal**. Built with Expo + Expo Router +
TypeScript. The visual design mirrors the web app (see `src/theme/tokens.ts`, which is
ported from the web's student-portal components and `globals.css`).

## Status: student portal, design phase

Implemented screens:

| Route | Screen | Web source it mirrors |
|---|---|---|
| `app/sign-in.tsx` | Sign in (navy/emerald, Google) | `features/auth/components/SignIn.tsx` |
| `app/sign-up.tsx` | **Sign up — full multi-step** (role → student details → grade) | `features/auth/components/SignUp.tsx` |
| `app/(tabs)/index.tsx` | Home / dashboard | `features/student/components/StudentHome.tsx` |
| `app/(tabs)/practice.tsx` | Practice (placeholder) | `features/student/components/AssessmentsPage.tsx` |
| `app/(tabs)/report.tsx` | Report Card (editorial Learner Report) | `components/report-card/StudentReportCard.tsx` |
| `app/(tabs)/me.tsx` | Me / profile | `features/student/components/StudentProfile.tsx` |
| `app/chat.tsx` | AI tutor chat | `features/student/components/StudentChatView.tsx` |

Bottom navigation: **Home · Practice · Report Card · Me** (matches `StudentHomeSidebar`).

## Not yet wired

These screens are **UI only** — no backend integration yet. Next steps:
- Port `src/utils/authFetch.ts` + Zustand stores into a shared package.
- Real auth (tokens via `expo-secure-store`), native Google OAuth (`expo-auth-session`).
- Live data for dashboard / report / profile.
- Voice (WebRTC) and push (FCM) — see the project plan.

## Run it

```bash
cd apps/android
npm install
npx expo start          # press "a" for Android emulator, or scan the QR with Expo Go
```

Requires Node 18+, the Expo Go app (or an Android emulator), and a first-run
`npx expo install` if any native modules need version alignment.

## Fonts

Loaded at runtime from Google Fonts via `@expo-google-fonts/*` in `app/_layout.tsx`:
Nunito (headings), DM Sans (body/UI), Playfair Display (auth display), Source Serif 4
+ JetBrains Mono (the editorial report card).

## Testing

Unit and component tests run on **[jest-expo](https://docs.expo.dev/develop/unit-testing/)**
with **[@testing-library/react-native](https://callstack.github.io/react-native-testing-library/)**.

```bash
npm test             # run the suite once
npm run test:watch   # watch mode
npm run test:ci      # CI mode with coverage
```

> If `npm install` fails on peer deps (a pre-existing workspace conflict between
> react-dom/radix and react 19.1), re-run it with `--legacy-peer-deps`.

**Conventions**

- **Co-location:** tests live in a `__tests__/` folder next to the code they cover,
  named `*.test.ts` / `*.test.tsx` (e.g. `src/services/__tests__/sseParser.test.ts`).
- **Path alias:** `@/…` resolves to `src/…` in tests (`moduleNameMapper` in
  [jest.config.js](jest.config.js)), matching `tsconfig.json`.
- **Global mocks:** native / side-effecting modules are mocked once in
  [jest.setup.js](jest.setup.js) — `expo-secure-store` (in-memory stub),
  `@react-native-google-signin/google-signin`, and `expo-router`. Add
  test-specific mocks with `jest.mock(...)` inside the individual test file.

**Seed coverage** (a starting pattern to extend, not full coverage): the SSE parser
(`services/sseParser`), content parser (`utils/parseContent`), session routing
(`utils/session`), test-answer encoding (`components/test/answerUtils`), the auth +
prefs stores, and two components (`ChatInput`, `TestTimer`).

**Not yet covered:** native Kotlin modules (`VoiceAudioEngine`, AEC — need a
JUnit/Robolectric setup), E2E flows (Maestro/Detox), and the remaining ~160 components.
