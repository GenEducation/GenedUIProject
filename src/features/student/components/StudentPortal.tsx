"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { StudentChatView } from "./StudentChatView";
import { StudentHome } from "./StudentHome";
import { StudentProfile } from "./StudentProfile";
import { AssessmentsPage } from "@/features/student/components/AssessmentsPage";
import { StudentAnalyticsDashboard } from "@/components/analytics/StudentAnalyticsDashboard";

/**
 * StudentPortal renders the correct sub-view based on the current URL path.
 * The default view is the Chat Hub, with dedicated routes for Profile and Analytics.
 */
export function StudentPortal() {
  const pathname = usePathname();
  
  const isProfileRoute = pathname === "/student/profile";
  const isAssessmentsRoute = pathname === "/student/assessments";
  const isAnalyticsRoute = pathname === "/student/analytics";
  const isChatRoute = pathname?.startsWith("/student/chat");

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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <StudentProfile />
          </motion.div>
        ) : isAssessmentsRoute ? (
          <motion.div
            key="assessments"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AssessmentsPage />
          </motion.div>
        ) : isChatRoute ? (
          <motion.div
            key="chat-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <StudentChatView />
          </motion.div>
        ) : (
          <motion.div
            key="home-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <StudentHome />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
