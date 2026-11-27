"use client";

import { use, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LessonScreen } from "@/features/learning/components/LessonScreen";
import { replayHeroIntro } from "@/features/student/components/ContinueLearningCard";

/** `/student/lesson/{instanceId}`: a student's lesson for one chapter. */
export default function LessonPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params);
  // Back on the dashboard after a lesson, its hero plays its entrance again.
  useEffect(() => replayHeroIntro(), []);
  return (
    <AuthGuard requiredRole="student">
      <LessonScreen instanceId={decodeURIComponent(instanceId)} />
    </AuthGuard>
  );
}
