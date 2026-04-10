"use client";

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { usePartnerStore } from "../store/usePartnerStore";
import { StudentDetailsModal } from "./StudentDetailsModal";
import { StudentRegistryTable } from "./StudentRegistryTable";
import { PendingRequestsSidebar } from "./PendingRequestsSidebar";
import { TotalEnrollmentsStat } from "./TotalEnrollmentsStat";

export function EnrollmentAdmin() {
  const selectedStudent = usePartnerStore((state) => state.selectedStudent);
  const setSelectedStudent = usePartnerStore((state) => state.setSelectedStudent);
  const approveRequest = usePartnerStore((state) => state.approveRequest);
  const rejectRequest = usePartnerStore((state) => state.rejectRequest);
  const fetchStudents = usePartnerStore((state) => state.fetchStudents);

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div className="flex-1 px-4 md:px-12 pt-8 md:pt-12 pb-8 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0 mb-4 md:mb-6">
        <div className="space-y-2 max-w-2xl">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#1A3D2C] tracking-tight">Analytics</h2>
        </div>
        <div className="flex items-center gap-3 px-3 py-1.5 md:px-4 md:py-2 bg-[#F8F9F8] rounded-full border border-[#1A3D2C]/5">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#1A3D2C] rounded-full animate-pulse" />
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">Live Updates</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 min-h-0 overflow-y-auto lg:overflow-hidden scrollbar-hide">
        {/* Left: Student Registry Table */}
        <StudentRegistryTable />

        {/* Right: Sidebar Cards */}
        <div className="lg:col-span-4 space-y-6 md:gap-8 flex flex-col min-h-0">
          <TotalEnrollmentsStat />
          <PendingRequestsSidebar />
        </div>
      </div>

      {/* Student Details Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentDetailsModal
            studentId={selectedStudent.id}
            studentName={selectedStudent.name}
            grade={selectedStudent.grade}
            status={selectedStudent.status}
            onClose={() => setSelectedStudent(null)}
            onAccept={approveRequest}
            onReject={rejectRequest}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
