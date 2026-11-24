"use client";

import React, { useEffect } from "react";
import { StudyDeckLoader } from "./StudyDeck/StudyDeckLoader";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { clearResumeCover, resumeLoaderAfterReload } from "@/features/auth/leaveWithLoader";
import { waitForPageVisuals } from "./waitForPageVisuals";

export const GlobalLoader = () => {
  const {
    isVisible, isComplete, isHandoff, onCelebrated, stopLoading,
    reason,
  } = useLoaderStore();

  // A logout reloads the page; if one is mid-flight, pick the deck back up
  // here and let it go once the home page's visuals have loaded.
  useEffect(() => {
    if (!resumeLoaderAfterReload()) return;
    const raf = requestAnimationFrame(clearResumeCover);
    let cancelled = false;
    void waitForPageVisuals().then(() => {
      const loader = useLoaderStore.getState();
      if (!cancelled && loader.isVisible) loader.finishLoading();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);
  // Undefined for non-student roles and during login, which is fine — the fact
  // picker falls back to the full pool when no subject applies.
  const subject = useStudentStore((s) => s.activeChat?.subject);

  return (
    <StudyDeckLoader
      isVisible={isVisible}
      isComplete={isComplete}
      isHandoff={isHandoff}
      onCelebrated={onCelebrated ?? undefined}
      onFinished={stopLoading}
      factSubject={subject}
      completionWord={reason === "logout" ? "see you soon!" : undefined}
    />
  );
};
