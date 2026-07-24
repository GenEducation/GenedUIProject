"use client";

import { Suspense, useEffect, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentReportCard } from "@/components/report-card/StudentReportCard";
import { StudentHomeSidebar } from "@/features/student/components/StudentHomeSidebar";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useSidebarStore } from "@/features/student/store/useSidebarStore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArrowLeft, ClipboardList, Menu } from "lucide-react";

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
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-6 left-4 z-30 flex items-center justify-center rounded-[10px] cursor-pointer text-base transition-all"
          style={{ width: 40, height: 40, background: "#FFFFFF", border: "1px solid #E2E8F0", color: "var(--primary-ink)" }}
          title="Open sidebar"
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>
      )}

      <div className="flex-1 min-w-0 flex flex-col h-full bg-[#F4F3EE]/30 overflow-hidden font-sans">
        {/* Header */}
        <header className={`px-4 sm:px-8 py-6 flex items-center gap-3 sm:gap-6 bg-white border-b border-[var(--primary-ink)]/5 sticky top-0 z-20 transition-all ${!sidebarOpen ? "pl-16 sm:pl-8" : ""}`}>
          <button
            onClick={() => router.push("/student")}
            className="w-10 h-10 rounded-full bg-[var(--primary-ink)]/5 text-[var(--primary-ink)] flex items-center justify-center hover:bg-[var(--primary-ink)]/10 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--primary-ink)]/5 flex items-center justify-center text-[var(--primary-ink)]">
                <ClipboardList size={16} />
              </div>
              <h1 className="text-xl font-black text-[var(--primary-ink)] tracking-tight">Report Card</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <StudentReportCard />
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
