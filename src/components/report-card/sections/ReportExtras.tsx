"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { AnswerHelp } from "../types";
import type { ReportWho } from "../v1Report";
import { loadActivity, loadMisconceptions, loadTrends, type ActivityData, type Misconception, type Trends } from "./reportSections";
import { useSection, type Section } from "./useSection";

/** What the new backend adds to the card beyond the chapter list: who it is for, and the sections with their own reads. */
export interface ReportExtras {
  /** Right answers alone vs with help across every chapter. */
  help: AnswerHelp | null;
  answered: number;
  correct: number;
  activity: Section<ActivityData> | null;
  trends: Section<Trends> | null;
  misconceptions: Section<Misconception[]> | null;
}

const NONE: ReportExtras = { help: null, answered: 0, correct: 0, activity: null, trends: null, misconceptions: null };
const Ctx = createContext<ReportExtras>(NONE);

export const useReportExtras = () => useContext(Ctx);

/** Reads the activity, trends and misconceptions sections for `who` (null: the teacher's report, which has none). */
export function ReportExtrasProvider({
  who, summary, children,
}: {
  who: ReportWho | null;
  summary: { help: AnswerHelp; answered: number; correct: number } | null;
  children: React.ReactNode;
}) {
  const key = who ? (who.role === "parent" ? `parent:${who.childId}` : `student:${who.studentId ?? ""}`) : "";
  const activity = useSection(who ? () => loadActivity(who) : null, key);
  const trends = useSection(who ? () => loadTrends(who) : null, key);
  const misconceptions = useSection(who ? () => loadMisconceptions(who) : null, key);
  const value = useMemo<ReportExtras>(
    () => ({ help: summary?.help ?? null, answered: summary?.answered ?? 0, correct: summary?.correct ?? 0, activity, trends, misconceptions }),
    [summary, activity, trends, misconceptions],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
