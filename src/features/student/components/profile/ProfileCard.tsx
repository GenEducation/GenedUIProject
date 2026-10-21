"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock3, Unlink } from "lucide-react";

/**
 * Building blocks shared by the profile page's cards: the card shell (with its
 * staggered entrance), the round icon tile beside each title, and the small
 * connection-status pill.
 */

export function ProfileCard({
  children,
  index = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Position in the page's reveal order; drives the entrance stagger. */
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : 0.06 + index * 0.05 }}
      className={`relative rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgb(18_45_48/0.04),0_14px_34px_-24px_rgb(18_45_48/0.28)] ${className}`}
    >
      {children}
    </motion.section>
  );
}

export function CardIcon({ children, size = 52 }: { children: React.ReactNode; size?: number }) {
  return (
    <div
      aria-hidden
      className="flex flex-none items-center justify-center rounded-full bg-[var(--soft-surface)]/70 text-[var(--primary)]"
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}

/** Icon tile + title + description, the header every profile card opens with. */
export function CardHeading({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Extra content under the description, aligned with the text column. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <CardIcon>{icon}</CardIcon>
      <div className="min-w-0 flex-1 pt-1">
        <h2 className="text-[18px] font-extrabold leading-tight text-[var(--ink)]">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-[46ch] text-[14px] leading-relaxed text-[var(--text-mid)]">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}

type PillTone = "off" | "pending" | "on";

const PILL: Record<PillTone, { cls: string; Icon: typeof Check }> = {
  off: { cls: "bg-[var(--danger-bg)] text-[var(--danger-ink)]", Icon: Unlink },
  pending: { cls: "bg-[var(--warning-bg)] text-[var(--warning-ink)]", Icon: Clock3 },
  on: { cls: "bg-[var(--accent)] text-[var(--accent-ink)]", Icon: Check },
};

export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const { cls, Icon } = PILL[tone];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${cls}`}>
      <Icon size={15} strokeWidth={2.4} aria-hidden />
      {children}
    </span>
  );
}
