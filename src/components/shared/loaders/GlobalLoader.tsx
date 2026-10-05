"use client";

import React, { useMemo } from "react";
import { LoaderJourney } from "./LoaderJourney/LoaderJourney";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { ParentLoader, type LoaderChild } from "@/features/parent/components/loader/ParentLoader";
import { assignStudentAvatars } from "@/features/parent/utils/studentAvatars";

export const GlobalLoader = () => {
  const {
    isVisible, isComplete, isHandoff, onCelebrated, stopLoading,
    variant, parentStage, appearDelayMs,
  } = useLoaderStore();
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
    <LoaderJourney
      isVisible={isVisible}
      isComplete={isComplete}
      isHandoff={isHandoff}
      onCelebrated={onCelebrated ?? undefined}
      onFinished={stopLoading}
      factSubject={subject}
    />
  );
};
