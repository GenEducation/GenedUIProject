"use client";

import { StudentBlobatar } from "@/features/student/components/StudentBlobatar";
import { useStudentStore } from "@/features/student/store/useStudentStore";

/**
 * The tutor, as the student's own companion: their Blobatar (seeded from their
 * id) under the name they gave it at onboarding. No stock mascot.
 */
export function TutorCard({ line = "Let's learn together!" }: { line?: string }) {
  const tutorName = useStudentStore((s) => s.studentProfile?.ai_name) || "Your tutor";
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-[var(--ls-soft)] p-4 pb-3">
      <div aria-hidden className="absolute -right-8 -bottom-10 h-32 w-32 rounded-full bg-[var(--ls-accent)] opacity-60 blur-2xl" />
      <div className="relative flex items-end gap-3">
        <StudentBlobatar size={76} animate="always" decorative />
        <p className="lesson-hand mb-6 rounded-2xl rounded-bl-sm bg-white px-3 py-1.5 text-[15px] leading-snug shadow-sm">
          {line}
        </p>
      </div>
      <p className="relative mt-1 text-[12px] font-semibold text-[var(--ls-primary)]">{tutorName}</p>
    </div>
  );
}
