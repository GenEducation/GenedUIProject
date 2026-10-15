"use client";

/**
 * Pieces shared by Settings and the first-run "connect your child" popup:
 * a child's avatar, a request row with Approve/Decline, and the three steps
 * for adding a child.
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/utils/datetime";
import { useParentStore } from "../../store/useParentStore";
import type { LinkedStudent } from "../../services/parentService";

export const childName = (s: LinkedStudent) => s.name?.trim() || `Student …${s.student_id.slice(-4)}`;
export const sinceDate = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
/** "2h ago" / "yesterday": lower-case, for use mid-sentence. */
export const relative = (iso: string | null | undefined) => {
  const r = formatRelativeTime(iso);
  return r && (r === "Just now" || r === "Yesterday" ? r.toLowerCase() : r);
};

export function Avatar({ src, size = 44 }: { src?: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- small static illustration
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-[14px] bg-[var(--pp-mint)] object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-[14px] bg-[var(--pp-mint)] text-[var(--pp-green)]" style={{ width: size, height: size }}>
      <UserRound size={size / 2.2} />
    </span>
  );
}

export function RequestRow({ student, avatar }: { student: LinkedStudent; avatar?: string }) {
  const updateStudentStatus = useParentStore((s) => s.updateStudentStatus);
  const [busy, setBusy] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState(false);
  const when = relative(student.requested_at);
  const name = childName(student);

  const decide = async (status: "APPROVED" | "REJECTED") => {
    setBusy(status);
    setError(false);
    try {
      await updateStudentStatus(student.student_id, status);
    } catch {
      setError(true);
      setBusy(null);
    }
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-[#F8E7BE] bg-[#FFF8E8]/90 px-4 py-3"
    >
      <Avatar src={avatar} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-[var(--pp-ink)]">{name}</p>
        <p className="text-[12.5px] text-[var(--pp-ink-soft)]">Wants to connect{when ? ` · ${when}` : ""}</p>
        {error && <p role="alert" className="mt-0.5 text-[12px] font-semibold text-[#C02659]">That didn&apos;t go through. Please try again.</p>}
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={!!busy} loading={busy === "REJECTED"} aria-label={`Decline ${name}`} onClick={() => decide("REJECTED")}>
          Decline
        </Button>
        <Button variant="primary" size="sm" className="flex-1 sm:flex-none" disabled={!!busy} loading={busy === "APPROVED"} leadingIcon={<Check size={15} strokeWidth={3} />} aria-label={`Approve ${name}`} onClick={() => decide("APPROVED")}>
          Approve
        </Button>
      </div>
    </motion.li>
  );
}

/** The three steps for adding a child; step 3 says where the request will show up. */
export function AddChildSteps({
  email,
  approveHint,
  className = "",
}: {
  email?: string;
  approveHint: React.ReactNode;
  className?: string;
}) {
  return (
    <ol className={`grid gap-3 md:grid-cols-3 ${className}`}>
      <Step n={1} title="Open their profile">On your child&apos;s GenEd, go to <strong>Profile</strong>.</Step>
      <Step n={2} title="Send you an invite">
        In <strong>Guardian connection</strong>, they enter {email ? "your email:" : "your email or phone."}
        {email && <CopyEmail email={email} />}
      </Step>
      <Step n={3} title="Approve it here">{approveHint}</Step>
    </ol>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    // Its own tinted card with a visible edge: these sit on a white panel, where white-on-white gave no edge at all.
    <li className="relative rounded-2xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D9F279] text-[14px] font-extrabold text-[var(--pp-ink)] tabular-nums">{n}</span>
      <p className="mt-3 text-[14px] font-bold text-[var(--pp-ink)]">{title}</p>
      <div className="mt-1 text-[13px] leading-relaxed text-[var(--pp-ink-soft)] [&_strong]:font-bold [&_strong]:text-[var(--pp-ink)]">{children}</div>
    </li>
  );
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked; the address is still visible to read out.
    }
  };
  return (
    <Button
      variant="outline"
      size="sm"
      fullWidth
      className="mt-2 !justify-between"
      trailingIcon={copied ? <Check size={14} /> : <Copy size={14} />}
      aria-label={copied ? "Email copied" : `Copy ${email}`}
      onClick={copy}
    >
      <span className="truncate">{email}</span>
    </Button>
  );
}
