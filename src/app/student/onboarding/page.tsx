"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { OnboardingChatView } from "@/features/onboarding/components/OnboardingChatView";

function OnboardingContent() {
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
  }, [isComplete, queryType, router, clearSession, studentProfile?.user_id]);

  if (!studentProfile) return null;

  return (
    <div className="h-screen bg-[#F4F3EE] flex flex-col">
      <OnboardingChatView />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#F4F3EE] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#1a3a2a]/10 border-t-[#1a3a2a] rounded-full animate-spin" />
        <p className="text-sm font-bold text-[#1a3a2a]/40 uppercase tracking-widest animate-pulse">
          Initializing Assessment...
        </p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
