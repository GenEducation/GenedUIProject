"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { StudentProfile } from "@/features/student/components/StudentProfile";

export default function StudentProfilePage() {
  return (
    <AuthGuard requiredRole="student">
      <div className="h-screen overflow-y-auto">
        <StudentProfile />
      </div>
    </AuthGuard>
  );
}
