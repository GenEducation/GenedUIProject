"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Check, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStudentStore } from "../../store/useStudentStore";
import { useGuardianStatus } from "../../hooks/useGuardianStatus";
import { studentService } from "../../services/studentService";
import { usePlacementStore } from "@/features/placement/store/usePlacementStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";

/** "Maybe later" holds for a week; after that, if the parent still has no account, it asks once more. */
/** The parent sign-up form, which returns the new parent to the confirmation screen (`/parent`). */
export const PARENT_SIGN_UP = `/register?role=parent&redirect=${encodeURIComponent("/parent")}`;
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
 * confirms. It offers to send the invitation again and a button to the parent sign-up form.
 *
 * The state is read fresh from the server each time it could show, so it never
 * shows once the parent has registered or connected, and "Maybe later" puts it
 * away for a week rather than blocking anything.
 */
export function GuardianInvitePopup() {
  const router = useRouter();
  const studentProfile = useStudentStore((s) => s.studentProfile);
  const placementPhase = usePlacementStore((s) => s.phase);
  const tourActive = useTutorialStore((s) => s.isActive);
  const studentId = studentProfile?.user_id;
  const onboarded = !!studentProfile?.name && (!PLACEMENT_ENABLED || placementPhase === "unavailable") && !tourActive;
  const { status, setStatus } = useGuardianStatus(onboarded ? studentId : undefined);
  const [dismissed, setDismissed] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const titleId = useId();

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
  const steps = [
    {
      done: true,
      text: (
        <>
          Invitation emailed{status.reminders_sent > 0 ? ", with a reminder" : ""}
          {status.can_resend_invitation && (
            <>
              <span aria-hidden className="mx-1.5 text-[var(--surface-border)]">·</span>
              {/* eslint-disable-next-line no-restricted-syntax -- inline text action inside a sentence, not a standalone button. */}
              <button
                type="button"
                onClick={resend}
                disabled={sending}
                className="font-bold text-[var(--primary)] underline-offset-2 hover:underline disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)] rounded"
              >
                {sending ? "Sending…" : "Send again"}
              </button>
            </>
          )}
        </>
      ),
    },
    { done: false, text: <>They create a parent account with <strong className="font-bold text-[var(--ink)] [overflow-wrap:anywhere]">{email}</strong></> },
    { done: false, text: <>They confirm they&apos;re your parent, and your accounts connect automatically</> },
  ];
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div aria-hidden className="absolute inset-0 bg-[rgb(18_45_48/0.45)] backdrop-blur-[4px]" onClick={dismiss} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[480px] rounded-[28px] bg-white px-6 pb-6 pt-7 shadow-[0_30px_70px_-24px_rgb(18_45_48/0.45)] sm:px-8 sm:pb-8 sm:pt-8"
      >
        {/* eslint-disable-next-line no-restricted-syntax -- icon-only dialog close in the corner. */}
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--canvas)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]"
        >
          <X size={20} />
        </button>

        <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft-surface)]/70 text-[var(--primary)]">
          <Users size={26} strokeWidth={1.9} />
        </span>
        <h2 id={titleId} className="mt-5 pr-10 text-[24px] font-extrabold leading-tight text-[var(--ink)]">
          Invite your parent to GenEd
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--text-mid)]">
          There&apos;s no GenEd parent account for <strong className="font-bold text-[var(--ink)] [overflow-wrap:anywhere]">{email}</strong>{" "}
          yet. You can keep using GenEd right now; you don&apos;t need to wait for them.
        </p>

        {/* What happens next, with the step already behind them ticked off. */}
        <ol className="mt-5 space-y-3 rounded-2xl bg-[var(--soft-surface)]/45 px-4 py-4">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-px flex h-6 w-6 flex-none items-center justify-center rounded-full text-[12px] font-extrabold ${step.done ? "bg-[var(--primary)] text-white" : "bg-white text-[var(--primary)] ring-1 ring-[var(--surface-border)]"}`}
              >
                {step.done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-[14px] leading-snug ${step.done ? "text-[var(--text-mid)]" : "text-[var(--ink)]"}`}>
                {step.text}
                {step.done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-[13px] leading-relaxed text-[var(--text-mid)]">
          Is your parent with you? They can create their account here on this device.
        </p>
        {note && (
          <p role="status" className="mt-2 text-[13px] font-semibold text-[var(--primary)]">
            {note}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
          <Button variant="tertiary" onClick={dismiss} className="rounded-full sm:mr-auto">
            Maybe later
          </Button>
          <Button variant="primary" onClick={() => router.push(PARENT_SIGN_UP)} className="rounded-full">
            Create parent account
          </Button>
        </div>
      </div>
    </div>
  );
}
