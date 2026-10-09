"use client";

import { use } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LessonScreen } from "@/features/learning/components/LessonScreen";

/** `/student/lesson/{instanceId}`: a student's lesson for one chapter. */
export default function LessonPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params);
  return (
    <AuthGuard requiredRole="student">
      <LessonScreen instanceId={decodeURIComponent(instanceId)} />
    </AuthGuard>
  );
}
