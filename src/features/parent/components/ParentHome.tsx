"use client";

import { FEATURES } from "@/constants/features";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Users, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useParentStore } from "../store/useParentStore";
import type { LinkedStudent } from "../services/parentService";
import { titleCase } from "@/features/student/utils/displayName";
import { useLoaderStore } from "@/stores/useLoaderStore";
import dynamic from "next/dynamic";
import { ParentChatExploration } from "./ParentChatExploration";
import { ParentSettingsView } from "./settings/ParentSettingsView";
import { ParentScheduleView } from "./ParentScheduleView";
import { ParentMomentsView } from "./ParentMomentsView";
import { ParentStudentPicker } from "./ParentStudentPicker";
import { ParentStudentSwitcher } from "./ParentStudentSwitcher";
import { assignStudentAvatars } from "../utils/studentAvatars";
import { dismissConnectPrompt, hasDismissedConnectPrompt, hasEnteredPortal, markPortalEntered } from "../utils/portalEntry";
import { ConnectChildDialog } from "./settings/ConnectChildDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { ParentHomeView } from "./home/ParentHomeView";
import { SubjectInsightsView } from "./subject/SubjectInsightsView";
import { ICON, NAV_ROW, NAV_ROW_ACTIVE, PORTAL_THEME } from "./home/theme";
import { greetingFor } from "../utils/homeMetrics";
import { ParentReportPreparing } from "./loader/ParentReportPreparing";
import { PortalBusyProvider, PortalProgressBar } from "./loader/PortalProgress";
import { GlassSkeleton } from "./loader/GlassSkeleton";
import { asError } from "@/utils/errors";

// The GenEd logo shared for the portal (Deep Ocean + Citron).
const LOGO_SRC = "/brand/gened-logo-deep-ocean-transparent.png";

// Lazy-loaded: StudentReportCard is ~160KB and only shown on its own page.
// While its code downloads, the same "preparing" state shows as once it's
// fetching data, so there's no blank gap between the two.
const StudentReportCard = dynamic(
  () => import("@/components/report-card/StudentReportCard").then((m) => m.StudentReportCard),
  { ssr: false, loading: () => <ParentReportPreparing /> }
);

export function ParentHome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { 
    parentProfile, 
    linkedStudents, 
    selectedStudentId: storedStudentId,
    setSelectedStudentId,
    fetchLinkedStudents,
    isFetchingStudents,
    hasFetchedStudents,
    activeDashboardView: storedView,
    setDashboardView,
  } = useParentStore();

  // The URL is the source of truth for which child and which page are shown.
  // Reading it here (rather than only via the sync effect below) means the
  // first render after a navigation is already the right page; the store
  // copy, kept for other consumers, catches up a moment later.
  const fromUrl = routeFromPath(pathname);
  const activeDashboardView = fromUrl.view ?? storedView;
  const selectedStudentId = fromUrl.view === "profile" ? null : fromUrl.studentId ?? storedStudentId;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const [linkingSuccess, setLinkingSuccess] = useState<string | null>(null);

  // Auto parent linking if search query parameters are present
  useEffect(() => {
    const token = searchParams.get("token");
    const studentId = searchParams.get("student_id");

    if (!token || !studentId || !parentProfile?.user_id) return;

    let cancelled = false;
    const controller = new AbortController();

    async function autoLink() {
      setIsLinking(true);
      setLinkingError(null);
      setLinkingSuccess(null);
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

        // 1. Verify token first
        const verifyResp = await fetch(
          `${API_BASE_URL}/parent/verify-token?student_id=${studentId}&token=${token}`,
          { signal: controller.signal }
        );
        if (!verifyResp.ok) {
          const errData = await verifyResp.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to verify parent token.");
        }
        const verifyData = await verifyResp.json();

        // 2. Confirm link
        const confirmResp = await fetch(`${API_BASE_URL}/parent/confirm-link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("gened_auth_token")}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            parent_id: parentProfile!.user_id,
            token: token,
          }),
          signal: controller.signal,
        });

        if (!confirmResp.ok) {
          const errData = await confirmResp.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to link account.");
        }

        if (!cancelled) {
          setLinkingSuccess(`Successfully linked with student "${verifyData.student_username}"!`);

          // Refresh students list in parent store
          await fetchLinkedStudents();

          // Clean URL params without page reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }
      } catch (err) {
        if (!cancelled && asError(err).name !== "AbortError") {
          setLinkingError(asError(err).message || "Failed to establish parent-student link.");
        }
      } finally {
        if (!cancelled) setIsLinking(false);
      }
    }

    autoLink();
    return () => { cancelled = true; controller.abort(); };
  }, [searchParams, parentProfile, fetchLinkedStudents]);

  // Sync URL → state on mount / pathname change.
  //   /parent/:id, /parent/:id/analytics  → Home
  //   /parent/:id/report                   → Report Card
  //   /parent/:id/subject/:subject         → one subject in depth
  //   /parent/:id/{chat,schedule,moments}  → older views, still reachable by link
  //   /parent/profile                      → Settings
  const urlParts = pathname.split("/").filter(Boolean);
  const subjectFromUrl =
    urlParts[2] === "subject" && urlParts[3] ? safeDecode(urlParts[3]) : null;
  useEffect(() => {
    const [, id, section] = pathname.split("/").filter(Boolean);
    if (id === "profile") {
      setDashboardView("profile");
      setSelectedStudentId(null);
      return;
    }
    if (!id) return; // /parent alone: the picker, or the store's auto-selection
    setSelectedStudentId(id);
    if (section === "schedule" && !FEATURES.schedule) {
      // Switched off for now: a typed or bookmarked URL lands on Home.
      router.replace(`/parent/${id}`);
      setDashboardView("analytics");
      return;
    }
    if (section === "report" || section === "subject" || section === "chat" || section === "schedule" || section === "moments") {
      setDashboardView(section);
    } else {
      setDashboardView("analytics");
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  // Portal entry: the parent loader now waits on the family — it names them
  // as they load, then leaves once they have (after its minimum hold).
  useEffect(() => {
    const loader = useLoaderStore.getState();
    if (loader.isVisible && loader.variant === "parent") loader.setParentStage("entry");
  }, []);
  useEffect(() => {
    if (!hasFetchedStudents) return;
    const loader = useLoaderStore.getState();
    if (loader.isVisible && loader.variant === "parent") loader.finishLoading();
  }, [hasFetchedStudents]);

  const selectedStudent = linkedStudents.find(s => s.student_id === selectedStudentId);
  const approvedStudents = useMemo(
    () => linkedStudents.filter(s => s.status === "APPROVED"),
    [linkedStudents]
  );
  const studentAvatars = useMemo(
    () => assignStudentAvatars(approvedStudents.map(s => s.student_id)),
    [approvedStudents]
  );
  const hasMultipleStudents = approvedStudents.length > 1;

  // Opening the portal in a tab starts at the student picker, whatever /parent
  // URL it opened on; refreshing a tab that's already past it keeps the page.
  // Read once per mount — a refresh remounts, in-app navigation doesn't.
  const [portalEntered, setPortalEntered] = useState(hasEnteredPortal);
  const enterPortal = useCallback(() => {
    markPortalEntered();
    setPortalEntered(true);
  }, []);
  // The account-link flow (?token=) and the parent's own profile page aren't
  // about any one child, so they skip the picker.
  const isLinkingFlow = !!searchParams.get("token");
  const isProfilePage = pathname === "/parent/profile";

  // With nothing to choose between, the tab counts as entered straight away.
  useEffect(() => {
    if (portalEntered || !hasFetchedStudents) return;
    if (!hasMultipleStudents || isLinkingFlow || isProfilePage) enterPortal();
  }, [portalEntered, hasFetchedStudents, hasMultipleStudents, isLinkingFlow, isProfilePage, enterPortal]);

  // First run: no child connected yet, so before Home show how to connect one.
  // "Later" holds for this login; the empty Home can bring it back.
  const [connectDismissed, setConnectDismissed] = useState(hasDismissedConnectPrompt);
  const pendingStudents = useMemo(() => linkedStudents.filter((s) => s.status === "PENDING"), [linkedStudents]);
  const pendingAvatars = useMemo(() => assignStudentAvatars(pendingStudents.map((s) => s.student_id)), [pendingStudents]);
  const showConnectPrompt =
    hasFetchedStudents && approvedStudents.length === 0 && !isLinkingFlow && !isProfilePage && !connectDismissed;
  const dismissConnect = useCallback(() => {
    dismissConnectPrompt();
    setConnectDismissed(true);
  }, []);
  const refreshStudents = useCallback(() => { void fetchLinkedStudents(); }, [fetchLinkedStudents]);

  const studentName = (s: LinkedStudent) => s.name || `Student ID: ...${s.student_id.slice(-4)}`;
  const parentName = titleCase(parentProfile?.name?.trim() || parentProfile?.username || "Parent");

  // The child the nav acts on. On Settings no child is selected, so fall back
  // to the last one viewed, then the first.
  const [lastStudentId, setLastStudentId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedStudentId) setLastStudentId(selectedStudentId);
  }, [selectedStudentId]);
  const navStudentId = selectedStudentId ?? lastStudentId ?? approvedStudents[0]?.student_id ?? null;
  const navStudent = approvedStudents.find((s) => s.student_id === navStudentId) ?? null;

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  // Move to another child without losing the parent's place: the same
  // section they were on, just for the other child.
  const switchToStudent = (studentId: string) => {
    const base = `/parent/${studentId}`;
    const path =
      activeDashboardView === "report" ? `${base}/report`
      : activeDashboardView === "subject" && subjectFromUrl ? `${base}/subject/${encodeURIComponent(subjectFromUrl)}`
      : activeDashboardView === "chat" || activeDashboardView === "schedule" || activeDashboardView === "moments"
        ? `${base}/${activeDashboardView}`
      : base;
    // The pathname effect above picks up the new child and section.
    router.push(path);
    closeSidebarOnMobile();
  };

  // The picker shows when the portal is opened in this tab, and any time the
  // parent asks for it at bare /parent ("See all profiles").
  const showPicker =
    !isLinkingFlow && !isProfilePage && (pathname === "/parent" || !portalEntered);
  if (showPicker && !hasFetchedStudents) {
    return <ParentStudentPicker loading />;
  }
  if (showPicker && hasMultipleStudents) {
    // A tab opened on a child's page (bookmark, restored tab) carries on to
    // that page if the parent picks the same child.
    const openedOnStudentId = pathname.split("/").filter(Boolean)[1];
    return (
      <ParentStudentPicker
        students={approvedStudents}
        onSelect={(id) => {
          enterPortal();
          if (id === openedOnStudentId) return;
          setSelectedStudentId(id);
          router.push(`/parent/${id}`);
        }}
      />
    );
  }

  const navItems = [
    { key: "analytics", label: "Home", icon: "nav_home", href: navStudentId ? `/parent/${navStudentId}` : "/parent" },
    { key: "report", label: "Report Card", icon: "nav_report_card", href: navStudentId ? `/parent/${navStudentId}/report` : "/parent" },
  ] as const;

  // While the family loads: the hat loader covers this after sign-in or
  // sign-up; on a refresh or a new tab there's none, so a light skeleton.
  const content = isFetchingStudents && !hasFetchedStudents ? (
    <div aria-busy="true" aria-label="Loading" className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <GlassSkeleton key={i} className="h-[150px] rounded-2xl" />)}
      </div>
      <GlassSkeleton className="h-[300px] rounded-2xl" />
    </div>
  ) : activeDashboardView === "profile" ? (
    <ParentSettingsView profile={parentProfile} />
  ) : selectedStudent ? (
    // The new page replaces the old one at once and fades in. No exit
    // animation: waiting for the old page to fade out first (AnimatePresence
    // "wait") left it on screen whenever that fade was interrupted.
    <motion.div
      key={`${selectedStudentId}-${activeDashboardView}-${subjectFromUrl ?? ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {activeDashboardView === "analytics" ? (
        <ParentHomeView studentId={selectedStudentId!} />
      ) : activeDashboardView === "subject" && subjectFromUrl ? (
        <SubjectInsightsView studentId={selectedStudentId!} subject={subjectFromUrl} childName={selectedStudent?.name} />
      ) : (
        <div className="portal-legacy-type overflow-hidden rounded-[24px] border border-[var(--pp-line)] bg-white">
          {activeDashboardView === "report" ? (
            <StudentReportCard
              parentId={parentProfile?.user_id}
              childId={selectedStudentId!}
              childName={selectedStudent?.name || undefined}
              loadingFallback={
                <ParentReportPreparing
                  childName={selectedStudent?.name}
                  avatar={studentAvatars[selectedStudentId!]}
                />
              }
            />
          ) : activeDashboardView === "schedule" && FEATURES.schedule ? (
            <ParentScheduleView
              studentId={selectedStudentId!}
              parentId={parentProfile!.user_id}
              studentName={selectedStudent?.name}
            />
          ) : activeDashboardView === "moments" ? (
            <ParentMomentsView
              studentId={selectedStudentId!}
              studentName={selectedStudent?.name}
            />
          ) : (
            <ParentChatExploration />
          )}
        </div>
      )}
    </motion.div>
  ) : (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--pp-mint)] text-[var(--pp-green-deep)]">
        <Users size={34} />
      </span>
      <h2 className="mb-3 text-2xl font-bold">Link your child to get started</h2>
      <p className="max-w-md text-sm text-[var(--pp-ink-soft)]">
        Once your child&apos;s account is linked, you&apos;ll see how they&apos;re learning here. You can manage links in{" "}
        <Link href="/parent/profile" className="font-semibold text-[var(--pp-green-deep)] underline-offset-2 hover:underline">Settings</Link>.
      </p>
      {!isLinkingFlow && (
        <Button variant="primary" className="mt-6" onClick={() => setConnectDismissed(false)}>
          Show me how
        </Button>
      )}
    </div>
  );

  return (
    <PortalBusyProvider>
    <div
      style={PORTAL_THEME}
      className="relative flex h-screen overflow-hidden bg-[var(--pp-bg)] font-[family-name:var(--font-display)] text-[var(--pp-ink)]"
    >
      {/* -- MOBILE SIDEBAR OVERLAY ------------------------------------------ */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-[#122D30]/30 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* -- SIDEBAR ---------------------------------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--pp-line)] bg-[var(--pp-side)] transition-transform duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-7 pt-7">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img src={LOGO_SRC} alt="GenEd" width={354} height={140} className="h-auto w-[136px]" />
          <button
            aria-label="Close menu"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl p-2 text-[var(--pp-ink)] hover:bg-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Parent portal" className="mt-9 space-y-1.5 px-4">
          {navItems.map((item) => {
            // A subject page sits under Home.
            const view = activeDashboardView === "subject" ? "analytics" : activeDashboardView;
            const active = view === item.key && !!selectedStudent;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={closeSidebarOnMobile}
                className={`${NAV_ROW} ${active ? NAV_ROW_ACTIVE : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
                <img src={ICON(item.icon)} alt="" width={22} height={22} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {hasMultipleStudents && parentProfile && navStudentId && (
            <ParentStudentSwitcher
              parentId={parentProfile.user_id}
              currentStudentId={navStudentId}
              students={approvedStudents}
              avatars={studentAvatars}
              onSwitch={switchToStudent}
              onSeeAll={() => {
                router.push("/parent");
                closeSidebarOnMobile();
              }}
            />
          )}

          <Link
            href="/parent/profile"
            aria-current={activeDashboardView === "profile" ? "page" : undefined}
            onClick={closeSidebarOnMobile}
            className={`${NAV_ROW} ${activeDashboardView === "profile" ? NAV_ROW_ACTIVE : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
            <img src={ICON("nav_settings")} alt="" width={22} height={22} className="shrink-0" />
            Settings
          </Link>
        </nav>

        <div className="mt-auto flex justify-center px-6 pb-6 pt-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative illustration */}
          <img
            src={ICON("student_learning_illustration")}
            alt=""
            width={165}
            height={225}
            className="h-auto w-[148px] select-none"
            draggable={false}
          />
        </div>
      </aside>

      {/* -- MAIN ------------------------------------------------------------- */}
      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        {/* Soft colour behind the content so the glass cards have something to frost. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-[8%] h-[460px] w-[460px] rounded-full bg-[#9FE3C4]/45 blur-[90px]" />
          <div className="absolute left-[-120px] top-[38%] h-[380px] w-[380px] rounded-full bg-[#D7EA7C]/35 blur-[90px]" />
          <div className="absolute bottom-[-140px] right-[30%] h-[420px] w-[420px] rounded-full bg-[#BBD7FF]/40 blur-[100px]" />
        </div>
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-4 lg:flex-nowrap lg:px-8 lg:pt-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              aria-label="Open menu"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-[var(--pp-line)] bg-white p-2.5 text-[var(--pp-ink)]"
            >
              <Menu size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src={LOGO_SRC} alt="GenEd" width={354} height={140} className="h-auto w-[96px]" />
          </div>
          {/* Greeting: beside the bell on desktop, its own line on phones. */}
          <div className="order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1">
            {/* Settings is about the parent's own account, not a child: a plain title there. */}
            <h1 className="truncate text-[22px] font-bold leading-tight tracking-tight text-[var(--pp-ink)] lg:text-[28px]">
              {activeDashboardView === "profile" ? "Settings" : `${greetingFor()}, ${parentName}!`}
            </h1>
            {activeDashboardView === "profile" ? (
              <p className="mt-0.5 truncate text-[14px] text-[var(--pp-ink-soft)] lg:text-[15px]">
                Your account and the children connected to it.
              </p>
            ) : navStudent && (
              <p className="mt-0.5 truncate text-[14px] text-[var(--pp-ink-soft)] lg:text-[15px]">
                Here&apos;s how {studentName(navStudent)} is doing on their learning journey.
              </p>
            )}
          </div>
          <div className="ml-auto lg:ml-0">
            <NotificationBell userId={parentProfile?.user_id || ""} align="right" />
          </div>
        </header>

        {/* Auto-linking status banners */}
        {isLinking && (
          <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl border border-blue-100 bg-[#eff6ff] px-5 py-3 text-xs font-bold text-blue-700 lg:mx-8">
            <div className="h-2.5 w-2.5 animate-ping rounded-full bg-blue-500" />
            Verifying and establishing link with your child...
          </div>
        )}
        {linkingSuccess && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-xs font-bold text-emerald-700 lg:mx-8">
            <span>🎉 {linkingSuccess}</span>
            <button onClick={() => setLinkingSuccess(null)} className="px-2 py-1 font-black hover:text-emerald-950">Dismiss</button>
          </div>
        )}
        {linkingError && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700 lg:mx-8">
            <span>⚠️ {linkingError}</span>
            <button onClick={() => setLinkingError(null)} className="px-2 py-1 font-black hover:text-rose-950">Dismiss</button>
          </div>
        )}

        <div className="mt-3 px-4 lg:px-8">
          <PortalProgressBar />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 lg:px-8 lg:pb-8">
          <div className="rounded-[28px] border border-white/60 bg-white/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm sm:p-6 lg:p-7">
            {content}
          </div>
        </main>
      </div>

      <ConnectChildDialog
        open={showConnectPrompt}
        parentName={parentName}
        email={parentProfile?.email}
        pending={pendingStudents}
        avatars={pendingAvatars}
        onRefresh={refreshStudents}
        onDismiss={dismissConnect}
      />
    </div>
    </PortalBusyProvider>
  );
}

type DashboardView = ReturnType<typeof useParentStore.getState>["activeDashboardView"];

/**
 * Which page a portal URL names. `view` is null for bare /parent, where the
 * picker or the store's own choice decides.
 */
export function routeFromPath(pathname: string): { view: DashboardView | null; studentId: string | null } {
  const [, id, section] = pathname.split("/").filter(Boolean);
  if (id === "profile") return { view: "profile", studentId: null };
  if (!id) return { view: null, studentId: null };
  if (section === "schedule" && !FEATURES.schedule) return { view: "analytics", studentId: id };
  if (section === "report" || section === "subject" || section === "chat" || section === "schedule" || section === "moments") {
    return { view: section, studentId: id };
  }
  return { view: "analytics", studentId: id };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
