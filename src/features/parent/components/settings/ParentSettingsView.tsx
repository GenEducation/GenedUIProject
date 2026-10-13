"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, KeyRound, LogOut, Smartphone, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useParentStore, type ParentProfile } from "../../store/useParentStore";
import { parentService, type LinkedStudent } from "../../services/parentService";
import { assignStudentAvatars } from "../../utils/studentAvatars";
import { UnlinkConfirmationModal } from "../UnlinkConfirmationModal";
import { AddChildSteps, Avatar, childName, RequestRow, relative, sinceDate } from "./linkParts";
import { GLASS } from "../home/theme";

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
interface ChildDetails {
  grade: number | null;
  lastActive: string | null;
}

/**
 * The parent's Settings: the children connected to this account (with any
 * requests waiting on top) beside the account itself, and underneath, the
 * three steps for adding another child. The portal header already says "Settings", so the
 * parent's name appears once, in the account card.
 */
export function ParentSettingsView({ profile }: { profile?: ParentProfile | null }) {
  const reduce = useReducedMotion();
  const storeProfile = useParentStore((s) => s.parentProfile);
  const linkedStudents = useParentStore((s) => s.linkedStudents);
  const unlinkStudent = useParentStore((s) => s.unlinkStudent);
  const me = profile || storeProfile;

  const pending = linkedStudents.filter((s) => s.status === "PENDING");
  const children = linkedStudents.filter((s) => s.status === "APPROVED");
  const avatars = useMemo(() => assignStudentAvatars(linkedStudents.map((s) => s.student_id)), [linkedStudents]);
  const details = useChildDetails(children.map((c) => c.student_id));
  const [unlink, setUnlink] = useState<{ id: string; name: string } | null>(null);

  const item = {
    hidden: reduce ? {} : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.08 } } }}
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
    >
      {/* ── Children ─────────────────────────────────────────────────── */}
      <motion.section variants={item} aria-labelledby="children-title" className={`min-w-0 rounded-[24px] p-5 sm:p-6 ${GLASS}`}>
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--pp-mint)] text-[var(--pp-green)]">
            <UsersRound size={19} strokeWidth={2.2} />
          </span>
          <h2 id="children-title" className="text-[18px] font-extrabold text-[var(--pp-ink)]">Children</h2>
          <span className="ml-auto rounded-full bg-[var(--pp-mint)] px-2.5 py-1 text-[12px] font-bold text-[var(--pp-green-deep)] tabular-nums">
            {children.length} connected
          </span>
        </header>

        <AnimatePresence initial={false}>
          {pending.length > 0 && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <h3 className="mt-5 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#B7790A]">
                <span className="h-2 w-2 rounded-full bg-[#F5A50B]" /> Waiting for your approval
              </h3>
              <ul aria-label="Waiting for your approval" className="mt-2.5 space-y-2">
                <AnimatePresence initial={false}>
                  {pending.map((s) => <RequestRow key={s.student_id} student={s} avatar={avatars[s.student_id]} />)}
                </AnimatePresence>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {children.length > 0 ? (
          <ul aria-label="Connected children" className="mt-5 divide-y divide-[var(--pp-line)] overflow-hidden rounded-2xl border border-white/90 bg-white/65">
            <AnimatePresence initial={false}>
              {children.map((c) => (
                <ChildRow
                  key={c.student_id}
                  student={c}
                  avatar={avatars[c.student_id]}
                  details={details[c.student_id]}
                  onRemove={() => setUnlink({ id: c.student_id, name: childName(c) })}
                />
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-[var(--pp-line)] bg-white/40 px-5 py-6 text-center text-[13.5px] text-[var(--pp-ink-soft)]">
            No children connected yet. The steps below show how to add one.
          </p>
        )}
      </motion.section>

      {/* ── Account ──────────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <AccountCard profile={me} />
      </motion.div>

      <motion.div variants={item} className="lg:col-span-2">
        <AddChildGuide email={me?.email} />
      </motion.div>

      <UnlinkConfirmationModal
        isOpen={!!unlink}
        studentName={unlink?.name ?? ""}
        onClose={() => setUnlink(null)}
        onConfirm={() => {
          if (unlink) void unlinkStudent(unlink.id).catch(() => {});
        }}
      />
    </motion.div>
  );
}

/** Grade and last activity per child; hints only, so failures just leave them out. */
function useChildDetails(ids: string[]): Record<string, ChildDetails> {
  const [details, setDetails] = useState<Record<string, ChildDetails>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    let live = true;
    key.split(",").forEach((id) => {
      Promise.allSettled([parentService.fetchStudentGrade(id), parentService.fetchLatestActivity(id)]).then(([g, a]) => {
        if (!live) return;
        setDetails((prev) => ({
          ...prev,
          [id]: {
            grade: g.status === "fulfilled" ? g.value : null,
            lastActive: a.status === "fulfilled" ? a.value : null,
          },
        }));
      });
    });
    return () => { live = false; };
  }, [key]);
  return details;
}

function ChildRow({
  student,
  avatar,
  details,
  onRemove,
}: {
  student: LinkedStudent;
  avatar?: string;
  details?: ChildDetails;
  onRemove: () => void;
}) {
  const name = childName(student);
  const since = sinceDate(student.requested_at);
  const active = relative(details?.lastActive);
  const meta = [details?.grade ? `Grade ${details.grade}` : null, since ? `Connected ${since}` : null].filter(Boolean).join(" · ");

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3.5 px-4 py-3.5"
    >
      <Avatar src={avatar} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-[var(--pp-ink)]" title={name}>{name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-[var(--pp-ink-soft)]">
          {meta && <span>{meta}</span>}
          {active && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--pp-green-deep)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--pp-green-deep)]" /> Active {active}
            </span>
          )}
        </p>
      </div>
      <Button variant="tertiary" size="sm" aria-label={`Remove ${name}`} onClick={onRemove} className="shrink-0 text-[#C02659]">
        Remove
      </Button>
    </motion.li>
  );
}

/** How a new child gets connected: three steps, starting on the child's side. */
function AddChildGuide({ email }: { email?: string }) {
  return (
    <section aria-labelledby="add-title" className={`rounded-[24px] p-5 sm:p-6 ${GLASS}`}>
      <header className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#D9F279] text-[var(--pp-ink)]">
          <Smartphone size={19} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 id="add-title" className="text-[18px] font-extrabold leading-tight text-[var(--pp-ink)]">Add another child</h2>
          <p className="mt-1 max-w-[60ch] text-[13.5px] leading-relaxed text-[var(--pp-ink-soft)]">
            Connections start from your child&apos;s side, so they stay in control of who sees their learning.
          </p>
        </div>
      </header>
      <AddChildSteps
        email={email}
        className="mt-5"
        approveHint={<>The request appears in <strong>Children</strong> above. Approve it and you&apos;re connected.</>}
      />
    </section>
  );
}

/** Who's signed in, and the two things they can do about it. */
function AccountCard({ profile }: { profile?: ParentProfile | null }) {
  const logoutParent = useParentStore((s) => s.logoutParent);
  const name = titleCase(profile?.name?.trim() || profile?.username || "Parent");
  // The username is only worth a line when it isn't just the name again.
  const username = profile?.username && profile.username.toLowerCase() !== name.toLowerCase() ? profile.username : null;

  return (
    <section aria-labelledby="account-title" className={`rounded-[24px] p-5 ${GLASS}`}>
      <h2 id="account-title" className="sr-only">Account</h2>
      <div className="flex items-center gap-3.5">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--pp-ink)] text-[20px] font-extrabold text-[#D9F279]">
          {name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-extrabold text-[var(--pp-ink)]">{name}</p>
          <p className="truncate text-[12.5px] text-[var(--pp-ink-soft)]">{username ? `@${username} · ` : ""}Parent account</p>
        </div>
      </div>

      <dl className="mt-4 rounded-2xl border border-white/90 bg-white/65 px-4 py-3">
        <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--pp-ink-soft)]">Email</dt>
        <dd className="mt-0.5 truncate text-[14px] font-semibold text-[var(--pp-ink)]" title={profile?.email}>{profile?.email || "Not added"}</dd>
      </dl>

      <Link
        href="/forgot-password"
        className="group mt-2.5 flex items-center gap-3 rounded-2xl border border-white/90 bg-white/65 px-4 py-3 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pp-green)]"
      >
        <KeyRound size={17} className="shrink-0 text-[var(--pp-green)]" />
        <span className="flex-1 text-[14px] font-semibold text-[var(--pp-ink)]">Change password</span>
        <ArrowRight size={16} className="text-[var(--pp-ink-soft)] transition-transform group-hover:translate-x-0.5" />
      </Link>

      <Button variant="destructive" fullWidth className="mt-4" leadingIcon={<LogOut size={16} />} onClick={() => logoutParent()}>
        Log out
      </Button>
    </section>
  );
}
