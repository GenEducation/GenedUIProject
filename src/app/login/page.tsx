"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SignIn } from "@/features/auth/components/SignIn";
import { signIn } from "@/features/auth/authService";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useLoaderStore } from "@/stores/useLoaderStore";

export default function LoginPage() {
  const router = useRouter();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateSignIn = () => {
    const errs: Record<string, string> = {};
    if (!loginData.username.trim()) errs.username = "A username is required to sign in.";
    if (!loginData.password.trim()) {
      errs.password = "A password is required to sign in.";
    } else if (loginData.password.length < 6) {
      errs.password = "Your password must contain at least 6 characters.";
    }
    return errs;
  };

  const persistAndRedirect = (token: Awaited<ReturnType<typeof signIn>>) => {
    localStorage.setItem("gened_auth_token", token.access_token);
    localStorage.setItem("gened_user_profile", JSON.stringify(token));

    const normalizedRole = token.role?.toLowerCase() ?? "student";
    const role =
      normalizedRole === "student" || normalizedRole === "partner" || normalizedRole === "parent"
        ? (normalizedRole as "student" | "partner" | "parent")
        : ("student" as const);

    localStorage.setItem("gened_user_role", role);
    if (role === "partner") localStorage.setItem("gened_partner_id", token.user_id);

    if (role === "student") {
      useStudentStore.getState().setStudentProfile({
        user_id: token.user_id,
        username: token.username,
        email: token.email,
        role: token.role,
        name: token.name,
        grade: token.grade,
        school_board: token.school_board,
        ai_name: token.ai_name,
        preferred_voice: token.preferred_voice,
        plan: token.plan,
        plan_expires_at: token.plan_expires_at,
      });
    } else if (role === "parent") {
      useParentStore.getState().setParentProfile({
        user_id: token.user_id || "",
        username: token.username || "",
        email: token.email || "",
        role: token.role || "parent",
      });
    }

    const redirectPath =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect")
        : null;
    router.replace(redirectPath || `/${role}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    const validationErrors = validateSignIn();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsSigningIn(true);
    useLoaderStore.getState().startLoading();
    try {
      const token = await signIn(loginData);
      persistAndRedirect(token);
    } catch (error) {
      useLoaderStore.getState().stopLoading();
      const rawMsg = error instanceof Error ? error.message : "Unable to complete signin.";
      setErrors({ root: rawMsg });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name] && !prev.root) return prev;
      const next = { ...prev };
      delete next[name];
      delete next.root;
      return next;
    });
  };

  const handleGoogleSuccess = async (token: string) => {
    setErrors({});
    setIsSigningIn(true);
    try {
      const { googleSignIn } = await import("@/features/auth/authService");
      const res = await googleSignIn(token);
      persistAndRedirect(res);
    } catch (err) {
      setErrors({ root: "Google Sign-In failed. Please try again or use your username/password." });
    } finally {
      setIsSigningIn(false);
    }
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
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#042E5C] mb-2">Welcome back</h1>
            </div>

            <SignIn
              loginData={loginData}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onSwitchToSignup={() => router.push("/register")}
              isSigningIn={isSigningIn}
              errors={errors}
              onGoogleSuccess={handleGoogleSuccess}
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
