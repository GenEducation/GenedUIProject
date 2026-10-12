"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStudentStore, type StudentProfile as StudentProfileType } from "../store/useStudentStore";
import { useSidebarStore } from "../store/useSidebarStore";
import { getStudentDisplayName, titleCase } from "../utils/displayName";
import { useDebouncedResize } from "@/hooks/useDebouncedResize";
import { fetchProfile } from "@/features/auth/authService";
import { StudentHomeSidebar } from "./StudentHomeSidebar";
import { AvatarPickerModal } from "./AvatarPickerModal";
import { ProfileHero } from "./profile/ProfileHero";
import { SchoolCard } from "./profile/SchoolCard";
import { GuardianCard } from "./profile/GuardianCard";
import { DevicePairCard } from "./profile/DevicePairCard";
import { LearningPreferencesCard } from "./profile/LearningPreferencesCard";
import { CardHeading, ProfileCard } from "./profile/ProfileCard";

export function StudentProfile() {
  const router = useRouter();
  const {
    studentProfile, setStudentProfile, logoutStudent,
    studentStats, fetchStudentStats, fetchEnrolledPartners,
    avatarId, setAvatarId,
  } = useStudentStore();
  const { sidebarOpen, setSidebarOpen, applyResponsive } = useSidebarStore();
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  useDebouncedResize(() => applyResponsive(window.innerWidth >= 1024));

  useEffect(() => {
    // One request fills both school lists: `/student/partners` returns every school with this student's status.
    fetchEnrolledPartners();
    fetchStudentStats();
  }, [fetchEnrolledPartners, fetchStudentStats]);

  /**
   * Heal a stale localStorage profile by pulling the latest from auth-service
   * once per user. Pre-feature logins persisted a profile with no
   * `preferred_voice`, which would show the default voice as current.
   */
  useEffect(() => {
    if (!studentProfile?.user_id) return;
    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchProfile(studentProfile.user_id);
        if (cancelled) return;
        const merged: StudentProfileType = {
          ...studentProfile,
          name: fresh.name ?? studentProfile.name,
          age: fresh.age ?? studentProfile.age,
          grade: fresh.grade ?? studentProfile.grade,
          school_board: fresh.school_board ?? studentProfile.school_board,
          ai_name: fresh.ai_name ?? studentProfile.ai_name,
          preferred_voice: fresh.preferred_voice ?? studentProfile.preferred_voice,
          plan: fresh.plan ?? studentProfile.plan,
          plan_expires_at: fresh.plan_expires_at ?? studentProfile.plan_expires_at,
        };
        setStudentProfile(merged);
        localStorage.setItem("gened_user_profile", JSON.stringify({ ...fresh }));
        if (fresh.access_token) localStorage.setItem("gened_auth_token", fresh.access_token);
      } catch (err) {
        console.warn("[StudentProfile] Failed to refresh profile:", err);
      }
    })();
    return () => { cancelled = true; };
    // Intentionally only on user_id change (i.e. once per logged-in user).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfile?.user_id]);

  const gradeLine = [
    studentProfile?.grade ? `Grade ${studentProfile.grade}` : null,
    studentProfile?.school_board,
  ].filter(Boolean).join(" · ") || "—";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--canvas)] font-[family-name:var(--font-body)] text-[var(--ink)]">
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        {!sidebarOpen && (
          <div className="flex flex-none items-center gap-3 border-b border-[var(--surface-border)] bg-white px-4 py-3 md:hidden">
            {/* eslint-disable-next-line no-restricted-syntax -- icon-only topbar control matching the other student pages. */}
            <button
              aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
              className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] border border-[var(--surface-border)] bg-[var(--canvas)] text-[var(--text-mid)]"
            >
              <Menu size={16} strokeWidth={1.75} />
            </button>
            <span className="flex-1 text-center text-[15px] font-extrabold">My Profile</span>
            <div className="w-[38px] flex-none" />
          </div>
        )}

        <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
          {/* Ambient shapes: soft-surface and citron washes at the page edges. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full bg-[var(--soft-surface)]/70 blur-2xl" />
            <div className="absolute -bottom-32 right-10 h-[300px] w-[300px] rounded-full bg-[rgb(217_242_121/0.28)] blur-3xl" />
          </div>

          <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8 lg:px-10">
            {/* Page title */}
            <header className="mb-6 hidden items-center gap-5 md:flex">
              {/* eslint-disable-next-line no-restricted-syntax -- round icon-only back control from the profile mockup; Button has no icon-only circle size. */}
              <button
                aria-label="Go back"
                onClick={() => router.push("/student")}
                className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[var(--soft-surface)]/70 text-[var(--primary)] transition hover:bg-[var(--soft-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">My Profile</h1>
                <p className="text-[15px] text-[var(--text-mid)]">Your learning space</p>
              </div>
            </header>

            <ProfileHero
              name={getStudentDisplayName(studentProfile)}
              gradeLine={gradeLine}
              tutorName={titleCase(studentProfile?.ai_name || "Nia")}
              avatarId={avatarId}
              onEditAvatar={() => setAvatarPickerOpen(true)}
              streak={studentStats?.currentStreak ?? 0}
              sessions={studentStats?.totalSessions ?? 0}
            />

            {/* 2×2: preferences | guardian / school | device. One grid (not two
                columns) so each row's cards share a height and line up. */}
            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <LearningPreferencesCard index={1} />
              <GuardianCard index={2} />
              <SchoolCard index={3} />
              <DevicePairCard index={4} />
            </div>

            <ProfileCard index={5} className="mt-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <CardHeading
                    icon={<UserRound size={24} strokeWidth={1.9} />}
                    title="Account"
                    description="Manage your account settings and sign out from GenEd."
                  />
                </div>
                <Button
                  variant="destructive"
                  size="md"
                  onClick={logoutStudent}
                  leadingIcon={<LogOut size={16} />}
                  className="self-start rounded-full px-7 sm:self-center"
                >
                  Log out
                </Button>
              </div>
            </ProfileCard>
          </div>
        </div>
      </main>

      <AvatarPickerModal
        isOpen={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        selectedId={avatarId}
        onSelect={setAvatarId}
      />
    </div>
  );
}
