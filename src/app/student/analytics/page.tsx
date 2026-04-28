"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { StudentAnalyticsDashboard } from "@/components/analytics/StudentAnalyticsDashboard";
import { useStudentStore } from "@/features/student/store/useStudentStore";

/**
 * Wrapper that reads the studentProfile from the store so we can pass
 * the correct user_id to the analytics dashboard for data fetching.
 */
function AnalyticsContent() {
  const studentProfile = useStudentStore((state) => state.studentProfile);
  return (
    <div className="h-screen overflow-y-auto">
      <StudentAnalyticsDashboard
        mode="student"
        studentId={studentProfile?.user_id}
      />
    </div>
  );
}

export default function StudentAnalyticsPage() {
  return (
    <AuthGuard requiredRole="student">
      <AnalyticsContent />
    </AuthGuard>
  );
}
