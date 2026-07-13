"use client";

import { motion } from "framer-motion";
import { Users, Clock, CheckCircle2, TrendingUp, type LucideIcon } from "lucide-react";
import { TeacherOverview } from "../services/teacherService";

interface TeacherSummaryProps {
  overview: TeacherOverview | null;
  approvedAvgMastery: number | null;
  isLoading: boolean;
}

export function TeacherSummary({ overview, approvedAvgMastery, isLoading }: TeacherSummaryProps) {
  const total = overview?.total_students ?? 0;
  const pending = overview?.pending ?? 0;
  const approved = overview?.approved ?? 0;

  const stats: { label: string; value: string | number; icon: LucideIcon; tint: string; sub?: string }[] = [
    { label: "Total students", value: total, icon: Users, tint: "bg-ink/5 text-ink" },
    { label: "Pending", value: pending, icon: Clock, tint: "bg-warning-bg text-warning-ink" },
    { label: "Approved", value: approved, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
    {
      label: "Avg. mastery",
      value: approvedAvgMastery !== null ? `${approvedAvgMastery}%` : "—",
      icon: TrendingUp,
      tint: "bg-ink/5 text-ink",
      sub: "approved only",
    },
  ];

  return (
    <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-white p-5 shadow-[0_1px_2px_rgba(4,46,92,.06),0_1px_3px_rgba(4,46,92,.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(4,46,92,.07)]"
          >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${stat.tint}`}>
              <Icon size={17} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{stat.label}</p>
            <p className="mt-1.5 font-serif text-3xl font-semibold leading-none text-ink">
              {isLoading ? (
                <span className="inline-block h-8 w-12 animate-pulse rounded bg-border" />
              ) : (
                stat.value
              )}
            </p>
            {stat.sub && <p className="mt-1.5 text-[11px] text-muted-light">{stat.sub}</p>}
          </motion.div>
        );
      })}
    </section>
  );
}
