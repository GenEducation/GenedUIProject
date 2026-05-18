import { AuthPageLayout } from "@/features/auth/components/AuthPageLayout";
import { ForgotPassword } from "@/features/auth/components/ForgotPassword";

export const metadata = {
  title: "Forgot Password | GenEd",
  description: "Reset your GenEd account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout 
      title={<><em>Reset</em> Your Password</>}
      subtitle="We'll help you get back to learning in no time"
    >
      <ForgotPassword />
    </AuthPageLayout>
  );
}
