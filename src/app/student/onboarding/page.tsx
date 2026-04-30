"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { OnboardingChatView } from "@/features/onboarding/components/OnboardingChatView";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { studentProfile } = useStudentStore();
  const { startOnboarding, isComplete, type, subject: storeSubject, clearSession } = useOnboardingStore();

  const queryType = searchParams?.get("type") === "subject" ? "subject" : "general";
  const querySubject = searchParams?.get("subject") || undefined;
  const queryGrade = Number(searchParams?.get("grade")) || undefined;

  useEffect(() => {
    if (!studentProfile) return;

    // Start onboarding session if not already started, or if switching subjects
    if (!type || (queryType === "subject" && querySubject !== storeSubject)) {
      startOnboarding(studentProfile.user_id, queryType, querySubject, queryGrade);
    }
  }, [studentProfile, startOnboarding, type, queryType, querySubject, queryGrade, storeSubject]);

  useEffect(() => {
    if (isComplete) {
      // Mark DNA as completed locally to prevent immediate loops
      if (studentProfile?.user_id) {
        useOnboardingStore.getState().checkDNAStatus(studentProfile.user_id);
      }
      
      // Cleanup session
      clearSession();
      
      // Redirect based on type
      if (queryType === "subject") {
        router.replace("/student"); // Could go back to analytics/chat based on where they came from
      } else {
        router.replace("/student");
      }
    }
  }, [isComplete, queryType, router, clearSession]);

  if (!studentProfile) return null;

  return (
    <div className="h-screen bg-[#F4F3EE] flex flex-col">
      <OnboardingChatView />
    </div>
  );
}
