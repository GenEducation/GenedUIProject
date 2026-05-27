"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { LoginView } from "@/features/auth/components/LoginView";

/**
 * Root page — serves as the Login/Signup entry point.
 * If the user already has a valid session, they are automatically
 * redirected to their respective portal.
 */
export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gened_auth_token");
    const role = localStorage.getItem("gened_user_role") as "student" | "parent" | "partner" | null;
    const profileStr = localStorage.getItem("gened_user_profile");

    if (token && role && profileStr) {
      try {
        const profile = JSON.parse(profileStr);

        // Check if there is a pending redirect path
        const searchParams = new URLSearchParams(window.location.search);
        const redirectPath = searchParams.get("redirect");

        if (redirectPath) {
          // If parent link path is requested but currently logged in user is a student,
          // clear session so parent can authenticate
          if (redirectPath.startsWith("/parent") && role !== "parent") {
            localStorage.clear();
            setIsChecking(false);
            return;
          }

          // Hydrate stores if redirect matches role
          if (role === "student") {
            useStudentStore.getState().setStudentProfile({
              user_id: profile.user_id,
              username: profile.username,
              email: profile.email,
              role: profile.role,
              name: profile.name,
              grade: profile.grade,
              school_board: profile.school_board,
              ai_name: profile.ai_name,
              plan: profile.plan,
              plan_expires_at: profile.plan_expires_at,
            });
          } else if (role === "parent") {
            useParentStore.getState().setParentProfile({
              user_id: profile.user_id || "",
              username: profile.username || "",
              email: profile.email || "",
              role: profile.role || "parent",
            });
          }

          router.replace(redirectPath);
          return;
        }

        // Hydrate stores so the destination portal loads instantly
        if (role === "student") {
          useStudentStore.getState().setStudentProfile({
            user_id: profile.user_id,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            name: profile.name,
            grade: profile.grade,
            school_board: profile.school_board,
            ai_name: profile.ai_name,
            preferred_voice: profile.preferred_voice,
            plan: profile.plan,
            plan_expires_at: profile.plan_expires_at,
          });
        } else if (role === "parent") {
          useParentStore.getState().setParentProfile({
            user_id: profile.user_id || "",
            username: profile.username || "",
            email: profile.email || "",
            role: profile.role || "parent",
          });
        }

        router.replace(`/${role}`);
        return;
      } catch {
        localStorage.clear();
      }
    }

    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F7F6F1]">
        <div className="flex flex-col items-center gap-4">
          <img src="/Logo.svg" alt="Logo" className="h-12 w-auto animate-pulse" />
          <div className="w-8 h-8 border-4 border-[#2D5540] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <LoginView />;
}
