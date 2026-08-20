"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { SignIn } from "@/features/auth/components/SignIn";
import { signIn } from "@/features/auth/authService";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { useTeacherStore } from "@/features/teacher/store/useTeacherStore";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { completeAndRedirect, getRedirectParam } from "@/features/auth/usePostAuthRedirect";

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
      normalizedRole === "student" ||
      normalizedRole === "partner" ||
      normalizedRole === "parent" ||
      normalizedRole === "teacher" ||
      normalizedRole === "admin"
        ? (normalizedRole as "student" | "partner" | "parent" | "teacher" | "admin")
        : ("student" as const);

    localStorage.setItem("gened_user_role", role);
    if (role === "partner") localStorage.setItem("gened_partner_id", token.user_id);

    if (role === "teacher") {
      useTeacherStore.getState().setTeacherProfile({
        user_id: token.user_id || "",
        username: token.username || "",
        email: token.email || "",
        role: token.role || "TEACHER",
        full_name: (token as any).full_name || token.username || "",
        title: (token as any).title || "",
        subjects: (token as any).subjects || [],
        partner_id: (token as any).partner_id,
      });
    } else if (role === "student") {
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

    const redirectPath = getRedirectParam();
    completeAndRedirect(router, redirectPath || `/${role}`);
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
    useLoaderStore.getState().startLoading();
    try {
      const { googleSignIn } = await import("@/features/auth/authService");
      const res = await googleSignIn(token);
      persistAndRedirect(res);
    } catch (err) {
      useLoaderStore.getState().stopLoading();
      setErrors({ root: "Google Sign-In failed. Please try again or use your username/password." });
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <AuthShell title="Welcome back" subtitle="Sign in to continue your learning journey.">
        <SignIn
              loginData={loginData}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onSwitchToSignup={() => router.push("/register")}
              isSigningIn={isSigningIn}
              errors={errors}
          onGoogleSuccess={handleGoogleSuccess}
        />
      </AuthShell>
    </GoogleOAuthProvider>
  );
}
