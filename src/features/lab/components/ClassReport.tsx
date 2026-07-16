"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Users, CheckCircle2, TriangleAlert, UserX, Circle, TrendingDown, type LucideIcon } from "lucide-react";
import { useLabStore } from "../store/useLabStore";
import type { ReportStatus } from "../types/lab";

const statusStyles: Record<ReportStatus, { className: string; icon: LucideIcon; label: string }> = {
  completed: { className: "bg-emerald-50 text-emerald-600", icon: CheckCircle2, label: "Completed" },
  incomplete: { className: "bg-warning-bg text-warning-ink", icon: TriangleAlert, label: "Incomplete" },
  absent: { className: "bg-border text-muted-light", icon: UserX, label: "Absent" },
  not_served: { className: "bg-danger-bg text-danger-ink", icon: Circle, label: "Not served" },
};

interface ClassReportProps {
  slotId: string;
}

export function ClassReport({ slotId }: ClassReportProps) {
  const { report, isLoadingReport, fetchReport } = useLabStore();

  useEffect(() => {
    fetchReport(slotId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  if (isLoadingReport && !report) {
    return <p className="text-sm text-muted">Loading report…</p>;
  }
  if (!report) return null;

  const { counts, students, interventions, common_gaps, allow_transcript_access } = report;

  const stats: { label: string; value: number; icon: LucideIcon; tint: string }[] = [
    { label: "Total", value: counts.total, icon: Users, tint: "bg-ink/5 text-ink" },
    { label: "Attended", value: counts.attended, icon: CheckCircle2, tint: "bg-[#e6f0fb] text-info" },
    { label: "Completed", value: counts.completed, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Incomplete", value: counts.incomplete, icon: TriangleAlert, tint: "bg-warning-bg text-warning-ink" },
    { label: "Absent / Not served", value: counts.absent + counts.not_served, icon: UserX, tint: "bg-danger-bg text-danger-ink" },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-white p-4 text-center"
            >
              <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${stat.tint}`}>
                <Icon size={15} />
              </div>
              <p className="font-serif text-2xl font-black text-ink">{stat.value}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-light">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted">Class roster</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-paper text-[10.5px] font-bold uppercase tracking-wider text-muted-light">
                <tr>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => {
                  const style = statusStyles[s.status];
                  const StatusIcon = style.icon;
                  return (
                    <tr key={s.student_id}>
                      <td className="px-4 py-2.5 font-semibold text-ink">
                        #{s.roll_no} {s.student_name}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${style.className}`}>
                          <StatusIcon size={11} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{s.device_label || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted">Follow-up list</h3>
            {interventions.length === 0 ? (
              <p className="text-[12.5px] text-muted">Everyone completed the objective.</p>
            ) : (
              <div className="space-y-1.5">
                {interventions.map((s) => (
                  <div key={s.student_id} className="flex items-center justify-between rounded-xl bg-warning-bg px-3 py-2 text-[12.5px] text-warning-ink">
                    <span className="font-semibold">{s.student_name}</span>
                    <span className="text-[10.5px] uppercase tracking-wider">{statusStyles[s.status].label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted">
              <TrendingDown size={13} />
              Common gaps
            </h3>
            {common_gaps.length === 0 ? (
              <p className="text-[12.5px] text-muted">No common gaps detected.</p>
            ) : (
              <div className="space-y-1.5">
                {common_gaps.map((g) => (
                  <div key={g.document_title} className="rounded-xl border border-border px-3 py-2 text-[12.5px]">
                    <p className="font-semibold text-ink">{g.document_title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Avg mastery {Math.round(g.avg_mastery * 100)}% · {g.students} student{g.students === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!allow_transcript_access && (
            <p className="text-[11px] text-muted-light">Transcript drill-down is disabled for this school.</p>
          )}
        </div>
      </div>
    </div>
  );
}
