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
import { SiteTutorial, TutorialStep } from "@/components/shared/SiteTutorial";
import { useState } from "react";

/**
 * StudentPortal renders the correct sub-view based on the current URL path.
 * The default view is the Chat Hub, with dedicated routes for Profile and Analytics.
 */
export function StudentPortal() {
  const pathname = usePathname();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  
  const { studentProfile } = useStudentStore();
  const { dnaStatus, checkDNAStatus } = useOnboardingStore();

  useEffect(() => {
    if (studentProfile?.user_id) {
      checkDNAStatus(studentProfile.user_id);
    }
  }, [studentProfile, checkDNAStatus]);

  useEffect(() => {
    const isNewUser = localStorage.getItem("gened_new_user") === "true";
    if (isNewUser && dnaStatus === "COMPLETED") {
      setIsTutorialOpen(true);
    }
  }, [dnaStatus]);
  const isProfileRoute = pathname === "/student/profile";
  const isAnalyticsRoute = pathname === "/student/analytics";

  const tutorialSteps: TutorialStep[] = [
    {
      target: '[data-tutorial="logo"]',
      title: "Welcome to GenEd!",
      description: "This is your learning sanctuary. Let's take a quick tour of your new tools.",
      position: "bottom"
    },
    {
      target: '[data-tutorial="new-chat"]',
      title: "Learning Chat Hub",
      description: "Start a Socratic conversation here to master any subject through deep inquiry.",
      position: "bottom"
    },
    {
      target: '[data-tutorial="analytics-nav"]',
      title: "Academic Analytics",
      description: "Track your strengths, interests, and cognitive growth in real-time.",
      position: "top"
    },
    {
      target: '[data-tutorial="profile-nav"]',
      title: "Personal Profile",
      description: "Customize your identity and manage connections to guardians and schools.",
      position: "top"
    },
  ];

  if (isProfileRoute) {
    tutorialSteps.push(
      {
        target: '[data-tutorial="parent-access"]',
        title: "Guardian Access",
        description: "Add your parent's email here so they can stay updated on your progress.",
        position: "top"
      },
      {
        target: '[data-tutorial="partner-requests"]',
        title: "School Partners",
        description: "Connect with your institution here to access specialized curriculum.",
        position: "top"
      }
    );
  }

  const handleTutorialComplete = () => {
    setIsTutorialOpen(false);
    localStorage.removeItem("gened_new_user");
  };

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

      {/* Site Tutorial */}
      {isTutorialOpen && (
        <SiteTutorial
          steps={tutorialSteps}
          onComplete={handleTutorialComplete}
          onClose={() => setIsTutorialOpen(false)}
        />
      )}
    </div>
  );
}
