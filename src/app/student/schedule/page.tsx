"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { SchedulePage } from "@/features/student/components/SchedulePage";

export default function StudentSchedulePage() {
  return (
    <AuthGuard requiredRole="student">
      <SchedulePage />
    </AuthGuard>
  );
}
