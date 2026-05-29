"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentReportCard } from "@/components/report-card/StudentReportCard";
import { StudentHomeSidebar } from "@/features/student/components/StudentHomeSidebar";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { ArrowLeft } from "lucide-react";

export default function ReportCardPage() {
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

  // ── Print mode: no app shell, just the report with print CSS applied ──
  if (isPrintMode) {
    return (
      <>
        {/* Print-specific CSS — let Chromium's paginator do its job */}
        <style jsx global>{`
          @page {
            size: A4;
            margin: 10mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-root {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          /* Sections: unlock overflow/radius for PDF flow.
             Page-breaks are handled exclusively by .pb sentinel divs
             via the component's @media print rules — no break-before
             here to avoid double-breaks (blank pages between sections). */
          .section {
            overflow: visible !important;
            border-radius: 0 !important;
            margin-bottom: 0 !important;
          }

          /* Collapse two-column split grids to vertical stacking.
             Chromium's print engine defers CSS grids containing
             break-inside:avoid children to the next page as a unit,
             leaving a blank gap after the section heading. Block flow
             fixes this — narrative text first, rail/cards below. */
          .split {
            display: block !important;
          }
          .split .narrative {
            max-width: 100% !important;
            margin-bottom: 24px !important;
          }
          .split .rail {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid #E2E8F0 !important;
            padding-top: 20px !important;
          }
          /* Hide UI-only elements on screen.
             .pb sentinels are hidden here but @media print in the component
             overrides them to display:block with break-before:page. */
          .print-btn, .pb, .print-hide {
            display: none !important;
          }
          /* Ensure colors render in PDF */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `}</style>
        <StudentReportCard />
      </>
    );
  }

  // ── Normal mode: full app shell with sidebar + back button ─────────────
  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "#F7F6F3" }}>
      <div>
        <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
              ☰
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
              fontFamily: "'DM Sans', sans-serif",
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

          <div style={{ marginLeft: "auto", fontSize: 13, color: "#999", fontFamily: "'DM Sans', sans-serif" }}>
            Report Card
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <StudentReportCard />
        </div>
      </main>
    </div>
  );
}
