"use client";

import { use } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChapterSelection } from "@/features/student/components/chapters/ChapterSelection";

/** `/student/subjects/{subject}`: the chapters this student can open for a subject (exact taxonomy name). */
export default function SubjectChaptersPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = use(params);
  return (
    <AuthGuard requiredRole="student">
      <ChapterSelection subject={decodeURIComponent(subject)} />
    </AuthGuard>
  );
}
