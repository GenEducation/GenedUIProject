"use client";

import { PartnerRequestModal } from "@/features/student/components/PartnerRequestModal";
import { CompleteProfileBanner } from "@/features/student/components/CompleteProfileBanner";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { GeneralOnboardingWizard } from "@/features/onboarding/components/GeneralOnboarding/GeneralOnboardingWizard";
import { OnboardingPromptCard } from "@/features/onboarding/components/OnboardingPromptCard";
import { useEffect, useState } from "react";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { studentProfile } = useStudentStore();
  const { dnaStatus, checkDNAStatus } = useOnboardingStore();
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);

  useEffect(() => {
    if (studentProfile?.user_id) {
      checkDNAStatus(studentProfile.user_id);
    }
  }, [studentProfile, checkDNAStatus]);

  const isProfileIncomplete = studentProfile && !studentProfile.name;

  return (
    <>
      {children}

      {/* Global Student Modals */}
      <PartnerRequestModal />

      {/* Profile completion prompt for new users */}
      {isProfileIncomplete && (
        <CompleteProfileBanner studentProfile={studentProfile} />
      )}

      {/* Optional onboarding — non-blocking prompt card */}
      {dnaStatus === "PENDING" && studentProfile && !showOnboardingWizard && !isProfileIncomplete && (
        <OnboardingPromptCard
          onStart={() => setShowOnboardingWizard(true)}
          userId={studentProfile.user_id}
        />
      )}

      {/* Onboarding wizard — only shown when user clicks "Start" */}
      {showOnboardingWizard && studentProfile && (
        <GeneralOnboardingWizard
          studentProfile={studentProfile}
          onComplete={() => {
            checkDNAStatus(studentProfile.user_id);
            setShowOnboardingWizard(false);
          }}
        />
      )}
    </>
  );
}
