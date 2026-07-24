"use client";

<<<<<<< Updated upstream
import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentReportCard } from "@/components/report-card/StudentReportCard";
import { StudentHomeSidebar } from "@/features/student/components/StudentHomeSidebar";
=======
import { Suspense, useEffect, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentReportCard } from "@/components/report-card/StudentReportCard";
import { StudentHomeSidebar } from "@/features/student/components/StudentHomeSidebar";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useSidebarStore } from "@/features/student/store/useSidebarStore";
>>>>>>> Stashed changes
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArrowLeft, Menu } from "lucide-react";

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
<<<<<<< Updated upstream
  const [sidebarOpen, setSidebarOpen] = useState(false);
=======
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
>>>>>>> Stashed changes

  useEffect(() => {
    applyResponsive(window.innerWidth >= 1024);
  }, [applyResponsive]);

  // Wrapped in AuthGuard (like every other /student/* route) so it hydrates
  // studentProfile from localStorage on a cold load/refresh. Without it,
  // studentId was undefined → fetchAll() early-returned → the spinner hung
  // forever and the sidebar showed the empty "Student · FREE · Grade —".
  return (
    <AuthGuard requiredRole="student">
    <div className="flex h-screen overflow-hidden relative" style={{ background: "#F7F6F3" }}>
      <div>
        <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
      </div>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="flex items-center gap-3 flex-shrink-0 px-5"
          style={{
            height: 52,
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            background: "#fff",
          }}
        >
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all"
              style={{ background: "rgba(0,0,0,0.05)", color: "#444", fontSize: 16 }}
              title="Open sidebar"
            >
              <Menu size={16} strokeWidth={1.75} />
            </button>
          )}

          <button
            onClick={() => router.push("/student")}
            className="flex items-center gap-1.5 rounded-lg border-none cursor-pointer transition-all"
            style={{
              background: "transparent",
              color: "#666",
              fontSize: 13,
              fontWeight: 500,
              padding: "6px 10px",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.05)";
              e.currentTarget.style.color = "#222";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#666";
            }}
          >
            <ArrowLeft size={15} />
            <span>Back to Home</span>
          </button>

          <div style={{ marginLeft: "auto", fontSize: 13, color: "#999", fontFamily: "var(--font-body)" }}>
            Report Card
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <StudentReportCard />
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
