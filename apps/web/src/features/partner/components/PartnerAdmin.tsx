"use client";

import { useState } from "react";
import { SideBar } from "./SideBar";
import { SubjectRegistry } from "./SubjectRegistry";
import { EnrollmentAdmin } from "./EnrollmentAdmin";
import { CurriculumIngestion } from "./CurriculumIngestion";
import { AnimatePresence, motion } from "framer-motion";

export function PartnerAdmin() {
  const [activeView, setActiveView] = useState<"subjects" | "analytics">("subjects");
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8F9F8] overflow-hidden">
      {/* Navigation Sidebar */}
      <SideBar 
        activeView={activeView} 
        onViewChange={(view) => setActiveView(view)} 
      />

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === "subjects" ? (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <SubjectRegistry onUploadClick={() => setShowUploadModal(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <EnrollmentAdmin />
            </motion.div>
          )}
        </AnimatePresence>

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
