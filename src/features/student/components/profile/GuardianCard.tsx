"use client";

import { useState } from "react";
import { BookOpen, Check, Clock3, FileText, Loader2, Plus, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStudentStore } from "../../store/useStudentStore";
import { useGuardianStatus } from "../../hooks/useGuardianStatus";
import type { GuardianStatus } from "../../services/studentService";
import { studentService } from "../../services/studentService";
import { VerifyParentEmail } from "../guardian/VerifyParentEmail";
import { CardHeading, ProfileCard, StatusPill } from "./ProfileCard";

const SEES: { Icon: LucideIcon; text: string }[] = [
  { Icon: FileText, text: "Report card" },
  { Icon: BookOpen, text: "Subject progress" },
  { Icon: Clock3, text: "Study time" },
];

const STEPS = ["Invite", "They confirm", "You're linked"];

/** How many of the steps above are behind the student: an invitation out (or an email to verify) is the first. */
function stepsDone(status: GuardianStatus | null): number {
  switch (status?.state) {
    case "awaiting_parent_confirmation":
    case "awaiting_parent_registration":
    case "email_unverified":
      return 1;
    default:
      return 0;
  }
}

/**
 * The card's footer panel: who can see the student's learning, and what. Connected: the three things the guardian sees.
 * Otherwise: the three steps to a connection on one line, with those behind the student ticked off. Kept to two short
 * lines so the card never grows taller than its row partner in the 2-up grid.
 */
function PrivacyPanel({ linked, done }: { linked: boolean; done: number }) {
  return (
    <div className="mt-5 rounded-2xl bg-[var(--soft-surface)]/55 px-4 py-3 sm:ml-[68px]">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
        <ShieldCheck size={17} className="flex-none text-[var(--primary)]" aria-hidden />
        {linked ? "Only they can see your learning" : "Nothing is shared until they confirm"}
      </p>
      {linked ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="What they can see">
          {SEES.map(({ Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--text-mid)]">
              <Icon size={13} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      ) : (
        <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1" aria-label="How connecting works">
          {STEPS.map((text, i) => {
            const isDone = i < done;
            const isNow = i === done;
            return (
              <li key={text} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden className="h-px w-4 bg-[var(--surface-border)]" />}
                <span
                  aria-hidden
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold ${isDone ? "bg-[var(--primary)] text-white" : isNow ? "bg-white text-[var(--primary)] ring-[1.5px] ring-[var(--primary)]" : "bg-white text-[var(--text-muted)]"}`}
                >
                  {isDone ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-[12px] ${isNow ? "font-bold text-[var(--ink)]" : "font-medium text-[var(--text-mid)]"}`}>
                  {text}
                  {isDone && <span className="sr-only"> (done)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** What the pill says for each state: a PENDING link is never "connected". */
export function guardianPill(status: GuardianStatus | null): { tone: "on" | "pending" | "off"; label: string } {
  switch (status?.state) {
    case "linked":
      return { tone: "on", label: "Connected" };
    case "awaiting_parent_confirmation":
      return { tone: "pending", label: "Waiting for your parent to confirm" };
    case "awaiting_parent_registration":
      return { tone: "pending", label: "Invitation sent" };
    case "email_unverified":
      return { tone: "pending", label: "Parent email not verified" };
    case "declined":
      return { tone: "off", label: "Not connected" };
    default:
      return { tone: "off", label: "Not connected" };
  }
}

/**
 * The student's guardian connection, read from the server every time it is
 * shown (`GET /parent/guardian/status`): connected, waiting for the parent to
 * confirm, invited (no parent account yet), or not connected. A student whose
 * parent's email is not verified yet can verify it here; one whose parent has
 * not registered can resend the invitation. Students without a parent email
 * (or whose parent declined) can still ask a parent account to connect by
 * email or phone (`POST /parent/link`), which the parent then confirms.
 */
export function GuardianCard({ index }: { index: number }) {
  const { studentProfile, linkParent, partnerRequestStatus } = useStudentStore();
  const studentId = studentProfile?.user_id;
  const { status, setStatus, refresh } = useGuardianStatus(studentId);
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [resendNote, setResendNote] = useState("");
  const [resending, setResending] = useState(false);
  const sending = partnerRequestStatus === "loading";
  const pill = guardianPill(status);

  const handleInvite = async () => {
    const value = contact.trim();
    if (!value) return;
    await linkParent(value);
    if (useStudentStore.getState().partnerRequestStatus === "success") {
      setContact("");
      setOpen(false);
      void refresh();
    }
  };

  const resend = async () => {
    if (!studentId) return;
    setResending(true);
    try {
      const next = await studentService.resendGuardianInvitation(studentId);
      setStatus(next);
      setResendNote(next.invitation_sent ? "Invitation sent again." : "We sent one very recently. Try again later.");
    } catch {
      setResendNote("That didn't go through. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const canAskByContact = !status || status.state === "no_parent_email" || status.state === "declined";
  const linked = status?.state === "linked";
  const who = status?.linked_parent_name || status?.linked_parent_email || null;

  return (
    <ProfileCard index={index} className="flex flex-col">
      <CardHeading
        icon={<Users size={24} strokeWidth={1.9} />}
        title="Guardian"
        description={linked ? "Your parent or guardian can follow your progress and reports." : "Invite a parent or guardian to follow your progress and reports."}
      />

      {/* Connected: who it is, in one row. Otherwise: where the link stands, and the invite. */}
      {linked ? (
        <div
          className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--surface-border)] px-4 py-3 sm:ml-[68px]"
          data-testid="guardian-connected-to"
        >
          <span
            aria-hidden
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--soft-surface)] text-[15px] font-extrabold uppercase text-[var(--primary)]"
          >
            {(who ?? "G").charAt(0)}
          </span>
          {/* The status sits under who it is, so a long email keeps the row's full width on any screen. */}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="break-all text-[14px] font-bold text-[var(--ink)]">{who ?? "Your guardian"}</p>
            {status?.linked_parent_name && status.linked_parent_email && (
              <p className="mt-0.5 break-all text-[12.5px] text-[var(--text-mid)]">{status.linked_parent_email}</p>
            )}
            <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--primary)]">
              <Check size={13} strokeWidth={3} aria-hidden />
              {pill.label}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:pl-[68px]">
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          {canAskByContact && !open && (
            <Button variant="primary" size="md" onClick={() => setOpen(true)} leadingIcon={<Plus size={17} />} className="rounded-full px-6">
              Invite guardian
            </Button>
          )}
          {status?.state === "awaiting_parent_registration" && status.can_resend_invitation && (
            <Button variant="outline" size="sm" pill loading={resending} disabled={resending} onClick={resend}>
              Resend invitation
            </Button>
          )}
        </div>
      )}

      {status && status.state !== "linked" && status.state !== "no_parent_email" && (
        <div className="mt-4 space-y-2 sm:ml-[68px]" data-testid="guardian-detail">
          {status.state === "awaiting_parent_registration" && (
            <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">
              Sent to <strong className="break-all">{status.parent_email}</strong>. They need to sign up with it.
            </p>
          )}
          {status.state === "awaiting_parent_confirmation" && (
            <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">
              They already have a GenEd account. You&apos;ll be connected as soon as they confirm.
            </p>
          )}
          {status.state === "email_unverified" && studentId && status.parent_email && (
            <VerifyParentEmail studentId={studentId} parentEmail={status.parent_email} onVerified={setStatus} />
          )}
          {resendNote && <p className="text-[12.5px] font-semibold text-[var(--text-mid)]">{resendNote}</p>}
        </div>
      )}

      {open && (
        <form
          className="mt-4 flex flex-col gap-2 sm:ml-[68px] sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); handleInvite(); }}
        >
          <input
            type="text"
            autoFocus
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={sending}
            placeholder="Guardian's email or phone"
            aria-label="Guardian's email or phone"
            className="min-w-0 flex-1 rounded-xl border border-[var(--surface-border)] bg-[var(--canvas)] px-4 py-2.5 text-[14px] text-[var(--ink)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary-ring)]"
          />
          <div className="flex gap-2">
            <Button type="button" variant="tertiary" onClick={() => { setOpen(false); setContact(""); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!contact.trim() || sending}>
              {sending ? <Loader2 size={15} className="animate-spin" /> : "Send invite"}
            </Button>
          </div>
        </form>
      )}

      {/* Spacer: when its row partner is taller, the footer panel settles at the bottom. */}
      <div aria-hidden className="flex-1" />
      <PrivacyPanel linked={linked} done={stepsDone(status)} />
    </ProfileCard>
  );
}
