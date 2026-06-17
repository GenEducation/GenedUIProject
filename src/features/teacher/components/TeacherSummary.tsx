"use client";

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

  const stats = [
    { label: "Total students", value: total, accent: "#042E5C" },
    { label: "Pending", value: pending, accent: "#E8A33D" },
    { label: "Approved", value: approved, accent: "#059F6D" },
    {
      label: "Avg. mastery",
      value: approvedAvgMastery !== null ? `${approvedAvgMastery}%` : "—",
      accent: "#042E5C",
      sub: "approved only",
    },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="relative overflow-hidden rounded-2xl border border-[#e6ecf2] bg-white p-5 shadow-[0_1px_2px_rgba(4,46,92,.06),0_1px_3px_rgba(4,46,92,.05)]"
        >
          <span
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: stat.accent }}
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7d91]">
            {stat.label}
          </p>
          <p className="mt-1.5 font-serif text-3xl font-semibold leading-none text-[#042E5C]">
            {isLoading ? (
              <span className="inline-block h-8 w-12 animate-pulse rounded bg-[#e6ecf2]" />
            ) : (
              stat.value
            )}
          </p>
          {stat.sub && (
            <p className="mt-1.5 text-[11px] text-[#94a3b8]">{stat.sub}</p>
          )}
        </div>
      ))}
    </section>
  );
}
