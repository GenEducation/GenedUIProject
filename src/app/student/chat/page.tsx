"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { StudentChatView } from "@/features/student/components/StudentChatView";
import { PartnerRequestModal } from "@/features/student/components/PartnerRequestModal";

export default function StudentChatPage() {
  return (
    <AuthGuard requiredRole="student">
      <div className="h-screen overflow-hidden">
        <StudentChatView />
        <PartnerRequestModal />
      </div>
    </AuthGuard>
  );
}
