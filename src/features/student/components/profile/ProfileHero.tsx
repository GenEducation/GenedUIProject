"use client";

import { BookOpen, Flame, Pencil, Sparkles } from "lucide-react";
import type { StudentAvatarId } from "@/constants/studentAvatars";
import { StudentAvatar } from "../StudentAvatar";
import { ProfileCard } from "./ProfileCard";

interface ProfileHeroProps {
  name: string;
  gradeLine: string;
  tutorName: string;
  avatarId: StudentAvatarId;
  onEditAvatar: () => void;
  streak: number;
  sessions: number;
}

function Stat({
  icon,
  iconClass,
  value,
  label,
  note,
}: {
  icon: React.ReactNode;
  iconClass: string;
  value: number;
  label: string;
  note: string;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-3.5 sm:px-8">
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-full sm:h-12 sm:w-12 ${iconClass}`} aria-hidden>
        {icon}
      </div>
      <div>
        <div className="text-[24px] font-extrabold leading-none text-[var(--ink)] tabular-nums sm:text-[28px]">{value}</div>
        <div className="mt-2 text-[13px] font-bold leading-snug text-[var(--ink)] sm:text-[14px]">{label}</div>
        <div className="mt-1 text-[12px] text-[var(--text-muted)] sm:text-[13px]">{note}</div>
      </div>
    </div>
  );
}

export function ProfileHero({ name, gradeLine, tutorName, avatarId, onEditAvatar, streak, sessions }: ProfileHeroProps) {
  return (
    <ProfileCard index={0} className="overflow-hidden">
      {/* A citron glow tucked behind the avatar — the only warm light on the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(217_242_121/0.35),transparent_68%)]"
      />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center">
        <div className="flex flex-1 items-center gap-5 sm:gap-7">
          <div className="relative flex-none">
            <div className="h-[96px] w-[96px] overflow-hidden rounded-full border-4 border-white bg-[var(--soft-surface)] shadow-[0_0_0_4px_var(--soft-surface),0_14px_30px_-12px_rgb(7_94_99/0.35)] sm:h-[120px] sm:w-[120px]">
              <StudentAvatar id={avatarId} size={120} />
            </div>
            {/* eslint-disable-next-line no-restricted-syntax -- pencil badge overlapping the avatar; Button has no icon-only circle size. */}
            <button
              type="button"
              onClick={onEditAvatar}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white text-[var(--primary)] shadow-[0_4px_12px_rgb(18_45_48/0.18)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]"
            >
              <Pencil size={15} strokeWidth={2.2} />
            </button>
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-[28px] font-extrabold leading-tight tracking-tight text-[var(--ink)] sm:text-[34px]">
              {name}
            </h2>
            <p className="mt-1 whitespace-nowrap text-[16px] font-semibold text-[var(--primary)]/80 sm:text-[18px]">{gradeLine}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--soft-surface)] px-3 py-1 text-[13px] font-bold text-[var(--ink)]">
              <Sparkles size={14} className="text-[var(--primary)]" fill="currentColor" aria-hidden />
              AI Tutor: {tutorName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 border-t border-[var(--surface-border)] pt-5 sm:flex sm:divide-x sm:divide-[var(--surface-border)] xl:border-t-0 xl:pt-0">
          <Stat
            icon={<Flame size={20} strokeWidth={2.2} />}
            iconClass="bg-[var(--soft-surface)] text-[var(--primary)]"
            value={streak}
            label="Day streak"
            note={streak > 0 ? "Keep it going!" : "Start one today!"}
          />
          <Stat
            icon={<BookOpen size={20} strokeWidth={2.2} />}
            iconClass="bg-[var(--soft-surface)] text-[var(--primary)]"
            value={sessions}
            label="Sessions completed"
            note={sessions > 0 ? "Great progress!" : "Your first is waiting"}
          />
        </div>
      </div>
    </ProfileCard>
  );
}
