"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthPageLayout } from "@/features/auth/components/AuthPageLayout";
import { ResetPassword } from "@/features/auth/components/ResetPassword";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  return (
    <AuthPageLayout 
      title={<><em>Update</em> Passphrase</>} 
      subtitle="Secure your archive with a new key"
    >
      <ResetPassword token={token} />
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
