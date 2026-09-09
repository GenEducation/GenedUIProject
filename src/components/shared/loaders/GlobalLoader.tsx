"use client";

import React from "react";
import { LoaderJourney } from "./LoaderJourney/LoaderJourney";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";

export const GlobalLoader = () => {
  const { isVisible, isComplete, isHandoff, onCelebrated, stopLoading } = useLoaderStore();
  // Undefined for non-student roles and during login, which is fine — the fact
  // picker falls back to a safe, age-neutral pool.
  const grade = useStudentStore((s) => s.studentProfile?.grade);
  const subject = useStudentStore((s) => s.activeChat?.subject);

  return (
    <LoaderJourney
      isVisible={isVisible}
      isComplete={isComplete}
      isHandoff={isHandoff}
      onCelebrated={onCelebrated ?? undefined}
      onFinished={stopLoading}
      factGrade={grade}
      factSubject={subject}
    />
  );
};
