const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, TabStopType, TabStopPosition,
  TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak,
} = require("docx");

const BLUE = "1F4E79";
const LIGHT = "D5E8F0";
const GREY = "666666";

// ---- helpers -------------------------------------------------------------
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function body(runs) {
  const children = Array.isArray(runs) ? runs : [new TextRun(runs)];
  return new Paragraph({ spacing: { after: 120 }, children });
}
function bullet(text, lead) {
  const children = [];
  if (lead) children.push(new TextRun({ text: lead + " ", bold: true }));
  children.push(new TextRun(text));
  return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 40 }, children });
}

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, w, opts = {}) {
  return new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: opts.head ? { fill: BLUE, type: ShadingType.CLEAR } : (opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined),
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: !!opts.head, color: opts.head ? "FFFFFF" : undefined })] })],
  });
}

function routeTable() {
  const widths = [3000, 2200, 4160];
  const rows = [
    new TableRow({ tableHeader: true, children: [
      cell("Path", widths[0], { head: true }),
      cell("Portal", widths[1], { head: true }),
      cell("Notes", widths[2], { head: true }),
    ]}),
  ];
  const data = [
    ["/login, /register, /forgot-password, /reset-password", "Auth", "Public pages"],
    ["/student/*", "Student", "home, chat, voice, test, assessments, analytics, report-card, profile, onboarding"],
    ["/teacher/*", "Teacher", "Catch-all dashboard"],
    ["/parent/*", "Parent", "Catch-all dashboard"],
    ["/partner/*", "Partner", "Catch-all dashboard"],
    ["/admin/*, /admin/login", "Admin", "Catch-all dashboard"],
    ["/api/student/report-card/pdf", "API", "Server-side PDF generation"],
    ["/dev/pointer", "Dev", "Internal pointer-overlay tooling"],
  ];
  data.forEach((r, i) => {
    const fill = i % 2 ? "F2F7FB" : undefined;
    rows.push(new TableRow({ children: [
      cell(r[0], widths[0], { fill }), cell(r[1], widths[1], { fill }), cell(r[2], widths[2], { fill }),
    ]}));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

function stackTable() {
  const widths = [2600, 6760];
  const rows = [
    new TableRow({ tableHeader: true, children: [
      cell("Area", widths[0], { head: true }), cell("Technology", widths[1], { head: true }),
    ]}),
  ];
  const data = [
    ["Framework", "Next.js 16 (App Router, Turbopack), React 19, TypeScript"],
    ["Styling", "Tailwind CSS v4, next-themes (light/dark)"],
    ["State", "Zustand stores"],
    ["Animation", "Framer Motion"],
    ["Auth", "Google OAuth (@react-oauth/google) + JWT via authFetch"],
    ["Realtime", "SSE (@microsoft/fetch-event-source) for chat & voice streaming"],
    ["Voice", "@ricky0123/vad-web (VAD), Gemini voice catalog"],
    ["Payments", "Razorpay"],
    ["Rich content", "react-markdown, remark-gfm/math, KaTeX, highlight.js, PDF.js, GeoGebra, p5.js, Recharts"],
    ["PDF export", "Puppeteer (server route), jsPDF, pdf-lib, html2canvas"],
  ];
  data.forEach((r, i) => {
    const fill = i % 2 ? "F2F7FB" : undefined;
    rows.push(new TableRow({ children: [ cell(r[0], widths[0], { fill }), cell(r[1], widths[1], { fill }) ]}));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// ---- content -------------------------------------------------------------
const children = [];

// Title page
children.push(new Paragraph({ spacing: { before: 2600, after: 0 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "GenEd", bold: true, size: 72, color: BLUE })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
  children: [new TextRun({ text: "Frontend Feature Documentation", size: 40, color: GREY })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
  children: [new TextRun({ text: "AI Tutoring Platform — Web Application", size: 24, italics: true, color: GREY })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
  children: [new TextRun({ text: "Generated June 11, 2026  •  branch: dev", size: 20, color: GREY })] }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// TOC
children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }));
children.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Overview
children.push(h1("Overview"));
children.push(body("This document catalogs all features currently implemented in the GenEd web frontend. GenEd is an AI tutoring platform with dedicated portals for students, teachers, parents, partner institutions, and administrators. The application is built on Next.js with the App Router and uses role-based routing and access control."));
children.push(h2("Technology Stack"));
children.push(stackTable());
children.push(new Paragraph({ children: [new PageBreak()] }));

// Sections data
const sections = [
  { t: "1. Authentication & Account Management",
    loc: "src/features/auth, src/app/login|register|forgot-password|reset-password, src/components/auth",
    items: [
      ["Sign in / Sign up with email-password and Google OAuth.", "SignIn, SignUp, LoginView"],
      ["Forgot-password and reset-password flows.", "ForgotPassword, ResetPassword"],
      ["Composed auth layout — hero, feature highlights, header, footer.", "AuthPageLayout, AuthHero, AuthFeatures"],
      ["Role-based route protection gating each portal by required role.", "AuthGuard"],
      ["Authenticated fetch wrapper attaching tokens and handling auth errors.", "utils/authFetch.ts"],
      ["Session heartbeat keeping sessions alive.", "hooks/useSessionHeartbeat.ts"],
    ]},
  { t: "2. Student Portal",
    loc: "src/app/student/*, src/features/student",
    groups: [
      { g: "Home & Navigation", items: [
        ["Student home, hub and portal shell.", "StudentHome, StudentChatHub, StudentPortal"],
        ["Complete-profile banner prompting profile completion.", "CompleteProfileBanner"],
        ["Subject picker with per-subject icons (Math, Science, English, Hindi).", "InlineSubjectPicker, AgentPickerModal"],
      ]},
      { g: "AI Chat Tutor", items: [
        ["Streaming chat with the AI tutor over SSE, smoothed token rendering.", "StudentChatView, useSmoothStream"],
        ["Session management with sessioned routes and history sidebar.", "chat/[sessionId], StudentChatSidebar"],
        ["Rich message rendering: markdown, GFM, math (KaTeX), code highlighting.", "ChatMessageBubble, MarkdownRenderer"],
        ["Embedded interactive visuals — GeoGebra, p5.js, math widgets, figures.", "GeoGebraVisual, P5Visual, MathWidget"],
        ["Comprehension widget and inline content parsing.", "ComprehensionWidget, parseContent"],
        ["Resizable split pane for chat plus content side-by-side.", "ResizableSplitPane"],
      ]},
      { g: "Voice Tutor", items: [
        ["Realtime voice conversations with the tutor.", "StudentVoiceView, VoiceStage, VoiceControls"],
        ["Push-to-talk with configurable hotkey.", "PushToTalkButton, PttHotkeyConfig"],
        ["Audio recording / playback services with voice activity detection.", "audioRecorderService, audioPlayerService"],
        ["Karaoke-style synced transcript.", "KaraokeRenderer, VoiceTranscript"],
        ["Voice catalog / Gemini voice selection.", "voiceCatalogService, geminiVoices"],
        ["Connection-quality banner and speech-to-text hook.", "ConnectionQualityBanner, useSpeechToText"],
      ]},
      { g: "PDF / Textbook Viewer", items: [
        ["In-app PDF reader (PDF.js) — pages, thumbnails, sidebar, toolbar, zoom.", "pdf-viewer/*, ChapterPdfViewer"],
        ["AI pointer overlay — tutor points to regions on the page.", "PointerOverlay, usePointerResolver, pointerGeometry"],
      ]},
      { g: "Assessments & Tests", items: [
        ["Assessment listing.", "AssessmentsPage"],
        ["Test runner with 6 question types: MCQ, True/False, Short Answer, Match the Following, Assertion-Reasoning, Extract-Based.", "components/test/*"],
        ["Test UI — paper header, section dividers, sidebar nav, countdown timer.", "PaperHeader, AssessmentSidebar, TestTimer"],
        ["Results view with scoring and feedback.", "TestResultsView"],
      ]},
      { g: "Analytics & Progress", items: [
        ["Analytics dashboard with metric cards.", "StudentAnalyticsDashboard, MetricCard"],
        ["Chapter / skill / unit mastery views and skill progression charts.", "ChapterMasteryView, SkillMasteryView"],
        ["Activity heatmap.", "ActivityHeatmap, heatmapUtils"],
      ]},
      { g: "Report Card", items: [
        ["Report card view with server-side PDF generation.", "StudentReportCard, api/student/report-card/pdf"],
      ]},
      { g: "Onboarding", items: [
        ["Guided onboarding wizard with Sage avatar assistant and confetti.", "GeneralOnboardingWizard, SageAvatar"],
        ["Chat- and slider-based onboarding variants.", "OnboardingChatView, OnboardingSliderView"],
        ["Onboarding modal, prompt card, subject onboarding celebration.", "OnboardingModal, SubjectOnboardingCelebration"],
      ]},
      { g: "Profile & Partner Linking", items: [
        ["Student profile management.", "StudentProfile"],
        ["Partner request modal to link with an institution.", "PartnerRequestModal"],
      ]},
    ]},
  { t: "3. Teacher Portal",
    loc: "src/features/teacher, src/app/teacher/[[...slug]] (AuthGuard: teacher)",
    items: [
      ["Teacher dashboard via a single catch-all route.", "TeacherDashboard"],
      ["Student roster with cards and invite-student modal.", "StudentRoster, StudentCard, InviteStudentModal"],
      ["Exploration of student chat sessions and history.", "TeacherChatExploration, TeacherSessionList"],
      ["Teacher summary analytics view.", "TeacherSummary"],
      ["Confirm dialogs and toasts for actions.", "ConfirmDialog, Toast"],
    ]},
  { t: "4. Parent Portal",
    loc: "src/features/parent, src/app/parent/[[...slug]]",
    items: [
      ["Parent home dashboard.", "ParentHome"],
      ["Concept heatmap of the child's mastery.", "ConceptHeatmap"],
      ["Learning scheduler.", "LearningScheduler"],
      ["Exploration and history of the child's tutoring sessions.", "ParentChatExploration, ParentSessionList"],
      ["Parent profile and unlink-confirmation flow.", "ParentProfileView, UnlinkConfirmationModal"],
    ]},
  { t: "5. Partner / Institution Portal",
    loc: "src/features/partner, src/app/partner/[[...slug]]",
    items: [
      ["Partner admin dashboard with sidebar navigation.", "PartnerAdmin, SideBar"],
      ["Curriculum ingestion with page-wise preview.", "CurriculumIngestion, PageWisePreview"],
      ["Enrollment administration and totals.", "EnrollmentAdmin, TotalEnrollmentsStat"],
      ["Student registry table with detail modal.", "StudentRegistryTable, StudentDetailsModal"],
      ["Subject registry management.", "SubjectRegistry"],
      ["Pending-requests sidebar and delete-confirmation modals.", "PendingRequestsSidebar, DeleteConfirmationModal"],
    ]},
  { t: "6. Admin Portal",
    loc: "src/features/admin, src/app/admin/[[...slug]], admin/login",
    items: [
      ["Admin dashboard with stats overview.", "AdminDashboard, StatsOverview"],
      ["Entity views: Users, Students, Teachers, Parents, Partners, Agents, Assignments, Enrollments, Ingestions.", "*View components"],
      ["Reusable data table with entity edit modal.", "DataTable, EntityEditModal"],
      ["Create-account and bulk-import modals.", "CreateAccountModal, BulkImportModal"],
    ]},
  { t: "7. Billing & Payments",
    loc: "src/features/billing",
    items: [
      ["Razorpay integration.", "useRazorpay, paymentService"],
      ["Upgrade button and rate-limit prompt for usage caps.", "UpgradeButton, RateLimitPrompt"],
    ]},
  { t: "8. Notifications",
    loc: "src/components/Notification*, src/services/notificationService.ts",
    items: [
      ["Notification bell with unread state.", "NotificationBell"],
      ["App-wide notification provider and store.", "NotificationProvider, useNotificationStore"],
    ]},
  { t: "9. Tutorials & Showcase",
    loc: "src/features/tutorial, src/components",
    items: [
      ["Tutorial flow with celebration screen and store.", "TutorialCelebration, useTutorialStore"],
      ["Tutorial video modal.", "TutorialVideoModal"],
      ["Subject-icon showcase and showcase director.", "SubjectIconShowcase, ShowcaseDirector"],
    ]},
  { t: "10. Shared UI & Infrastructure",
    loc: "src/components/shared, src/store, src/utils",
    items: [
      ["Themed providers — light/dark via next-themes.", "components/providers"],
      ["Animated mascot loaders (typing, waving, pointing) and global loader.", "StudentLoader, GlobalLoader, useLoaderStore"],
      ["Global agent store and subject configuration.", "useAgent, subjectConfig"],
      ["Subject icon set (Math, Science, English, Hindi).", "components/icons"],
      ["Dev pointer playground for tuning the PDF pointer overlay.", "app/dev/pointer"],
    ]},
];

sections.forEach((s) => {
  children.push(h1(s.t));
  children.push(body([new TextRun({ text: "Location: ", bold: true, color: GREY, size: 18 }), new TextRun({ text: s.loc, italics: true, color: GREY, size: 18 })]));
  if (s.items) s.items.forEach((it) => children.push(bullet(it[0], "")));
  if (s.groups) s.groups.forEach((grp) => {
    children.push(h3(grp.g));
    grp.items.forEach((it) => children.push(bullet(it[0], "")));
  });
});

// Routing
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("Routing Overview"));
children.push(body("The application uses Next.js App Router with catch-all routes for each role-based portal."));
children.push(routeTable());

children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Generated from a scan of the src/ directory. Feature behaviors are derived from the component structure; component names are shown for reference.", italics: true, size: 18, color: GREY })] }));

// ---- document ------------------------------------------------------------
const doc = new Document({
  creator: "GenEd",
  title: "GenEd Frontend Feature Documentation",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Calibri", color: BLUE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LIGHT, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, font: "Calibri", color: "2E75B6" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Calibri", color: "404040" },
        paragraph: { spacing: { before: 140, after: 60 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
      ]},
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 2 } },
      children: [new TextRun({ text: "GenEd — Frontend Features", color: GREY, size: 16 }),
                 new TextRun({ text: "\tConfidential", color: GREY, size: 16 })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Page ", size: 16, color: GREY }),
                 new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY }),
                 new TextRun({ text: " of ", size: 16, color: GREY }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY })] })] }) },
    children,
  }],
});

const out = path.join(__dirname, "..", "GenEd-Frontend-Features.docx");
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log("Wrote", out); });
