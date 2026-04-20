"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function StudentChatBasePage() {
  const router = useRouter();

  useEffect(() => {
    // Landing on base /chat is now invalid as it lacks context.
    // Redirect home to start a fresh thread or choose from recent.
    router.replace("/student");
  }, [router]);

  return (
    <AuthGuard requiredRole="student">
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1a3a2a]/10 border-t-[#1a3a2a] rounded-full animate-spin" />
      </div>
    </AuthGuard>
  );
}
