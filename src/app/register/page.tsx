"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SignUp } from "@/features/auth/components/SignUp";
import { signUp, SignUpFields } from "@/features/auth/authService";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useLoaderStore } from "@/stores/useLoaderStore";

const initialSignUpData: SignUpFields = {
  email: "",
  password: "",
  confirmPassword: "",
  role: "student",
  grade: "",
  phone: "",
  otp_code: "",
  parent_email: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [signupData, setSignupData] = useState<SignUpFields>(initialSignUpData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [googleSignUpToken, setGoogleSignUpToken] = useState<string | null>(null);

  const validateSignUp = () => {
    const errs: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (signupData.role === "student") {
      const hasPersonalEmail = !!signupData.email?.trim();
      if (hasPersonalEmail) {
        if (!emailRegex.test(signupData.email)) errs.email = "Please enter a valid email address";
        if (signupData.username?.trim() && signupData.username.trim().length < 3)
          errs.username = "Username must be at least 3 characters";
        if (signupData.parent_email?.trim() && !emailRegex.test(signupData.parent_email))
          errs.parent_email = "Please enter a valid parent email address";
      } else {
        if (!signupData.username?.trim()) errs.username = "Username is compulsory";
        else if (signupData.username.trim().length < 3) errs.username = "Username must be at least 3 characters";
        if (!signupData.parent_email?.trim()) errs.parent_email = "Parent or Guardian email is compulsory";
        else if (!emailRegex.test(signupData.parent_email)) errs.parent_email = "Please enter a valid parent email address";
      }
      if (!signupData.password.trim()) errs.password = "Password is compulsory";
      else if (signupData.password.length < 6) errs.password = "Password must be at least 6 characters";
      if (!signupData.confirmPassword?.trim()) errs.confirmPassword = "Confirm Password is compulsory";
      else if (signupData.password !== signupData.confirmPassword) errs.confirmPassword = "Passwords do not match";
      const gradeNum = Number(signupData.grade);
      if (!signupData.grade?.trim()) errs.grade = "Please select your grade";
      else if (isNaN(gradeNum) || gradeNum <= 0 || gradeNum > 12) errs.grade = "Grade must be between 1 and 12";
    } else {
      if (!googleSignUpToken) {
        if (!signupData.email.trim()) errs.email = "Email is compulsory";
        else if (!emailRegex.test(signupData.email)) errs.email = "Please enter a valid email address";
        if (!signupData.password.trim()) errs.password = "Password is compulsory";
        else if (signupData.password.length < 6) errs.password = "Password must be at least 6 characters";
        if (!signupData.confirmPassword?.trim()) errs.confirmPassword = "Confirm Password is compulsory";
        else if (signupData.password !== signupData.confirmPassword) errs.confirmPassword = "Passwords do not match";
      }
      if (signupData.role === "parent") {
        if (!signupData.phone?.trim()) errs.phone = "Phone is compulsory";
        else if (!/^\d{10}$/.test(signupData.phone.trim())) errs.phone = "Phone must be a 10-digit number";
      }
    }
    return errs;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    const validationErrors = validateSignUp();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsSubmitting(true);
    useLoaderStore.getState().startLoading();
    try {
      let authResponse;
      if (googleSignUpToken) {
        const { googleSignUp } = await import("@/features/auth/authService");
        authResponse = await googleSignUp(googleSignUpToken, signupData);
      } else {
        authResponse = await signUp(signupData);
      }

      localStorage.setItem("gened_auth_token", authResponse.access_token);
      localStorage.setItem("gened_user_profile", JSON.stringify(authResponse));

      const normalizedRole = authResponse.role?.toLowerCase() ?? "student";
      const role =
        normalizedRole === "student" || normalizedRole === "parent"
          ? (normalizedRole as "student" | "parent")
          : ("student" as const);

      localStorage.setItem("gened_user_role", role);

      if (role === "student") {
        useStudentStore.getState().setStudentProfile({
          user_id: authResponse.user_id,
          username: authResponse.username,
          email: authResponse.email,
          role: authResponse.role,
          name: authResponse.name,
          grade: authResponse.grade,
          school_board: authResponse.school_board,
          age: authResponse.age,
          ai_name: authResponse.ai_name,
          preferred_voice: authResponse.preferred_voice,
          plan: authResponse.plan,
          plan_expires_at: authResponse.plan_expires_at,
        });
        const { useTutorialStore } = await import("@/features/tutorial/store/useTutorialStore");
        useTutorialStore.getState().startTutorial();
      }

      useLoaderStore.getState().completeLoading();
      setTimeout(() => {
        router.replace(`/${role}`);
      }, 1200);
    } catch (error) {
      useLoaderStore.getState().stopLoading();
      const rawMsg = error instanceof Error ? error.message : "Unable to complete signup.";
      setErrors({ root: rawMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name] && !prev.root) return prev;
      const next = { ...prev };
      delete next[name];
      delete next.root;
      return next;
    });
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <div className="min-h-screen bg-[#F7F9FB] flex flex-col">
        {/* Nav */}
        <header className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-center">
          <Link href="/">
            <Image src="/GenEd Logo Colored.svg" alt="GenEd" width={100} height={36} />
          </Link>
        </header>

        {/* Form */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#042E5C] mb-2">Create your account</h1>
            </div>

            <SignUp
              signupData={signupData}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onSwitchToSignin={() => router.push("/login")}
              isSubmitting={isSubmitting}
              errors={errors}
              onGoogleSuccess={(token) => setGoogleSignUpToken(token)}
            />
          </div>
        </main>

        <footer className="text-center text-xs text-gray-400 py-6">
          &copy; {new Date().getFullYear()} GenEd. All rights reserved.
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
}
