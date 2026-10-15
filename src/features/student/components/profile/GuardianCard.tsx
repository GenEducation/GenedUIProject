"use client";

import { useState } from "react";
import { Loader2, Plus, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStudentStore } from "../../store/useStudentStore";
import { useGuardianStatus } from "../../hooks/useGuardianStatus";
import type { GuardianStatus } from "../../services/studentService";
import { studentService } from "../../services/studentService";
import { VerifyParentEmail } from "../guardian/VerifyParentEmail";
import { CardHeading, ProfileCard, StatusPill } from "./ProfileCard";

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

  return (
    <ProfileCard index={index} className="flex flex-col">
      <CardHeading
        icon={<Users size={24} strokeWidth={1.9} />}
        title="Guardian connection"
        description="Invite your parent or guardian to stay informed about your learning journey and progress."
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:pl-[68px]">
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        {canAskByContact && !open && (
          <Button variant="primary" size="md" onClick={() => setOpen(true)} leadingIcon={<Plus size={17} />} className="rounded-full px-6">
            Invite / Link guardian
          </Button>
        )}
      </div>

      {status && status.state !== "linked" && status.state !== "no_parent_email" && (
        <div className="mt-4 space-y-2 sm:ml-[68px]" data-testid="guardian-detail">
          {status.state === "awaiting_parent_registration" && (
            <>
              <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">
                We invited <strong>{status.parent_email}</strong>. Once your parent creates their GenEd account with that
                email and confirms, you&apos;re connected automatically. You can keep learning in the meantime.
              </p>
              {status.can_resend_invitation && (
                <Button variant="outline" size="sm" loading={resending} disabled={resending} onClick={resend}>
                  Resend invitation
                </Button>
              )}
            </>
          )}
          {status.state === "awaiting_parent_confirmation" && (
            <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">
              Your parent has a GenEd account. You&apos;re connected as soon as they confirm they&apos;re your parent or
              guardian.
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

      {/* Spacer: in the 2-up grid this card matches its row partner's height,
          so the privacy note settles at the bottom instead of leaving a gap. */}
      <div aria-hidden className="flex-1" />
      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[var(--soft-surface)]/55 px-4 py-3.5 sm:ml-[68px]">
        <ShieldCheck size={20} className="mt-0.5 flex-none text-[var(--primary)]" aria-hidden />
        <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">
          Your learning data is private and only shared with your guardian once they confirm they&apos;re your parent or
          guardian.
        </p>
      </div>
    </ProfileCard>
  );
}
