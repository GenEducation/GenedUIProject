"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentReportCard } from "@/components/report-card/StudentReportCard";
import { StudentHomeSidebar } from "@/features/student/components/StudentHomeSidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArrowLeft } from "lucide-react";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

  return (
    <AuthGuard requiredRole="student">
      <div className="flex h-screen overflow-hidden relative" style={{ background: "#F7F6F3" }}>
        <div>
          <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {/* Top bar */}
          <div
            className="flex items-center gap-3 flex-shrink-0 px-5"
            style={{ height: 52, borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}
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
              style={{ background: "transparent", color: "#666", fontSize: 13, fontWeight: 500, padding: "6px 10px", fontFamily: "'DM Sans', sans-serif" }}
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
    </AuthGuard>
  );
}
