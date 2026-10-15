"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStudentStore } from "../../store/useStudentStore";
import { useGuardianStatus } from "../../hooks/useGuardianStatus";
import { studentService } from "../../services/studentService";
import { usePlacementStore } from "@/features/placement/store/usePlacementStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

/** "Maybe later" holds for a week; after that, if the parent still has no account, it asks once more. */
export const GUARDIAN_POPUP_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const snoozeKey = (studentId: string) => `gened_guardian_invite_snoozed_until:${studentId}`;
const PLACEMENT_ENABLED = process.env.NEXT_PUBLIC_PLACEMENT_ENABLED !== "false";

function snoozed(studentId: string): boolean {
  try {
    return Number(localStorage.getItem(snoozeKey(studentId)) || 0) > Date.now();
  } catch {
    return false;
  }
}

/**
 * After onboarding (named, placement done or not offered, tour over), a student
 * whose verified parent email has no GenEd account yet is told so, kindly, once:
 * they can carry on learning, their parent must create their own account with
 * that same email, and the accounts connect automatically once the parent
 * confirms. It offers to send the invitation again and shows the sign-up link.
 *
 * The state is read fresh from the server each time it could show, so it never
 * shows once the parent has registered or connected, and "Maybe later" puts it
 * away for a week rather than blocking anything.
 */
export function GuardianInvitePopup() {
  const studentProfile = useStudentStore((s) => s.studentProfile);
  const placementPhase = usePlacementStore((s) => s.phase);
  const tourActive = useTutorialStore((s) => s.isActive);
  const studentId = studentProfile?.user_id;
  const onboarded = !!studentProfile?.name && (!PLACEMENT_ENABLED || placementPhase === "unavailable") && !tourActive;
  const { status, setStatus } = useGuardianStatus(onboarded ? studentId : undefined);
  const [dismissed, setDismissed] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [signUpLink, setSignUpLink] = useState("");
  const titleId = useId();

  useEffect(() => {
    setSignUpLink(`${window.location.origin}/register?redirect=${encodeURIComponent("/parent")}`);
  }, []);

  const open =
    onboarded &&
    !!studentId &&
    !dismissed &&
    status?.state === "awaiting_parent_registration" &&
    !snoozed(studentId);

  const dismiss = () => {
    if (studentId) {
      try {
        localStorage.setItem(snoozeKey(studentId), String(Date.now() + GUARDIAN_POPUP_SNOOZE_MS));
      } catch {
        // Private mode: it simply asks again next visit.
      }
    }
    setDismissed(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open || !status) return null;

  const resend = async () => {
    setSending(true);
    try {
      const next = await studentService.resendGuardianInvitation(studentId!);
      setStatus(next);
      setNote(next.invitation_sent ? "Invitation sent again." : "We sent one very recently, so we didn't send another yet.");
    } catch {
      setNote("That didn't go through. Please try again later.");
    } finally {
      setSending(false);
    }
  };

  const email = status.parent_email;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div aria-hidden className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={dismiss} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-7"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-2 text-gray-400 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
        <h2 id={titleId} className="pr-8 text-lg font-bold text-[var(--primary-ink)]">
          Invite your parent to GenEd
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          You verified <strong>{email}</strong> as your parent&apos;s email, but there&apos;s no GenEd parent account with
          that email yet.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-600">
          <li>You can keep using GenEd right now. You don&apos;t need to wait for them.</li>
          <li>
            Your parent needs to create their own parent account using <strong>{email}</strong>.
          </li>
          <li>Once they sign up and confirm they&apos;re your parent or guardian, your accounts connect automatically.</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          We&apos;ve emailed them an invitation{status.reminders_sent > 0 ? " and a reminder" : ""}. Their sign-up link:{" "}
          <span className="break-all font-mono text-[11px] text-gray-700">{signUpLink}</span>
        </p>
        {note && (
          <p role="status" className="mt-3 text-xs font-semibold text-[var(--primary-ink)]">
            {note}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={dismiss}>
            Maybe later
          </Button>
          {status.can_resend_invitation && (
            <Button variant="primary" loading={sending} disabled={sending} onClick={resend}>
              Send the invitation again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
