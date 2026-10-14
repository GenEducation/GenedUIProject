"use client";

import { PartnerRequestModal } from "@/features/student/components/PartnerRequestModal";
import { TestReadyModal } from "@/features/student/components/TestReadyModal";
import { CompleteProfileBanner } from "@/features/student/components/CompleteProfileBanner";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { PlacementGate } from "@/features/placement/components/PlacementGate";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/store/useNotificationStore";
import { ToastStack, ToastItem } from "@/features/teacher/components/Toast";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { studentProfile } = useStudentStore();
  const { fetchNotifications, initStream } = useNotificationStore();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (toast: Omit<ToastItem, "id">) => {
    setToasts((prev) => [...prev, { ...toast, id: Date.now() + Math.random() }]);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch notification history so the bell's unread badge is correct before the bell mounts
  useEffect(() => {
    if (!studentProfile?.user_id) return;
    fetchNotifications(studentProfile.user_id);

    const onFocus = () => fetchNotifications(studentProfile.user_id);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [studentProfile, fetchNotifications]);

  // Subscribe to real-time notification stream (SSE) via the shared notification store
  useEffect(() => {
    if (!studentProfile?.user_id) return;

    console.log("Initializing SSE notification stream for student layout...");
    const unsubscribe = initStream(studentProfile.user_id, (data) => {
      // Show success style for live sessions, otherwise success/error
      const toastType = data.type === "ERROR" || data.type === "WARNING" ? "error" : "success";
      pushToast({
        type: toastType,
        title: data.title || "Reminder",
        description: data.message,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [studentProfile, initStream]);

  const isProfileIncomplete = studentProfile && !studentProfile.name;

  // Only prompt for a missing profile on the main student home page.
  // Sub-pages (report card, settings, sessions, etc.) shouldn't be interrupted.
  const isHomePage = pathname === "/student";

  return (
    <>
      {children}

      {/* Global Student Modals */}
      <PartnerRequestModal />

      {/* Asks what to do with a test that finished generating — mounted here
          because generation often outlives the page that started it. */}
      <TestReadyModal />

      {/* Profile completion prompt for new users — home page only */}
      {isProfileIncomplete && isHomePage && (
        <CompleteProfileBanner studentProfile={studentProfile} />
      )}

      {/* Placement test. Mounted here, not on a page, because an attempt
          outlives any one route — and because the gate itself must wait for
          CompleteProfileBanner above to finish collecting the student's name
          and their AI companion's name first. */}
      <PlacementGate />

      {/* Global Real-time Toasts stack */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
