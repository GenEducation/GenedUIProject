"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { TeacherDashboard } from "@/features/teacher/components/TeacherDashboard";

/**
 * Catch-all page for the entire Teacher portal.
 */
export default function TeacherCatchAllPage() {
  return (
    <AuthGuard requiredRole="teacher">
      <TeacherDashboard />
    </AuthGuard>
  );
}
