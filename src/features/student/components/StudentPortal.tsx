"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { StudentChatView } from "./StudentChatView";
import { StudentProfile } from "./StudentProfile";
import { StudentAnalyticsDashboard } from "@/components/analytics/StudentAnalyticsDashboard";
import { PartnerRequestModal } from "./PartnerRequestModal";
import { useStudentStore } from "../store/useStudentStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { OnboardingSliderView } from "@/features/onboarding/components/OnboardingSliderView";
import { SiteTutorial } from "@/components/shared/SiteTutorial";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

/**
 * StudentPortal renders the correct sub-view based on the current URL path.
 * The default view is the Chat Hub, with dedicated routes for Profile and Analytics.
 */
export function StudentPortal() {
  const pathname = usePathname();
  
  const { studentProfile } = useStudentStore();
  const { startTutorial } = useTutorialStore();
  const { dnaStatus, checkDNAStatus } = useOnboardingStore();

  useEffect(() => {
    if (studentProfile?.user_id) {
      checkDNAStatus(studentProfile.user_id);
    }
  }, [studentProfile, checkDNAStatus]);

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

      {/* Enrollment Status Modal */}
      <PartnerRequestModal />

      {/* Onboarding Slider Overlay */}
      {dnaStatus === "PENDING" && studentProfile && (
        <OnboardingSliderView
          studentProfile={studentProfile}
          onComplete={() => checkDNAStatus(studentProfile.user_id)}
        />
      )}
    </div>
  );
}
