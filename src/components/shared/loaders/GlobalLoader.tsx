"use client";

import React, { useEffect, useMemo } from "react";
import { StudyDeckLoader } from "./StudyDeck/StudyDeckLoader";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { ParentLoader, type LoaderChild } from "@/features/parent/components/loader/ParentLoader";
import { assignStudentAvatars } from "@/features/parent/utils/studentAvatars";
import { clearResumeCover, resumeLoaderAfterReload } from "@/features/auth/leaveWithLoader";
import { waitForPageVisuals } from "./waitForPageVisuals";

export const GlobalLoader = () => {
  const {
    isVisible, isComplete, isHandoff, onCelebrated, stopLoading,
    variant, reason, parentStage, appearDelayMs,
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

  // Parent portal entry: the family appears in the loader once it's known.
  const linkedStudents = useParentStore((s) => s.linkedStudents);
  const hasFetchedStudents = useParentStore((s) => s.hasFetchedStudents);
  const family = useMemo<LoaderChild[] | null>(() => {
    if (variant !== "parent" || !hasFetchedStudents) return null;
    const approved = linkedStudents.filter((s) => s.status === "APPROVED");
    const avatars = assignStudentAvatars(approved.map((s) => s.student_id));
    return approved.map((s) => ({
      id: s.student_id,
      name: s.name || "your child",
      avatar: avatars[s.student_id],
    }));
  }, [variant, hasFetchedStudents, linkedStudents]);

  if (variant === "parent") {
    return (
      <ParentLoader
        isVisible={isVisible}
        isComplete={isComplete}
        isHandoff={isHandoff}
        stage={parentStage}
        appearDelayMs={appearDelayMs}
        childrenList={family}
        onCelebrated={onCelebrated ?? undefined}
        onFinished={stopLoading}
      />
    );
  }

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
