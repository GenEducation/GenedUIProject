"use client";

/**
 * Dev-only harness for the parent portal's subject page. Mounts the real
 * SubjectInsightsView inside the portal's theme and backdrop, with the
 * analytics endpoints answered from fixtures (no auth, no backend), so each
 * state can be checked against rendered pixels. 404s in production.
 *
 *   ?scenario=full     a child with a few weeks of history (default)
 *   ?scenario=first    one check-in so far
 *   ?scenario=empty    nothing assessed yet
 *   ?scenario=error    history and chapters fail; the rest still renders
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SubjectInsightsView } from "@/features/parent/components/subject/SubjectInsightsView";
import { PORTAL_THEME } from "@/features/parent/components/home/theme";
import { PortalBusyProvider, PortalProgressBar } from "@/features/parent/components/loader/PortalProgress";

type Scenario = "full" | "first" | "empty" | "error";
const SCENARIOS: Scenario[] = ["full", "first", "empty", "error"];

const DAY = 864e5;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();

const GROUPS: [string, string, number][] = [
  ["g1", "Fractions & Decimals", 0.86],
  ["g2", "Integers", 0.74],
  ["g3", "Algebraic Expressions", 0.63],
  ["g4", "Ratio & Proportion", 0.52],
  ["g5", "Lines & Angles", 0.44],
  ["g6", "Data Handling", 0.33],
  ["g7", "Perimeter & Area", 0],
];

const LOS: Record<string, [string, number, number, string | null][]> = {
  g1: [["Comparing fractions", 0.92, 4, "Compared unlike fractions correctly in all four questions, including mixed numbers."], ["Adding unlike fractions", 0.84, 3, "Found common denominators reliably; one slip when simplifying."]],
  g2: [["Ordering integers", 0.8, 3, "Placed negatives correctly on the number line."], ["Multiplying integers", 0.66, 2, "Sign rules mostly right; mixed up (−)×(−) once."]],
  g3: [["Like terms", 0.7, 2, null], ["Substitution", 0.55, 2, "Substituted correctly but made arithmetic slips with negatives."]],
  g4: [["Unitary method", 0.6, 2, null], ["Equivalent ratios", 0.44, 2, "Scaled only one side of the ratio in two answers."]],
  g5: [["Complementary angles", 0.5, 2, null], ["Transversals", 0.38, 2, "Confused alternate and corresponding angles."]],
  g6: [["Reading bar graphs", 0.45, 2, null], ["Mean & median", 0.2, 1, "Added values correctly but divided by the wrong count."]],
  g7: [],
};

const CHAPTERS = ["Integers", "Fractions and Decimals", "Data Handling", "Simple Equations", "Lines and Angles", "The Triangle and its Properties", "Comparing Quantities", "Rational Numbers", "Perimeter and Area"];
const COVERAGE = [100, 85, 60, 40, 25, 0, 0, 0, 0];
const MASTERY = [0.78, 0.86, 0.4, 0.62, 0.36, 0, 0, 0, 0];
const MINUTES = [180, 150, 95, 60, 25, 0, 0, 0, 0];
const SESSIONS = [5, 4, 3, 2, 1, 0, 0, 0, 0];

const PROGRESSION: [string, number[]][] = [
  ["Comparing fractions", [0.55, 0.7, 0.82, 0.92]],
  ["Transversals", [0.62, 0.5, 0.38]],
  ["Unitary method", [0.3, 0.45, 0.6]],
  ["Mean & median", [0.2]],
  ["Like terms", [0.6, 0.66, 0.7]],
  ["Ordering integers", [0.7, 0.78, 0.8]],
  ["Equivalent ratios", [0.5, 0.44]],
  ["Adding unlike fractions", [0.6, 0.84]],
];

function fixture(url: string, scenario: Scenario): unknown | number {
  const empty = scenario === "empty";
  const first = scenario === "first";
  if (url.includes("/rag/taxonomy/subjects")) return { subjects: [{ name: "Mathematics", grades: [7] }] };
  if (url.includes("/available-agents")) {
    return { partners: [{ subjects: [{ subject: "Mathematics", agents: [{ agent_id: "m", subject: "Mathematics", grade: 7 }] }] }] };
  }
  if (url.includes("/skill-summary")) return empty ? { overall_score: null, skill_index: 0, session_count: 0 } : { overall_score: first ? 0.48 : 0.66, skill_index: 3, session_count: first ? 1 : 15 };
  if (url.includes("/cg-scores")) return empty ? [] : GROUPS.map(([cg_id, cg_name, m]) => ({ cg_id, cg_name, avg_mastery: first ? Math.max(0, m - 0.2) : m }));
  if (url.includes("/skill-tree")) {
    return empty ? [] : GROUPS.map(([cg_id, cg_name, avg]) => ({
      cg_id, cg_name, avg_mastery: avg,
      concepts: LOS[cg_id].length
        ? [{ c_id: `${cg_id}c`, c_name: `${cg_name} basics`, los: LOS[cg_id].map(([skill_name, mastery_level, assessment_count, justification]) => ({ skill_name, mastery_level, assessment_count, justification })) }]
        : [],
    }));
  }
  if (url.includes("/chapter-mastery")) {
    if (scenario === "error") return 500;
    return CHAPTERS.map((document_title, i) => ({
      subject: "Mathematics", document_title, grade: 7,
      completion_percentage: empty ? 0 : COVERAGE[i], mastery_score: empty ? 0 : MASTERY[i],
      study_count: empty ? 0 : SESSIONS[i], time_minutes: empty ? 0 : MINUTES[i], time_sessions: empty ? 0 : SESSIONS[i],
    }));
  }
  if (url.includes("/skill-profile-history")) {
    if (scenario === "error") return 500;
    if (empty) return { history: [] };
    const points: [number, number][] = first ? [[1, 0.48]] : [[48, 0.42], [40, 0.47], [33, 0.5], [26, 0.55], [19, 0.58], [12, 0.6], [5, 0.64], [1, 0.66]];
    return { history: points.map(([d, s]) => ({ overall_score: s, skill_index: 0, adaptive_mode: "", recorded_at: ago(d) })) };
  }
  if (url.includes("/skill-progression")) {
    if (scenario === "error") return 500;
    if (empty) return [];
    return PROGRESSION.map(([skill_name, values], i) => ({
      skill_id: `s${i}`, skill_name,
      history: (first ? values.slice(-1) : values).map((mastery_level, k) => ({ mastery_level, assessment_count: 1, source: "", session_id: null, recorded_at: ago(40 - k * 12) })),
    }));
  }
  return [];
}

export default function ParentSubjectHarnessPage() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <Suspense>
      <ParentSubjectHarness />
    </Suspense>
  );
}

function ParentSubjectHarness() {
  const params = useSearchParams();
  const scenario = (SCENARIOS.find((s) => s === params.get("scenario")) ?? "full") as Scenario;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Answer the portal's API calls from fixtures, after a short delay so the
    // loading state shows. Anything not aimed at the API passes through.
    const real = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const api = process.env.NEXT_PUBLIC_API_URL;
      if (!api || !url.startsWith(api)) return real(input, init);
      await new Promise((r) => setTimeout(r, 450));
      const body = fixture(url, scenario);
      return typeof body === "number"
        ? new Response(JSON.stringify({ detail: "fixture failure" }), { status: body, headers: { "Content-Type": "application/json" } })
        : new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount the page only once the fixtures answer
    setReady(true);
    return () => {
      window.fetch = real;
    };
  }, [scenario]);

  return (
    <PortalBusyProvider>
      <div style={PORTAL_THEME} className="relative isolate min-h-screen bg-[var(--pp-bg)] font-[family-name:var(--font-display)] text-[var(--pp-ink)]">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-[8%] h-[460px] w-[460px] rounded-full bg-[#9FE3C4]/45 blur-[90px]" />
          <div className="absolute left-[-120px] top-[38%] h-[380px] w-[380px] rounded-full bg-[#D7EA7C]/35 blur-[90px]" />
          <div className="absolute bottom-[-140px] right-[30%] h-[420px] w-[420px] rounded-full bg-[#BBD7FF]/40 blur-[100px]" />
        </div>
        <nav className="flex flex-wrap gap-2 px-4 pt-4 text-[12px] font-semibold lg:px-8">
          {SCENARIOS.map((s) => (
            <a key={s} href={`?scenario=${s}`} className={`rounded-full px-3 py-1 ${s === scenario ? "bg-[var(--pp-ink)] text-white" : "bg-white/70"}`}>
              {s}
            </a>
          ))}
        </nav>
        <div className="mt-3 px-4 lg:px-8"><PortalProgressBar /></div>
        <main className="px-4 pb-8 pt-3 lg:px-8">
          <div className="mx-auto max-w-[1160px] rounded-[28px] border border-white/60 bg-white/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm sm:p-6 lg:p-7">
            {ready && <SubjectInsightsView key={scenario} studentId="s1" subject="Mathematics" childName="Aarav Sharma" />}
          </div>
        </main>
      </div>
    </PortalBusyProvider>
  );
}
