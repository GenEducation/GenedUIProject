"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { StudentPortal } from "@/features/student/components/StudentPortal";

export default function StudentPage() {
  return (
    <AuthGuard requiredRole="student">
      <StudentPortal />
    </AuthGuard>
  );
}
