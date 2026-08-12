"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { useTeacherStore } from "@/features/teacher/store/useTeacherStore";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { loadSubjectCatalog } from "@/features/subjects/subjectCatalog";

type Role = "student" | "parent" | "partner" | "admin" | "teacher";

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
      // Not authenticated — make sure no stale user lingers on Sentry events.
      Sentry.setUser(null);
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      router.replace(`/?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (role !== requiredRole) {
      if (requiredRole === "parent" && role === "student") {
        localStorage.clear();
        const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        router.replace(`/?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }
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
            name: profile.name,
            grade: profile.grade,
            school_board: profile.school_board,
            ai_name: profile.ai_name,
            plan: profile.plan,
            plan_expires_at: profile.plan_expires_at,
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
      } else if (role === "teacher") {
        const currentProfile = useTeacherStore.getState().teacherProfile;
        if (!currentProfile || currentProfile.user_id !== profile.user_id) {
          useTeacherStore.getState().setTeacherProfile({
            user_id: profile.user_id || "",
            username: profile.username || "",
            email: profile.email || "",
            role: profile.role || "TEACHER",
            full_name: profile.full_name || profile.username || "",
            title: profile.title || "",
            subjects: profile.subjects || [],
            partner_id: profile.partner_id,
          });
        }
      }
      // Partner hydration is handled from localStorage directly in the store

      // Attribute all subsequent Sentry events to the logged-in user so we can
      // answer "who hit this error?" and tag by role for filtering.
      Sentry.setUser({
        id: profile.user_id,
        username: profile.username,
        email: profile.email,
      });
      Sentry.setTag("role", role);

      // Warm the complete static taxonomy manifest once after authentication.
      // Subject-scoped actions await the same de-duplicated promise themselves.
      void loadSubjectCatalog().catch((error) => {
        Sentry.captureException(error, { tags: { boundary: "subject_catalog" } });
      });

      setIsAuthorized(true);

      // This route is now authorized and rendering — it's the destination of
      // any post-auth handoff, so it owns tearing the overlay down. A short
      // delay lets the first paint land before the loader fades out.
      const timeout = setTimeout(() => {
        useLoaderStore.getState().stopLoading();
      }, 500);

      return () => clearTimeout(timeout);
    } catch {
      // Corrupt localStorage — clear and re-login
      Sentry.setUser(null);
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
