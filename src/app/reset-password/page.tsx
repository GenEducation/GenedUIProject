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
        <div className="w-8 h-8 border-4 border-[#059F6D]/10 border-t-[#059F6D] rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
