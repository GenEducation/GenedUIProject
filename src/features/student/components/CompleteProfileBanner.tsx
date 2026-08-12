"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateProfile } from "@/features/auth/authService";
import { useStudentStore, StudentProfile } from "../store/useStudentStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

interface CompleteProfileBannerProps {
  studentProfile: StudentProfile;
}

export function CompleteProfileBanner({ studentProfile }: CompleteProfileBannerProps) {
  const [skipped, setSkipped] = useState(
    () => localStorage.getItem(`gened_profile_banner_skipped_${studentProfile.user_id}`) === "true"
  );
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [aiName, setAiName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const setStudentProfile = useStudentStore((s) => s.setStudentProfile);
  const { startTutorial } = useTutorialStore();

  if (skipped) return null;

  const maybeLaunchTutorial = () => {
    const isNewUser = localStorage.getItem("gened_new_user") === "true";
    if (isNewUser) {
      localStorage.removeItem("gened_new_user");
      localStorage.removeItem("start_tutorial_after_onboarding");
      startTutorial();
    }
  };

  const handleDismiss = () => {
    // Key by user_id so a different user on the same device isn't affected
    localStorage.setItem(`gened_profile_banner_skipped_${studentProfile.user_id}`, "true");
    setSkipped(true);
    maybeLaunchTutorial();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      const updates: {
        user_id: string;
        name?: string;
        age?: number;
        ai_name?: string;
      } = { user_id: studentProfile.user_id };
      if (name.trim()) updates.name = name.trim();
      if (age.trim()) updates.age = Number(age);
      if (aiName.trim()) updates.ai_name = aiName.trim();

      if (Object.keys(updates).length <= 1) {
        handleDismiss();
        return;
      }

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
      localStorage.setItem(`gened_profile_banner_skipped_${studentProfile.user_id}`, "true");
      setSkipped(true);
      maybeLaunchTutorial();
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>

        <h3 className="text-lg font-bold text-[var(--primary-ink)] mb-1">
          Tell us a bit about yourself
        </h3>
        <p className="text-xs text-gray-500 mb-6">
          Personalize your experience. All fields are optional.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              Your Name
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

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/20 hover:shadow-xl hover:shadow-[var(--primary)]/30 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
