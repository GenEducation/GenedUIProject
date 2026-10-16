"use client";

import { useState } from "react";
import { UserRoundPen } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
      startTutorial({ celebrate: true });
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgb(18_45_48/0.45)] p-4 backdrop-blur-[4px] sm:p-6">
      {/* A real form, so Enter in any field submits it like the Continue button. */}
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-profile-title"
        aria-describedby="complete-profile-lead"
        noValidate
        onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
        className="relative w-full max-w-[460px] rounded-[28px] bg-white px-6 pb-7 pt-8 shadow-[0_30px_70px_-24px_rgb(18_45_48/0.45)] sm:px-9 sm:pb-9 sm:pt-9"
      >
        <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft-surface)]/70 text-[var(--primary)]">
          <UserRoundPen size={26} strokeWidth={1.9} />
        </span>
        <h2 id="complete-profile-title" className="mt-5 text-[24px] font-extrabold leading-tight text-[var(--ink)]">
          Tell us a bit about yourself
        </h2>
        <p id="complete-profile-lead" className="mt-2 text-[14.5px] leading-relaxed text-[var(--text-mid)]">
          We&apos;ll use your name to set up your first test.
        </p>

        <div className="mt-7 space-y-5">
          <Field id="cp-name" label="Your name">
            <input
              id="cp-name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
              type="text"
              autoComplete="given-name"
              autoFocus
              required
              aria-invalid={!!error && !name.trim()}
              placeholder="What should we call you?"
              className={INPUT}
            />
          </Field>

          <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-3">
            <Field id="cp-age" label="Age" optional>
              <input
                id="cp-age"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
                type="text"
                inputMode="numeric"
                placeholder="e.g. 14"
                className={INPUT}
              />
            </Field>
            <Field id="cp-tutor" label="Your AI tutor's name" optional>
              <input
                id="cp-tutor"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                type="text"
                placeholder="Nia"
                className={INPUT}
              />
            </Field>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-[13px] font-semibold text-[var(--danger-ink)]">{error}</p>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isSaving} disabled={isSaving} className="mt-7 rounded-full">
          Continue
        </Button>
      </form>
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-[var(--surface-border)] bg-[var(--canvas)] px-4 py-3 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary-ring)] aria-[invalid=true]:border-[var(--danger-ink)]";

function Field({ id, label, optional = false, children }: { id: string; label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-bold text-[var(--ink)]">
        {label}
        {optional && <span className="text-[12px] font-medium text-[var(--text-muted)]">Optional</span>}
      </label>
      {children}
    </div>
  );
}
