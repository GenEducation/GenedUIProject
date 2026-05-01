"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";

type Role = "student" | "parent" | "partner";

interface AuthGuardProps {
  requiredRole: Role;
  children: React.ReactNode;
}

/**
 * AuthGuard is a client-side route protection wrapper.
 * It reads auth state from localStorage, hydrates the correct
 * Zustand store, and redirects unauthorized users to the login page.
 */
export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("gened_auth_token");
    const role = localStorage.getItem("gened_user_role") as Role | null;
    const profileStr = localStorage.getItem("gened_user_profile");

    if (!token || !role || !profileStr) {
      router.replace("/");
      return;
    }

    if (role !== requiredRole) {
      // User is logged in but accessing the wrong portal — redirect to their correct one
      router.replace(`/${role}`);
      return;
    }

    try {
      const profile = JSON.parse(profileStr);

      // Hydrate the appropriate store if not already hydrated or if ID mismatch (Context Sync)
      if (role === "student") {
        const currentProfile = useStudentStore.getState().studentProfile;
        if (!currentProfile || currentProfile.user_id !== profile.user_id) {
          useStudentStore.getState().setStudentProfile({
            user_id: profile.user_id,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            grade: profile.grade,
            school_board: profile.school_board,
          });
        }
      } else if (role === "parent") {
        const currentProfile = useParentStore.getState().parentProfile;
        if (!currentProfile || currentProfile.user_id !== profile.user_id) {
          useParentStore.getState().setParentProfile({
            user_id: profile.user_id || "",
            username: profile.username || "",
            email: profile.email || "",
            role: profile.role || "parent",
          });
        }
      }
      // Partner hydration is handled from localStorage directly in the store

      setIsAuthorized(true);
    } catch {
      // Corrupt localStorage — clear and re-login
      localStorage.clear();
      router.replace("/");
    }
  }, [requiredRole, router]);

  if (!isAuthorized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F7F6F1]">
        <div className="flex flex-col items-center gap-4">
          <img src="/Logo.svg" alt="Logo" className="h-12 w-auto animate-pulse" />
          <div className="w-8 h-8 border-4 border-[#2D5540] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
