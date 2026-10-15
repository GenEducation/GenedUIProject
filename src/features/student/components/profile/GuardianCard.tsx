"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStudentStore } from "../../store/useStudentStore";
import { studentService } from "../../services/studentService";
import { CardHeading, ProfileCard, StatusPill } from "./ProfileCard";

type LinkStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";

/**
 * The student's guardian connection, read from their link (`GET /parent/link/status`): connected once a guardian
 * approved it, waiting while it is pending, otherwise not connected with a way to invite (`POST /parent/link`).
 */
export function GuardianCard({ index }: { index: number }) {
  const { linkParent, partnerRequestStatus } = useStudentStore();
  const studentId = useStudentStore((s) => s.studentProfile?.user_id);
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  // undefined until read (or when it couldn't be read: no pill rather than a wrong one), null when there is no link.
  const [link, setLink] = useState<LinkStatus | null | undefined>(undefined);
  const sending = partnerRequestStatus === "loading";

  const refresh = useCallback(async () => {
    if (!studentId) return;
    try {
      const current = await studentService.fetchGuardianLink(studentId);
      setLink(current?.status ?? null);
    } catch {
      setLink(undefined);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    studentService
      .fetchGuardianLink(studentId)
      .then((current) => { if (!cancelled) setLink(current?.status ?? null); })
      .catch(() => { if (!cancelled) setLink(undefined); });
    return () => { cancelled = true; };
  }, [studentId]);

  const connected = link === "APPROVED";

  const handleInvite = async () => {
    const value = contact.trim();
    if (!value) return;
    await linkParent(value);
    if (useStudentStore.getState().partnerRequestStatus === "success") {
      setContact("");
      setOpen(false);
      await refresh();
    }
  };

  return (
    <ProfileCard index={index} className="flex flex-col">
      <CardHeading
        icon={<Users size={24} strokeWidth={1.9} />}
        title="Guardian connection"
        description="Invite your parent or guardian to stay informed about your learning journey and progress."
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:pl-[68px]">
        {link === "APPROVED" ? (
          <StatusPill tone="on">Connected</StatusPill>
        ) : link === "PENDING" ? (
          <StatusPill tone="pending">Waiting for approval</StatusPill>
        ) : link !== undefined ? (
          <StatusPill tone="off">Not connected</StatusPill>
        ) : null}
        {!open && !connected && link !== undefined && (
          <Button variant="primary" size="md" onClick={() => setOpen(true)} leadingIcon={<Plus size={17} />} className="rounded-full px-6">
            Invite / Link guardian
          </Button>
        )}
      </div>

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
          Your learning data is private and only shared with your guardian when you choose to invite them.
        </p>
      </div>
    </ProfileCard>
  );
}
