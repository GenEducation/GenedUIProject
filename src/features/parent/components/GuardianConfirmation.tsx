"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { parentService, type GuardianInvitationToken } from "../services/parentService";

const sameEmail = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

type Phase =
  | { kind: "checking" }
  | { kind: "ready"; invitation: GuardianInvitationToken }
  | { kind: "wrong_account"; invitation: GuardianInvitationToken }
  | { kind: "confirming"; invitation: GuardianInvitationToken }
  | { kind: "done"; name: string }
  | { kind: "error"; message: string };

/**
 * The screen a parent lands on from their invitation email
 * (`/parent?token=…&student_id=…`), signed in. It says plainly what they are
 * confirming — that they are this child's parent or legal guardian, and that
 * their accounts connect — and only a click on "Yes" confirms. Opening the
 * link is never a confirmation, and nor is having the child's account.
 *
 * The invitation only works for the address it was sent to: signed in with
 * another account, the parent is told which address to use and nothing is sent
 * (the backend refuses it too). Students who verified this parent's email are
 * linked by the backend without any link at all; this screen is the
 * convenience path.
 */
export function GuardianConfirmation({
  token,
  studentId,
  parentId,
  parentEmail,
  onFinished,
}: {
  token: string;
  studentId: string;
  parentId: string;
  parentEmail?: string;
  /** Called once the parent confirmed (true) or set the invitation aside (false). */
  onFinished: (linked: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    parentService
      .verifyInvitation(studentId, token)
      .then((invitation) => {
        if (cancelled) return;
        setPhase(
          sameEmail(invitation.parent_email, parentEmail)
            ? { kind: "ready", invitation }
            : { kind: "wrong_account", invitation },
        );
      })
      .catch((err: Error) => {
        if (!cancelled) setPhase({ kind: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, token, parentEmail]);

  const confirm = async (invitation: GuardianInvitationToken) => {
    setPhase({ kind: "confirming", invitation });
    try {
      await parentService.confirmInvitation(parentId, studentId, token);
      setPhase({ kind: "done", name: invitation.student_username });
      onFinished(true);
    } catch (err) {
      setPhase({ kind: "error", message: (err as Error).message });
    }
  };

  const shell = (children: React.ReactNode) => (
    <section
      aria-label="Confirm your child's account"
      className="mx-4 mt-3 rounded-2xl border border-[var(--pp-line)] bg-white/90 px-5 py-5 shadow-sm lg:mx-8"
    >
      <div className="flex items-start gap-3.5">
        <ShieldCheck size={26} className="mt-0.5 flex-none text-[var(--pp-green-deep)]" aria-hidden />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </section>
  );

  if (phase.kind === "checking") {
    return shell(<p className="text-[14px] text-[var(--pp-ink-soft)]">Checking your invitation…</p>);
  }
  if (phase.kind === "error") {
    return shell(
      <>
        <p role="alert" className="text-[14px] font-semibold text-[#C02659]">{phase.message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onFinished(false)}>
          Close
        </Button>
      </>,
    );
  }
  if (phase.kind === "done") {
    return shell(
      <p role="status" className="text-[14px] font-semibold text-[var(--pp-green-deep)]">
        You&apos;re connected to {phase.name}. We&apos;ve emailed you a confirmation.
      </p>,
    );
  }
  const { invitation } = phase;
  const name = invitation.student_username;
  if (phase.kind === "wrong_account") {
    return shell(
      <>
        <h2 className="text-[18px] font-bold text-[var(--pp-ink)]">This invitation is for another email address</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--pp-ink-soft)]">
          {name} invited <strong>{invitation.parent_email}</strong>. You&apos;re signed in as{" "}
          <strong>{parentEmail || "another account"}</strong>. Sign in (or create your parent account) with{" "}
          {invitation.parent_email} to connect, so only the parent {name} named can.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onFinished(false)}>
          Close
        </Button>
      </>,
    );
  }
  return shell(
    <>
      <h2 className="text-[18px] font-bold text-[var(--pp-ink)]">Are you {name}&apos;s parent or guardian?</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--pp-ink-soft)]">
        {name} gave your email address as their parent&apos;s or guardian&apos;s on GenEd. By confirming, you state that
        you are {name}&apos;s parent or legal guardian, and your accounts connect: you&apos;ll see their progress, reports
        and learning conversations here. You can remove the connection in Settings at any time.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          loading={phase.kind === "confirming"}
          disabled={phase.kind === "confirming"}
          onClick={() => confirm(invitation)}
        >
          Yes, I&apos;m {name}&apos;s parent or guardian
        </Button>
        <Button variant="outline" size="sm" disabled={phase.kind === "confirming"} onClick={() => onFinished(false)}>
          Not now
        </Button>
      </div>
    </>,
  );
}
