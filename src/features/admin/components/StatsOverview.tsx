"use client";

import { useEffect, useState } from "react";
import { getStats, AdminStats } from "../adminService";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">
        {label}
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

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Overview</h1>
      <p className="text-sm text-white/40 mb-6">Platform-wide statistics.</p>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3.5 text-sm text-rose-300">
          {error}
        </div>
      ) : !stats ? (
        <div className="text-white/40 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total users" value={stats.users_total} />
          <StatCard label="Students" value={stats.students} />
          <StatCard label="Parents" value={stats.parents} />
          <StatCard label="Partners" value={stats.partners} />
          <StatCard label="Teachers" value={stats.teachers} />
          <StatCard label="Admins" value={stats.admins} />
          <StatCard label="Free plan" value={stats.plan_free} />
          <StatCard label="Pro plan" value={stats.plan_pro} />
          <StatCard label="Enrollments" value={stats.enrollments_total} />
          <StatCard label="Pending enrollments" value={stats.enrollments_pending} />
          <StatCard label="Teacher links" value={stats.teacher_links_total} />
          <StatCard label="Pending teacher links" value={stats.teacher_links_pending} />
          <StatCard label="Agents" value={stats.agents_total} />
          <StatCard label="Ingestions" value={stats.ingestions_total} />
        </div>
      )}
    </div>
  );
}
