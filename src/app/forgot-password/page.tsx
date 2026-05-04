import { AuthPageLayout } from "@/features/auth/components/AuthPageLayout";
import { ForgotPassword } from "@/features/auth/components/ForgotPassword";

export const metadata = {
  title: "Forgot Password | GenEd",
  description: "Reset your GenEd account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout 
      title={<><em>Recover</em> Access</>} 
      subtitle="Restore your scholarly sanctuary"
    >
      <ForgotPassword />
    </AuthPageLayout>
  );
}
