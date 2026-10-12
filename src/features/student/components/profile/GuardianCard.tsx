"use client";

import { useState } from "react";
import { Loader2, Plus, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStudentStore } from "../../store/useStudentStore";
import { CardHeading, ProfileCard, StatusPill } from "./ProfileCard";

/**
 * Invite-only: the student side can send a guardian link (`POST /parent/link`)
 * but has no call to read an existing link back, so "Invite sent" only lasts
 * for this visit.
 */
export function GuardianCard({ index }: { index: number }) {
  const { linkParent, partnerRequestStatus } = useStudentStore();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const sending = partnerRequestStatus === "loading";

  const handleInvite = async () => {
    const value = contact.trim();
    if (!value) return;
    await linkParent(value);
    if (useStudentStore.getState().partnerRequestStatus === "success") {
      setSent(true);
      setContact("");
      setOpen(false);
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
        {sent ? <StatusPill tone="on">Invite sent</StatusPill> : <StatusPill tone="off">Not connected</StatusPill>}
        {!open && (
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
