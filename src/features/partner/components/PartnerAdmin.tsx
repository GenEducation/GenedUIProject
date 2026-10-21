"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SideBar } from "./SideBar";
import { SubjectRegistry } from "./SubjectRegistry";
import { EnrollmentAdmin } from "./EnrollmentAdmin";
import { CurriculumIngestion } from "./CurriculumIngestion";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationBell } from "@/components/NotificationBell";
import { User } from "lucide-react";
import { GenEdLogo } from "@/components/shared/GenEdLogo";
import { usePartnerStore, type Subject } from "../store/usePartnerStore";
import { LabSetup } from "@/features/lab/components/LabSetup";

export function PartnerAdmin() {
  const router = useRouter();
  const pathname = usePathname();

  // Derive active view from URL - Analytics is now the default
  const activeView: "subjects" | "analytics" | "labs" =
    pathname === "/partner/subjects" ? "subjects" : pathname === "/partner/labs" ? "labs" : "analytics";

  const showUploadModal = usePartnerStore((state) => state.showUploadModal);
  // The chapter an "Upload again" came from, to prefill the form; null for a fresh upload.
  const [uploadPrefill, setUploadPrefill] = useState<Subject | null>(null);
  const setShowUploadModal = usePartnerStore((state) => state.setShowUploadModal);

  const rawPartnerId = typeof window !== 'undefined' ? localStorage.getItem("gened_partner_id") : null;
  const partnerId = rawPartnerId?.replace(/['"]+/g, "");

  return (
    <div className="portal-legacy-type flex h-screen bg-[#F6F7F2] overflow-hidden">
      {/* Navigation Sidebar */}
      <SideBar
        activeView={activeView}
        onViewChange={(view) =>
          router.push(view === "analytics" ? "/partner" : view === "subjects" ? "/partner/subjects" : "/partner/labs")
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F6F7F2]">
        {/* Top Navbar */}
        <header className="relative h-16 md:h-[88px] shrink-0 border-b border-[#122D30]/5 bg-white/40 flex items-center justify-between gap-3 px-4 md:px-8 lg:px-12 z-50 transition-all">
          <div className="flex-1 min-w-0">
             {/* On a phone the centred logo has the bar to itself; the rail's highlighted icon says which page this is. */}
             <h2 className="hidden sm:block truncate text-lg md:text-xl font-black text-[#122D30] tracking-tight">
               {activeView === "subjects" ? "Subjects" : activeView === "labs" ? "Lab Mode" : "Analytics"}
             </h2>
          </div>
          {/* Below lg the sidebar is a rail without the logo: the logo sits in the middle of this bar instead. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:hidden">
            <GenEdLogo height={30} className="md:h-9 md:w-auto" />
          </div>
          <div className="flex items-center gap-4">
            {partnerId && <NotificationBell userId={partnerId} align="right" />}
          </div>
        </header>

        {/* Content View */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeView === "subjects" ? (
              <motion.div
                key="subjects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col h-full"
              >
                <SubjectRegistry onUploadClick={(prefill) => { setUploadPrefill(prefill ?? null); setShowUploadModal(true); }} />
              </motion.div>
            ) : activeView === "labs" ? (
              <motion.div
                key="labs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                <LabSetup partnerId={partnerId || ""} />
              </motion.div>
            ) : (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col h-full"
              >
                <EnrollmentAdmin />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showUploadModal && (
            <CurriculumIngestion prefill={uploadPrefill} onClose={() => setShowUploadModal(false)} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
