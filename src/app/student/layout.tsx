"use client";

import { PartnerRequestModal } from "@/features/student/components/PartnerRequestModal";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { OnboardingSliderView } from "@/features/onboarding/components/OnboardingSliderView";
import { useEffect } from "react";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { studentProfile } = useStudentStore();
  const { dnaStatus, checkDNAStatus } = useOnboardingStore();

  useEffect(() => {
    if (studentProfile?.user_id) {
      checkDNAStatus(studentProfile.user_id);
    }
  }, [studentProfile, checkDNAStatus]);

  return (
    <>
      {children}
      
      {/* Global Student Modals */}
      <PartnerRequestModal />

      {/* Onboarding Slider Overlay */}
      {dnaStatus === "PENDING" && studentProfile && (
        <OnboardingSliderView
          studentProfile={studentProfile}
          onComplete={() => checkDNAStatus(studentProfile.user_id)}
        />
      )}
    </>
  );
}
