# GenEd Frontend — Feature Documentation

A reference of all features currently implemented in the web frontend.

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4, `next-themes` (light/dark)
- **State:** Zustand stores
- **Animation:** Framer Motion
- **Auth:** Google OAuth (`@react-oauth/google`) + custom JWT via `authFetch`
- **Realtime:** SSE (`@microsoft/fetch-event-source`) for chat/voice streaming
- **Payments:** Razorpay
- **Rich content:** react-markdown + remark-gfm/math, KaTeX, highlight.js, PDF.js, GeoGebra, p5.js, Recharts

---

## 1. Authentication & Account Management
Location: `src/features/auth`, `src/app/login`, `register`, `forgot-password`, `reset-password`, `src/components/auth`

- **Sign in / Sign up** (`SignIn`, `SignUp`, `LoginView`) with email/password and Google OAuth.
- **Forgot / Reset password** flows (`ForgotPassword`, `ResetPassword`).
- **Composed auth layout** — hero, feature highlights, header, footer (`AuthPageLayout`, `AuthHero`, `AuthFeatures`, `AuthHeader`, `AuthFooter`).
- **Role-based route protection** — `AuthGuard` gates each portal by `requiredRole` (student / teacher / parent / partner / admin).
- **Authenticated fetch wrapper** — `utils/authFetch.ts` attaches tokens and handles auth errors.
- **Session heartbeat** — `hooks/useSessionHeartbeat.ts` keeps sessions alive.

## 2. Student Portal
Location: `src/app/student/*`, `src/features/student`

### Home & Navigation
- **Student home / hub** (`StudentHome`, `StudentHomeSidebar`, `StudentPortal`, `StudentChatHub`).
- **Complete-profile banner** prompting profile completion.
- **Subject picker** (`InlineSubjectPicker`, `AgentPickerModal`) with per-subject icons (Math, Science, English, Hindi) and config in `constants/subjectConfig.ts`.

### AI Chat Tutor
Location: `src/app/student/chat`, `StudentChatView/Main/Sidebar/Input`
- **Streaming chat** with the AI tutor over SSE, smoothed via `hooks/useSmoothStream.ts`.
- **Session management** — sessioned routes (`chat/[sessionId]`), sidebar with chat history.
- **Rich message rendering** (`ChatMessageBubble`, `ChatElementRenderer`, `MessageElements`, `MarkdownRenderer`) — markdown, GFM, math (KaTeX), syntax-highlighted code.
- **Embedded interactive visuals** — `GeoGebraVisual`, `P5Visual`, `MathWidget`, `FigureView`, `VisualBlock`, `VisualCard`, `ActivityRenderer`.
- **Comprehension widget** and inline content parsing (`utils/parseContent.ts`).
- **Resizable split pane** (`ResizableSplitPane`) for chat + content side-by-side.

### Voice Tutor
Location: `src/app/student/voice`, voice components/services
- **Realtime voice conversations** (`StudentVoiceView`, `VoiceStage`, `VoiceControls`, `VoiceTranscript`).
- **Push-to-talk** with configurable hotkey (`PushToTalkButton`, `PttHotkeyConfig`).
- **Audio recording/playback services** + VAD (voice activity detection via `@ricky0123/vad-web`).
- **Karaoke-style synced transcript** (`KaraokeRenderer`).
- **Voice catalog / Gemini voice selection** (`voiceCatalogService`, `constants/geminiVoices.ts`).
- **Connection quality banner** for network feedback.
- **Speech-to-text hook** (`hooks/useSpeechToText.ts`).

### PDF / Textbook Viewer
Location: `src/features/student/components/pdf-viewer`, `ChapterPdfViewer`
- **In-app PDF reader** (PDF.js) — pages, thumbnails, sidebar, toolbar, zoom/navigation.
- **AI pointer overlay** — tutor points to regions on the page (`PointerOverlay`, `usePointerResolver`, `pointerGeometry`, with unit tests).

### Assessments & Tests
Location: `src/app/student/test`, `assessments`, `components/test`, `useTestStore`
- **Assessment listing** (`AssessmentsPage`).
- **Test runner** supporting multiple question types: Multiple Choice, True/False, Short Answer, Match the Following, Assertion–Reasoning, Extract-Based.
- **Test UI** — paper header, section dividers, sidebar navigation, countdown timer.
- **Results view** (`TestResultsView`) with scoring/feedback.

### Analytics & Progress
Location: `src/app/student/analytics`, `src/components/analytics`, `useAnalyticsStore`
- **Student analytics dashboard** with metric cards.
- **Chapter / skill / unit mastery views** and skill progression charts (Recharts).
- **Activity heatmap** (`ActivityHeatmap`, `heatmapUtils`).

### Report Card
Location: `src/app/student/report-card`, `components/report-card`, `api/student/report-card/pdf`
- **Student report card** view with **server-side PDF generation** (Puppeteer route + jsPDF/pdf-lib).

### Onboarding
Location: `src/features/onboarding`, `src/app/student/onboarding`
- **Guided onboarding wizard** (`GeneralOnboardingWizard`) — welcome, question steps, done, with **Sage avatar/bubble** assistant and confetti.
- **Chat- and slider-based onboarding** variants (`OnboardingChatView`, `OnboardingSliderView`).
- **Onboarding modal / prompt card** and **subject onboarding celebration**.

### Profile & Partner Linking
- **Student profile** management (`StudentProfile`, `src/app/student/profile`).
- **Partner request modal** to link with a partner/institution.

## 3. Teacher Portal
Location: `src/features/teacher`, `src/app/teacher/[[...slug]]` (catch-all, AuthGuard `teacher`)
- **Teacher dashboard** with a single catch-all route.
- **Student roster** (`StudentRoster`, `StudentCard`) and **invite student** modal.
- **Chat exploration** of student sessions (`TeacherChatExploration`, `TeacherChatHistoryView`, `TeacherSessionList`).
- **Teacher summary** analytics view.
- **Confirm dialogs & toasts** for actions.

## 4. Parent Portal
Location: `src/features/parent`, `src/app/parent/[[...slug]]`
- **Parent home** dashboard (`ParentHome`).
- **Concept heatmap** of the child's mastery (`ConceptHeatmap`).
- **Learning scheduler** (`LearningScheduler`).
- **Chat exploration / history** of the child's tutoring sessions (`ParentChatExploration`, `ParentChatHistoryView`, `ParentSessionList`).
- **Parent profile** and **unlink confirmation** flow.

## 5. Partner / Institution Portal
Location: `src/features/partner`, `src/app/partner/[[...slug]]`
- **Partner admin** dashboard with sidebar navigation (`PartnerAdmin`, `SideBar`).
- **Curriculum ingestion** + **page-wise preview** (`CurriculumIngestion`, `PageWisePreview`).
- **Enrollment administration** (`EnrollmentAdmin`, `TotalEnrollmentsStat`).
- **Student registry table** with detail modal (`StudentRegistryTable`, `StudentDetailsModal`).
- **Subject registry** management.
- **Pending requests sidebar** and **delete confirmation** modals.
- Skeleton loaders for async states.

## 6. Admin Portal
Location: `src/features/admin`, `src/app/admin/[[...slug]]`, `admin/login`
- **Admin dashboard** with stats overview (`AdminDashboard`, `StatsOverview`).
- **Entity management views:** Users, Students, Teachers, Parents, Partners, Agents, Assignments, Enrollments, Ingestions.
- **Reusable data table** (`DataTable`) with edit modal (`EntityEditModal`).
- **Create account** + **bulk import** modals.
- Dedicated admin login.

## 7. Billing & Payments
Location: `src/features/billing`
- **Razorpay integration** (`useRazorpay`, `paymentService`).
- **Upgrade button** and **rate-limit prompt** for usage caps.

## 8. Notifications
Location: `src/components/Notification*`, `src/services/notificationService.ts`, `src/store/useNotificationStore.ts`
- **Notification bell** with unread state and **notification provider** for app-wide delivery.

## 9. Tutorials & Showcase
- **Tutorial flow** (`features/tutorial`) with celebration screen and store.
- **Tutorial video modal** (`shared/TutorialVideoModal`).
- **Subject icon showcase / showcase director** (`SubjectIconShowcase`, `ShowcaseDirector`).

## 10. Shared UI & Infrastructure
- **Themed providers** (`components/providers`) — light/dark via `next-themes`.
- **Global + student-character loaders** — animated mascot loaders (typing, waving, pointing states) and a global loader (`stores/useLoaderStore.ts`).
- **Global agent store** (`store/useAgent.ts`).
- **Subject icon set** (Math, Science, English, Hindi).
- **Dev pointer playground** (`src/app/dev/pointer`) for tuning the PDF pointer overlay.

---

## Routing Overview
| Path | Portal | Notes |
|------|--------|-------|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth | Public |
| `/student/*` | Student | home, chat, voice, test, assessments, analytics, report-card, profile, onboarding |
| `/teacher/*` | Teacher | catch-all dashboard |
| `/parent/*` | Parent | catch-all dashboard |
| `/partner/*` | Partner | catch-all dashboard |
| `/admin/*`, `/admin/login` | Admin | catch-all dashboard |
| `/api/student/report-card/pdf` | API | server PDF generation |
| `/dev/pointer` | Dev | internal tooling |

*Generated from a scan of `src/` on the `dev` branch.*
