"use client";

import { PartnerRequestModal } from "@/features/student/components/PartnerRequestModal";
import { CompleteProfileBanner } from "@/features/student/components/CompleteProfileBanner";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { GeneralOnboardingWizard } from "@/features/onboarding/components/GeneralOnboarding/GeneralOnboardingWizard";
import { OnboardingPromptCard } from "@/features/onboarding/components/OnboardingPromptCard";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { notificationService } from "@/services/notificationService";
import { ToastStack, ToastItem } from "@/features/teacher/components/Toast";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { studentProfile } = useStudentStore();
  const { dnaStatus, checkDNAStatus } = useOnboardingStore();
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (toast: Omit<ToastItem, "id">) => {
    setToasts((prev) => [...prev, { ...toast, id: Date.now() + Math.random() }]);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (studentProfile?.user_id) {
      checkDNAStatus(studentProfile.user_id);
    }
  }, [studentProfile, checkDNAStatus]);

  // Subscribe to real-time notification stream (SSE)
  useEffect(() => {
    if (!studentProfile?.user_id) return;

    console.log("Initializing SSE notification stream for student layout...");
    const unsubscribe = notificationService.subscribeToStream(
      studentProfile.user_id,
      (data) => {
        // Show success style for live sessions, otherwise success/error
        const toastType = data.type === "ERROR" || data.type === "WARNING" ? "error" : "success";
        pushToast({
          type: toastType,
          title: data.title || "Reminder",
          description: data.message,
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [studentProfile]);

  const isProfileIncomplete = studentProfile && !studentProfile.name;

  // Only show the onboarding prompt on the main student home page.
  // Sub-pages (report card, settings, sessions, etc.) shouldn't be interrupted.
  const isHomePage = pathname === "/student";

  return (
    <>
      {children}

      {/* Global Student Modals */}
      <PartnerRequestModal />

      {/* Profile completion prompt for new users — home page only */}
      {isProfileIncomplete && isHomePage && (
        <CompleteProfileBanner studentProfile={studentProfile} />
      )}

      {/* Optional onboarding — non-blocking prompt card, home page only */}
      {dnaStatus === "PENDING" && studentProfile && !showOnboardingWizard && !isProfileIncomplete && isHomePage && (
        <OnboardingPromptCard
          onStart={() => setShowOnboardingWizard(true)}
          userId={studentProfile.user_id}
        />
      )}

      {/* Onboarding wizard — shown on any page once the user clicks "Start" */}
      {showOnboardingWizard && studentProfile && (
        <GeneralOnboardingWizard
          studentProfile={studentProfile}
          onComplete={() => {
            checkDNAStatus(studentProfile.user_id);
            setShowOnboardingWizard(false);
          }}
        />
      )}

      {/* Global Real-time Toasts stack */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
