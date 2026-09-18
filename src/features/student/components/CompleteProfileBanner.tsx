"use client";

import { useState } from "react";
import { updateProfile } from "@/features/auth/authService";
import { useStudentStore, StudentProfile } from "../store/useStudentStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { asError } from "@/utils/errors";

interface CompleteProfileBannerProps {
  studentProfile: StudentProfile;
}

/**
 * The naming step ahead of placement. `layout.tsx` only mounts this while
 * `studentProfile.name` is empty, and only a successful save populates that
 * field — there is no dismiss path. Placement is mandatory, and
 * `PlacementGate` waits on this same field, so a student cannot reach the
 * home page (or skip straight into it) without giving a name first.
 */
export function CompleteProfileBanner({ studentProfile }: CompleteProfileBannerProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [aiName, setAiName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const setStudentProfile = useStudentStore((s) => s.setStudentProfile);
  const { startTutorial } = useTutorialStore();

  const maybeLaunchTutorial = () => {
    const isNewUser = localStorage.getItem("gened_new_user") === "true";
    if (isNewUser) {
      localStorage.removeItem("gened_new_user");
      startTutorial();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter your name to continue.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const updates: {
        user_id: string;
        name: string;
        age?: number;
        ai_name?: string;
      } = { user_id: studentProfile.user_id, name: name.trim() };
      if (age.trim()) updates.age = Number(age);
      if (aiName.trim()) updates.ai_name = aiName.trim();

      const response = await updateProfile(updates);

      const updatedProfile: StudentProfile = {
        ...studentProfile,
        name: response.name,
        age: response.age,
        school_board: response.school_board,
        ai_name: response.ai_name,
      };
      setStudentProfile(updatedProfile);
      localStorage.setItem("gened_user_profile", JSON.stringify(response));
      if (response.access_token) {
        localStorage.setItem("gened_auth_token", response.access_token);
      }
      maybeLaunchTutorial();
    } catch (err) {
      setError(asError(err).message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-[var(--primary-ink)] mb-1">
          Tell us a bit about yourself
        </h3>
        <p className="text-xs text-gray-500 mb-6">
          We need your name before we can build your onboarding test. Age and your AI tutor&apos;s name are optional.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Your Name <span className="text-red-400 normal-case">(required)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="What should we call you?"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Age
            </label>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              type="number"
              placeholder="e.g. 14"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Name your AI Tutor
            </label>
            <input
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              type="text"
              placeholder="Give your AI tutor a name! (default: Nia)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-500 font-medium">{error}</p>
        )}

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/20 hover:shadow-xl hover:shadow-[var(--primary)]/30 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
