"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Building2,
  CircleCheck,
  FileStack,
  GraduationCap,
  Link2,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { getStats, AdminStats } from "../adminService";
import { PageHeader } from "./ui/PageHeader";
import { ErrorNote } from "./ui/EmptyState";
import { CARD_SHADOW } from "./ui/fields";
import { LS_COLORS } from "../analytics/colors";

type Icon = ComponentType<{ size?: number; className?: string }>;

const CARD = `rounded-2xl border border-border bg-white ${CARD_SHADOW}`;

const fmt = (n: number) => n.toLocaleString();
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Staggered entrance, one beat per card, as on the teacher roster. */
function Rise({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.05 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  href,
  well = "bg-ink/5 text-ink",
}: {
  label: string;
  value: number;
  hint?: ReactNode;
  icon: Icon;
  href?: string;
  well?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${well}`}>
          <Icon size={18} />
        </span>
        {href ? (
          <ArrowUpRight size={16} className="text-muted-light transition-colors group-hover:text-emerald" />
        ) : null}
      </div>
      <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted sm:mt-4 sm:text-[11px]">{label}</p>
      <p className="mt-0.5 font-serif text-[26px] font-bold leading-none tabular-nums text-ink sm:text-[32px]">{fmt(value)}</p>
      {hint ? <p className="mt-2 text-[12px] leading-snug text-muted sm:text-[12.5px]">{hint}</p> : null}
    </>
  );
  const cls = `${CARD} group block h-full p-4 transition-all duration-200 sm:p-5`;
  return href ? (
    <Link href={href} className={`${cls} hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(18,45,48,.08)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-serif text-lg font-bold text-ink">{title}</h2>
        {sub ? <p className="text-[13px] text-muted">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Who is on the platform, as one bar split by role. */
function PeopleMix({ stats }: { stats: AdminStats }) {
  const parts = [
    { label: "Students", value: stats.students, color: LS_COLORS.emerald, href: "/admin/students" },
    { label: "Parents", value: stats.parents, color: LS_COLORS.blue, href: "/admin/parents" },
    { label: "Teachers", value: stats.teachers, color: LS_COLORS.amber, href: "/admin/teachers" },
    { label: "Partners", value: stats.partners, color: LS_COLORS.teal, href: "/admin/partners" },
    { label: "Admins", value: stats.admins, color: LS_COLORS.axis, href: "/admin/users" },
  ];
  const total = parts.reduce((s, p) => s + p.value, 0);

  return (
    <div className={`${CARD} h-full p-5 sm:p-6`}>
      <SectionTitle
        title="People on the platform"
        sub={`${fmt(stats.users_total)} accounts across every role`}
        action={
          <Link href="/admin/users" className="hidden shrink-0 items-center gap-1 text-[13px] font-bold text-emerald hover:underline sm:inline-flex">
            All users <ArrowRight size={14} />
          </Link>
        }
      />
      <div
        className="flex h-3.5 w-full overflow-hidden rounded-full bg-soft-surface"
        role="img"
        aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}
      >
        {total > 0
          ? parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <span
                  key={p.label}
                  className="h-full border-r-2 border-white last:border-r-0"
                  style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
                />
              ))
          : null}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
        {parts.map((p) => (
          <li key={p.label}>
            <Link href={p.href} className="group block rounded-xl p-2 -m-2 hover:bg-paper">
              <span className="flex items-center gap-2 text-[12px] font-bold text-muted">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                {p.label}
              </span>
              <span className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-serif text-xl font-bold tabular-nums text-ink">{fmt(p.value)}</span>
                <span className="text-[11.5px] tabular-nums text-muted-light">{pct(p.value, total)}%</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Free vs Pro, with the conversion rate as the headline. */
function Plans({ stats }: { stats: AdminStats }) {
  const total = stats.plan_free + stats.plan_pro;
  const proShare = pct(stats.plan_pro, total);
  return (
    <div className={`${CARD} flex h-full flex-col p-5 sm:p-6`}>
      <SectionTitle title="Plans" sub="Share of accounts on Pro" />
      <div className="flex items-end gap-2">
        <span className="font-serif text-[44px] font-bold leading-none tabular-nums text-ink">{proShare}%</span>
        <span className="mb-1.5 text-[13px] text-muted">on Pro</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-soft-surface">
        <div className="h-full rounded-full bg-accent-deep" style={{ width: `${Math.max(proShare, total ? 1 : 0)}%` }} />
      </div>
      <dl className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <div className="rounded-xl bg-paper px-3.5 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Free</dt>
          <dd className="font-serif text-xl font-bold tabular-nums text-ink">{fmt(stats.plan_free)}</dd>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3.5 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-700">Pro</dt>
          <dd className="font-serif text-xl font-bold tabular-nums text-ink">{fmt(stats.plan_pro)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** The queue: requests waiting on an admin, each a link to the filtered list. */
function NeedsAttention({ stats }: { stats: AdminStats }) {
  const items = [
    {
      label: "Enrollment requests",
      sub: "Students waiting to join a school",
      value: stats.enrollments_pending,
      href: "/admin/enrollments?status=PENDING",
      icon: Link2,
    },
    {
      label: "Roster requests",
      sub: "Teacher ↔ student links to review",
      value: stats.teacher_links_pending,
      href: "/admin/assignments?status=PENDING",
      icon: UsersRound,
    },
  ];
  const open = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className={`${CARD} h-full p-5 sm:p-6`}>
      <SectionTitle
        title="Needs attention"
        sub={open ? `${open} request${open === 1 ? "" : "s"} waiting on you` : "Nothing waiting — all caught up"}
        action={
          open ? (
            // The screen's one citron moment: the open count.
            <span className="rounded-full bg-accent px-2.5 py-1 text-[12px] font-bold tabular-nums text-accent-ink">
              {open}
            </span>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald">
              <CircleCheck size={16} />
            </span>
          )
        }
      />
      <ul className="space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <Link
                href={it.href}
                className="group flex items-center gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors hover:border-emerald/30 hover:bg-paper"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    it.value ? "bg-warning-bg text-warning-ink" : "bg-ink/5 text-muted"
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-ink">{it.label}</span>
                  <span className="block truncate text-[12px] text-muted">{it.sub}</span>
                </span>
                <span className={`font-serif text-xl font-bold tabular-nums ${it.value ? "text-ink" : "text-muted-light"}`}>
                  {fmt(it.value)}
                </span>
                <ArrowRight size={15} className="text-muted-light transition-transform group-hover:translate-x-0.5 group-hover:text-emerald" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Operations({ stats }: { stats: AdminStats }) {
  const rows: { label: string; value: number; sub: string; href: string; icon: Icon }[] = [
    {
      label: "Enrollments",
      value: stats.enrollments_total,
      sub: `${pct(stats.enrollments_total - stats.enrollments_pending, stats.enrollments_total)}% settled`,
      href: "/admin/enrollments",
      icon: Link2,
    },
    {
      label: "Teacher links",
      value: stats.teacher_links_total,
      sub: `${fmt(stats.teacher_links_pending)} pending`,
      href: "/admin/assignments",
      icon: UsersRound,
    },
    { label: "Ingestions", value: stats.ingestions_total, sub: "Chapters ingested", href: "/admin/ingestions", icon: FileStack },
    { label: "Agents", value: stats.agents_total, sub: "Screen paused", href: "/admin/agents", icon: Bot },
  ];
  return (
    <div className={`${CARD} h-full p-5 sm:p-6`}>
      <SectionTitle title="Learning operations" sub="Links between people, and the content behind them" />
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.label}>
              <Link href={r.href} className="group flex items-center gap-3 rounded-xl bg-paper px-3.5 py-3 transition-colors hover:bg-emerald-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald shadow-[0_1px_2px_rgba(18,45,48,.06)]">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-bold text-muted">{r.label}</span>
                  <span className="block truncate text-[11.5px] text-muted-light">{r.sub}</span>
                </span>
                <span className="font-serif text-xl font-bold tabular-nums text-ink">{fmt(r.value)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SignalPromo() {
  return (
    <Link
      href="/admin/analytics"
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-navy p-5 text-white sm:p-6"
    >
      {/* Soft ocean glow, top-right. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/40 blur-3xl"
      />
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        <Activity size={18} />
      </span>
      <span className="relative mt-6 block">
        <span className="block font-serif text-xl font-bold">Learning Signal</span>
        <span className="mt-1 block text-[13px] leading-relaxed text-white/70">
          Where students progress or drop off — journey, activation, quality and item diagnostics.
        </span>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-accent">
          Open analytics <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[150px] animate-pulse rounded-2xl border border-border bg-white" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="h-[220px] animate-pulse rounded-2xl border border-border bg-white lg:col-span-8" />
        <div className="h-[220px] animate-pulse rounded-2xl border border-border bg-white lg:col-span-4" />
      </div>
    </div>
  );
}

export function StatsOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stats"));
  }, []);

  const pending = stats ? stats.enrollments_pending + stats.teacher_links_pending : 0;

  return (
    <div>
      <PageHeader title="Overview" subtitle="Platform-wide statistics." />

      {error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !stats ? (
        <OverviewSkeleton />
      ) : (
        <div className="space-y-4">
          {/* KPI strip. On a phone the queue comes first: it is the only card that asks for something. */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Rise i={0} className="order-2 sm:order-none">
              <Kpi
                label="Total users"
                value={stats.users_total}
                icon={Users}
                href="/admin/users"
                hint={`${fmt(stats.admins)} admin${stats.admins === 1 ? "" : "s"}`}
              />
            </Rise>
            <Rise i={1} className="order-3 sm:order-none">
              <Kpi
                label="Students"
                value={stats.students}
                icon={GraduationCap}
                href="/admin/students"
                well="bg-emerald-50 text-emerald-700"
                hint={`${pct(stats.students, stats.users_total)}% of all accounts`}
              />
            </Rise>
            <Rise i={2} className="order-4 sm:order-none">
              <Kpi
                label="Partner schools"
                value={stats.partners}
                icon={Building2}
                href="/admin/partners"
                hint={`${fmt(stats.teachers)} teacher${stats.teachers === 1 ? "" : "s"}`}
              />
            </Rise>
            <Rise i={3} className="order-1 sm:order-none">
              <Kpi
                label="Pending requests"
                value={pending}
                icon={Sparkles}
                href={stats.enrollments_pending ? "/admin/enrollments?status=PENDING" : "/admin/assignments?status=PENDING"}
                well={pending ? "bg-warning-bg text-warning-ink" : "bg-emerald-50 text-emerald-700"}
                hint={pending ? "Enrollments and roster links" : "All caught up"}
              />
            </Rise>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Rise i={4} className="lg:col-span-8">
              <PeopleMix stats={stats} />
            </Rise>
            <Rise i={5} className="lg:col-span-4">
              <Plans stats={stats} />
            </Rise>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Rise i={6} className="lg:col-span-4">
              <NeedsAttention stats={stats} />
            </Rise>
            <Rise i={7} className="lg:col-span-5">
              <Operations stats={stats} />
            </Rise>
            <Rise i={8} className="lg:col-span-3">
              <SignalPromo />
            </Rise>
          </div>
        </div>
      )}
    </div>
  );
}
