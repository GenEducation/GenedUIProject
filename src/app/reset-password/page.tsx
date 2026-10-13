"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthPageLayout } from "@/features/auth/components/AuthPageLayout";
import { ResetPassword } from "@/features/auth/components/ResetPassword";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const email = searchParams?.get("email") || "";

  return (
    <AuthPageLayout 
      title={<><em>Reset</em> Your Password</>}
      subtitle="Set a new password to continue learning"
    >
      <ResetPassword token={token} initialEmail={email} />
    </AuthPageLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#075E63]/10 border-t-[#075E63] rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
