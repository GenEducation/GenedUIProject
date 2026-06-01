# apps/web

The **GenEd web app** (Next.js 16 + React 19) currently lives at the **repository root**
(`/src`, `/public`, `next.config.ts`, etc.), not inside this folder.

This folder is a placeholder marking the intended monorepo layout:

```
apps/
  web/      → Next.js web app   (currently still at repo root — not yet moved)
  android/  → React Native (Expo) mobile app  ← new
```

## Why the web app hasn't been moved here yet

Physically relocating the live Next.js app (configs, build output, CI/deploy paths,
import aliases) is a large, breaking change and should be done as its own focused
task with verification. Until then, the web app stays at the root and the Android
app is developed independently under `apps/android`.

## Eventual shared layer

When the move happens, the plan is to extract a `packages/shared` workspace for code
both apps reuse: the `authFetch` API client, TypeScript domain types, Zustand stores,
and design tokens. See `../android/src/theme/tokens.ts` for the tokens already mirrored
from the web `globals.css` and the student-portal components.
