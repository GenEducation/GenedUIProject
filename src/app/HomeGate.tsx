"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { useTeacherStore } from "@/features/teacher/store/useTeacherStore";
import { useHydrated } from "@/hooks/useHydrated";
import { LoaderBackdrop } from "@/features/parent/components/loader/LoaderBackdrop";
import { BrandLoadingScreen } from "@/components/shared/loaders/BrandLoadingScreen";
import { safeRedirect } from "@/features/auth/usePostAuthRedirect";

function storedRole(): string | null {
  try {
    return localStorage.getItem("gened_user_role");
  } catch {
    return null;
  }
}

/**
 * `/` — a signed-in visitor goes straight on to their portal (or to the `redirect` they were sent here with);
 * everyone else gets `children`, the Zoovi homepage.
 */
export function HomeGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const hydrated = useHydrated();

  useEffect(() => {
    const token = localStorage.getItem("gened_auth_token");
    const role = localStorage.getItem("gened_user_role") as "student" | "parent" | "partner" | "teacher" | null;
    const profileStr = localStorage.getItem("gened_user_profile");

    if (token && role && profileStr) {
      try {
        const profile = JSON.parse(profileStr);
        const searchParams = new URLSearchParams(window.location.search);
        const redirectPath = safeRedirect(searchParams.get("redirect"));

        if (redirectPath) {
          if (redirectPath.startsWith("/parent") && role !== "parent") {
            localStorage.clear();
            setIsChecking(false);
            return;
          }
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
              name: profile.name || profile.full_name || undefined,
            });
          } else if (role === "teacher") {
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
          router.replace(redirectPath);
          return;
        }

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
            name: profile.name || profile.full_name || undefined,
          });
        } else if (role === "teacher") {
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

        router.replace(`/${role}`);
        return;
      } catch {
        localStorage.clear();
      }
    }

    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    // A returning parent is on their way into the portal: show the parent
    // loader's atmosphere so the hand-over to it is seamless.
    if (hydrated && storedRole() === "parent") {
      return (
        <div className="relative h-screen w-full">
          <LoaderBackdrop />
        </div>
      );
    }
    return <BrandLoadingScreen />;
  }

  return <>{children}</>;
}
