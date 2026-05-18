"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { StudentChatView } from "./StudentChatView";
import { StudentProfile } from "./StudentProfile";
import { AssessmentsPage } from "@/features/student/components/AssessmentsPage";
import { StudentAnalyticsDashboard } from "@/components/analytics/StudentAnalyticsDashboard";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

/**
 * StudentPortal renders the correct sub-view based on the current URL path.
 * The default view is the Chat Hub, with dedicated routes for Profile and Analytics.
 */
export function StudentPortal() {
  const pathname = usePathname();
  
  const { dnaStatus } = useOnboardingStore();
  const { startTutorial } = useTutorialStore();

  useEffect(() => {
    const isNewUser = localStorage.getItem("gened_new_user") === "true";
    const justFinishedOnboarding = localStorage.getItem("start_tutorial_after_onboarding") === "true";
    
    if ((isNewUser || justFinishedOnboarding) && dnaStatus && dnaStatus !== "PENDING") {
      startTutorial();
      localStorage.removeItem("gened_new_user");
      localStorage.removeItem("start_tutorial_after_onboarding");
    }
  }, [dnaStatus, startTutorial]);
  
  const isProfileRoute = pathname === "/student/profile";
  const isAssessmentsRoute = pathname === "/student/assessments";
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
        ) : (
          <motion.div
            key="chat-hub-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <StudentChatView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
