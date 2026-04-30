"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { StudentHome } from "./StudentHome";
import { StudentChatView } from "./StudentChatView";
import { StudentProfile } from "./StudentProfile";
import { StudentAnalyticsDashboard } from "@/components/analytics/StudentAnalyticsDashboard";
import { PartnerRequestModal } from "./PartnerRequestModal";
import { useStudentStore } from "../store/useStudentStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";

/**
 * StudentPortal renders the correct sub-view based on the current URL path.
 * This replaces the old flag-based (isChatOpen, isProfileOpen, isAnalyticsOpen) approach.
 */
export function StudentPortal() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { studentProfile } = useStudentStore();
  const { dnaStatus, checkDNAStatus } = useOnboardingStore();

  useEffect(() => {
    if (studentProfile?.user_id) {
      checkDNAStatus(studentProfile.user_id);
    }
  }, [studentProfile, checkDNAStatus]);

  useEffect(() => {
    if (dnaStatus === "PENDING" && pathname !== "/student/onboarding") {
      router.replace("/student/onboarding");
    }
  }, [dnaStatus, pathname, router]);

  const isChatRoute = pathname === "/student/chat";
  const isProfileRoute = pathname === "/student/profile";
  const isAnalyticsRoute = pathname === "/student/analytics";

  return (
    <div className="h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {isAnalyticsRoute ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
            <StudentAnalyticsDashboard />
          </motion.div>
        ) : isProfileRoute ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="h-full overflow-y-auto"
          >
            <StudentProfile />
          </motion.div>
        ) : isChatRoute ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="h-full"
          >
            <StudentChatView />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="h-full overflow-y-auto"
          >
            <StudentHome />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enrollment Status Modal */}
      <PartnerRequestModal />
    </div>
  );
}
