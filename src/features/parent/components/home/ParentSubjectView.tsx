"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadStudentSubjects, useAnalyticsStore } from "@/store/useAnalyticsStore";
import { subjectIcon } from "../../utils/subjectVisuals";
import { GLASS, MaskIcon } from "./theme";
import { GlassSkeleton } from "../loader/GlassSkeleton";
import { usePortalBusy } from "../loader/PortalProgress";

// recharts-heavy; only loaded when a subject is opened.
const StudentAnalyticsDashboard = dynamic(
  () => import("@/components/analytics/StudentAnalyticsDashboard").then((m) => m.StudentAnalyticsDashboard),
  { ssr: false },
);

/**
 * One subject in depth: the existing chapter / skill / progression views,
 * opened from a Home subject card. The analytics store is pointed at this
 * child's subject list and this subject before the dashboard mounts, so it
 * never shows another child's or another subject's figures.
 */
export function ParentSubjectView({ studentId, subject }: { studentId: string; subject: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  usePortalBusy(!ready);

  useEffect(() => {
    let live = true;
    setReady(false);
    loadStudentSubjects(studentId)
      .then((subjects) => {
        if (!live) return;
        const match = subjects.find((s) => s === subject);
        if (!match) {
          // Not one of this child's subjects (e.g. after switching child).
          router.replace(`/parent/${studentId}`);
          return;
        }
        useAnalyticsStore.setState({
          analyticsSubjects: subjects,
          selectedAnalyticsSubject: match,
          skillSummary: null,
          cgScores: [],
          skillTree: [],
          analyticsChapterMastery: [],
          skillProgression: [],
          skillProfileHistory: [],
        });
        setReady(true);
      })
      .catch(() => {
        if (live) router.replace(`/parent/${studentId}`);
      });
    return () => { live = false; };
  }, [studentId, subject, router]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <Link
          href={`/parent/${studentId}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--pp-line)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--pp-ink)] hover:bg-[var(--pp-mint)]/50"
        >
          <ArrowLeft size={15} /> Home
        </Link>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pp-mint)]">
          <MaskIcon src={subjectIcon(subject)} color="var(--pp-green-deep)" size={22} />
        </span>
        <h1 className="text-[24px] font-bold text-[var(--pp-ink)]">{subject}</h1>
      </header>

      {ready ? (
        // The dashboard is built as a full page (h-screen, own scroll); here it
        // flows inside the portal's scrolling panel instead.
        <div className={`portal-legacy-type overflow-hidden rounded-2xl ${GLASS} [&>div]:!h-auto [&>div]:!overflow-visible [&>div]:!bg-transparent`}>
          <StudentAnalyticsDashboard mode="parent" studentId={studentId} />
        </div>
      ) : (
        <GlassSkeleton className="h-[420px] rounded-2xl" />
      )}
    </div>
  );
}
