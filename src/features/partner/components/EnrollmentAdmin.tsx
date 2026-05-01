"use client";

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { usePartnerStore } from "../store/usePartnerStore";
import { useNotificationStore } from "@/store/useNotificationStore";
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

  const unreadCount = useNotificationStore((state) => state.unreadCount);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Live Refresh: Whenever a new notification arrives, re-fetch the student list
  // to ensure the "Pending Requests" and "Student Registry" are up to date.
  useEffect(() => {
    if (unreadCount > 0) {
      console.log("🔄 Live Sync: New notification detected, refreshing enrollment data...");
      fetchStudents();
    }
  }, [unreadCount, fetchStudents]);

  return (
    <div className="flex-1 px-4 md:px-12 pt-8 md:pt-12 pb-8 bg-white flex flex-col min-h-0 overflow-hidden">
      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 min-h-0 overflow-hidden scrollbar-hide">
        {/* Left: Student Registry Table */}
        <StudentRegistryTable />

        {/* Right: Sidebar Cards */}
        <div className="lg:col-span-4 flex flex-col gap-6 md:gap-8 min-h-0 h-full">
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
