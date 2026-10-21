"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { StudentPortal } from "@/features/student/components/StudentPortal";

export default function PracticePageRoute() {
  return (
    <AuthGuard requiredRole="student">
      <StudentPortal />
    </AuthGuard>
  );
}
