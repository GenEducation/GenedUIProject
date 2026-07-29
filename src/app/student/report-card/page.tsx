"use client";

import { Suspense, useEffect, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentReportCard } from "@/components/report-card/StudentReportCard";
import { StudentHomeSidebar } from "@/features/student/components/StudentHomeSidebar";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useSidebarStore } from "@/features/student/store/useSidebarStore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/student/PageHeader";
import { SidebarToggle } from "@/components/student/SidebarToggle";

export default function ReportCardPage() {
  // StudentReportCard reads useSearchParams() (dev `?simulate=`), which must
  // be inside a Suspense boundary or Next.js fails the production build when
  // statically prerendering this route.
  return (
    <Suspense fallback={null}>
      <ReportCardPageInner />
    </Suspense>
  );
}

function ReportCardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPrintMode = searchParams.get("print") === "1";

  // ── Print mode: hydrate the store from localStorage ──────────────────────
  // When Puppeteer navigates directly to ?print=1 it bypasses the root page
  // which normally calls setStudentProfile(). Without this, studentProfile is
  // null → studentId is null → fetchAll() returns early → no data loads →
  // the loading spinner stays forever and Puppeteer's waitForSelector times out.
  //
  // useLayoutEffect fires synchronously after the DOM is committed but before
  // paint. This means by the time StudentReportCard runs its own useEffect for
  // data fetching, studentProfile is already set → API calls start immediately
  // → networkidle0 stays busy until all data is fetched.
  useLayoutEffect(() => {
    if (!isPrintMode) return;
    if (useStudentStore.getState().studentProfile) return; // already hydrated

    const profileStr = localStorage.getItem("gened_user_profile");
    if (!profileStr) return;

    try {
      const p = JSON.parse(profileStr);
      useStudentStore.getState().setStudentProfile({
        user_id:          p.user_id,
        username:         p.username,
        email:            p.email,
        role:             p.role,
        name:             p.name,
        grade:            p.grade,
        school_board:     p.school_board,
        ai_name:          p.ai_name,
        preferred_voice:  p.preferred_voice,
        plan:             p.plan,
        plan_expires_at:  p.plan_expires_at,
      });
    } catch {
      // malformed profile — fetchAll will simply not run
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();

  useEffect(() => {
    applyResponsive(window.innerWidth >= 1024);
  }, [applyResponsive]);

  // Wrapped in AuthGuard (like every other /student/* route) so it hydrates
  // studentProfile from localStorage on a cold load/refresh. Without it,
  // studentId was undefined → fetchAll() early-returned → the spinner hung
  // forever and the sidebar showed the empty "Student · FREE · Grade —".
  return (
    <AuthGuard requiredRole="student">
    <div className="flex h-screen overflow-hidden relative">
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
      <SidebarToggle />

      <div className="flex-1 min-w-0 flex flex-col h-full bg-[var(--surface-page)] overflow-hidden font-sans">
        <PageHeader
          icon={<ClipboardList size={16} />}
          title="Report Card"
          onBack={() => router.push("/student")}
          sidebarOpen={sidebarOpen}
        />

        <div className="flex-1 overflow-y-auto">
          <StudentReportCard />
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
