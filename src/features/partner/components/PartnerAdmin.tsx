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

export function PartnerAdmin() {
  const router = useRouter();
  const pathname = usePathname();

  // Derive active view from URL
  const activeView: "subjects" | "analytics" = pathname === '/partner/analytics' ? 'analytics' : 'subjects';

  const [showUploadModal, setShowUploadModal] = useState(false);

  const rawPartnerId = typeof window !== 'undefined' ? localStorage.getItem("gened_partner_id") : null;
  const partnerId = rawPartnerId?.replace(/['"]+/g, "");

  return (
    <div className="flex h-screen bg-[#F8F9F8] overflow-hidden">
      {/* Navigation Sidebar */}
      <SideBar 
        activeView={activeView} 
        onViewChange={(view) => router.push(view === 'subjects' ? '/partner' : '/partner/analytics')} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9F8]">
        {/* Top Navbar */}
        <header className="h-[88px] shrink-0 border-b border-[#1A3D2C]/5 bg-white/40 flex items-center justify-between px-8 lg:px-12 z-50 transition-all">
          <div className="flex-1">
             <h2 className="text-xl font-black text-[#1A3D2C] hidden lg:block tracking-tight">
               {activeView === "subjects" ? "Academic Registry" : "Enrollment Overview"}
             </h2>
          </div>
          <div className="flex items-center gap-4">
            {partnerId && <NotificationBell userId={partnerId} align="right" />}
            
            <button className="w-10 h-10 rounded-xl bg-white border border-[#1A3D2C]/10 shadow-sm hover:shadow-md hover:border-[#1A3D2C]/20 text-[#1A3D2C] transition-all flex items-center justify-center">
              <User size={18} />
            </button>
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
                <SubjectRegistry onUploadClick={() => setShowUploadModal(true)} />
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
            <CurriculumIngestion 
              onClose={() => setShowUploadModal(false)}
              activeAgentId={null} // Passing null as per initial structure
              agents={[]} // Placeholder for now
              onAddAgent={() => {}} 
              onExtractionComplete={() => {}}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
