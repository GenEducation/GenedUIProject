import { SIGNUP_ENABLED } from "@/constants/features";
import { SignupPaused } from "@/features/auth/components/SignupPaused";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return SIGNUP_ENABLED ? <RegisterForm /> : <SignupPaused />;
}
