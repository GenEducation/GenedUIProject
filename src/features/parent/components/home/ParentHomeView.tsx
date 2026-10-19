"use client";

import React from "react";
import { useParentHomeData } from "../../hooks/useParentHomeData";
import { periodOption } from "../../utils/homeMetrics";
import { LearningScoreCard, SessionsCard, SkillIndexCard, StudyTimeCard } from "./MetricCards";
import { ActivityTrendChart } from "./ActivityTrendChart";
import { AlertsPanel } from "./AlertsPanel";
import { SubjectOverview } from "./SubjectOverview";
import { usePortalBusy } from "../loader/PortalProgress";

/**
 * The parent portal's Home: how one child is doing at a glance. (The
 * greeting lives in the portal's top bar.)
 *
 * Overall Learning Score, Skill Index and the alerts are combined figures the
 * backend will provide; until then they render their empty states.
 */
export function ParentHomeView({ studentId }: { studentId: string }) {
  const data = useParentHomeData(studentId);
  const period = periodOption(data.period);
  usePortalBusy(
    data.subjects.state === "loading" ||
      data.subjects.items.some((i) => i.state === "loading") ||
      data.sessions.state === "loading" ||
      data.activity.state === "loading",
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LearningScoreCard />
        <SkillIndexCard />
        <SessionsCard state={data.sessions.state} total={data.sessions.total} trendPct={data.sessions.trendPct} />
        <StudyTimeCard
          state={data.activity.state}
          minutes={data.activity.totalMinutes}
          period={data.period}
          onPeriodChange={data.setPeriod}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ActivityTrendChart state={data.activity.state} series={data.activity.series} caption={period.caption} />
        <AlertsPanel alerts={[]} />
      </div>

      <SubjectOverview studentId={studentId} state={data.subjects.state} items={data.subjects.items} />
    </div>
  );
}
