"use client";

/**
 * Dev-only harness for the "welcome back" revisit choice: seeds the lesson store with synthetic revisit options and
 * shows the in-progress popup (`RevisitPrompt`) and the finished chapter's summary (`LessonSummary`) inside the lesson
 * theme, with no auth or backend. `?view=summary` shows the summary; `?many=1` lists a 16-step chapter. Not linked
 * from the app.
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RevisitPrompt } from "@/features/learning/components/RevisitPrompt";
import { LessonSummary } from "@/features/learning/components/LessonSummary";
import { useLessonStore } from "@/features/learning/useLessonStore";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { LessonScreen } from "@/features/learning/components/LessonScreen";
import { FIGURE_GROUP, LESSON_ID, makeLessonInstance, syntheticPayload } from "@/test/msw/handlers/lesson";
import type { RevisitSection } from "@/features/learning/types";

const ID = "00000000-0000-4000-8000-0000000000aa";
const TITLES = [
  "What is a fraction?", "Halves and quarters", "Equivalent fractions", "Comparing fractions", "Fractions on a number line",
  "Adding like fractions", "Subtracting like fractions", "Mixed numbers", "Improper fractions", "Fractions of a set",
  "Word problems", "Simplest form", "Ordering fractions", "Fractions and money", "Fractions in recipes", "Chapter check",
];

const skill = (title: string, level: "strong" | "got_it" | "getting_there") => ({ component_id: title, title, level, p_known: null });

const section = (step: number, over: Partial<RevisitSection> = {}): RevisitSection => ({
  instance_node_id: `77777777-0000-4000-8000-${String(step).padStart(12, "0")}`,
  node_id: `88888888-0000-4000-8000-${String(step).padStart(12, "0")}`,
  step,
  title: TITLES[step - 1],
  type: "practice",
  status: "passed",
  scored: 5,
  correct: 5,
  score: 1,
  in_review: false,
  ...over,
});

function RevisitHarness() {
  const params = useSearchParams();
  const summary = params.get("view") === "summary";
  const many = params.get("many") === "1";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const total = many ? 16 : 6;
    const sections = Array.from({ length: total }, (_, i) => {
      const step = i + 1;
      if (step === 2) return section(step, { status: "below_pass_mark", correct: 2, score: 0.4 });
      if (step === 4) return section(step, { status: "not_attempted", scored: 0, correct: 0, score: null });
      if (step === 5) return section(step, { status: "below_pass_mark", correct: 1, score: 0.2 });
      if (step === 3) return section(step, { correct: 4, score: 0.8, mastery: { level: "getting_there", skills: [skill("Equivalent fractions", "getting_there"), skill("Halves", "strong")] } });
      if (step === 1) return section(step, { type: "teach", scored: 0, correct: 0, score: null, mastery: { level: "strong", skills: [skill("Naming fractions", "strong")] } });
      if (step === 6) return section(step, { type: "teach", scored: 0, correct: 0, score: null, mastery: { level: "got_it", skills: [skill("Adding fractions", "got_it")] } });
      if (!summary && step > (many ? 14 : 5)) return section(step, { status: "not_reached", scored: 0, correct: 0, score: null });
      return section(step);
    });
    useLessonLaunch.setState({
      instanceId: ID,
      subject: "Maths",
      chapter: { chapter_id: "c", source_id: "", number: 3, title: "Fun with Fractions", book_title: "Maths Mela", palette: "maths:1", card: null },
    });
    useLessonStore.setState({
      instanceId: ID,
      instance: {
        id: ID,
        chapter_id: "c",
        plan_version_id: "p",
        state: summary ? "completed" : "active",
        revision: 4,
        next_action: summary ? "completed" : "learn",
        nodes_done: summary ? total : 5,
        nodes_total: total,
        active_node: null,
      } as never,
      revisitOptions: {
        instance_id: ID,
        state: summary ? "completed" : "active",
        revision: 4,
        sections,
        weak: sections.filter((s) => s.status === "below_pass_mark" || s.status === "not_attempted"),
        resume: summary ? null : { instance_node_id: "r", step: 6, title: TITLES[5], nodes_done: 5, nodes_total: total },
        review_in_progress: false,
      },
      revisitPromptOpen: !summary,
      report: summary
        ? {
            instance_id: ID,
            chapter_id: "c",
            completed: true,
            nodes_done: total,
            nodes_total: total,
            outcomes: [
              { lo_id: "1", code: "a", title: "Name fractions of a whole", status: "m", mastered: true },
              { lo_id: "2", code: "b", title: "Compare fractions with like denominators", status: "l", mastered: false },
            ],
            keep_practising: [{ component_id: "k", title: "Equivalent fractions", status: "l", needs_adult_support: false }],
            answers: { answered: 24, correct: 17 },
          }
        : null,
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the choice only once the store is seeded
    setReady(true);
  }, [summary, many]);

  if (!ready) return null;
  return (
    <div className="lesson-theme min-h-dvh p-6">
      <div className="mx-auto max-w-xl">{summary ? <LessonSummary /> : <RevisitPrompt />}</div>
    </div>
  );
}

/**
 * `?view=lesson`: the real lesson screen, its routes answered from the test fixtures, opened as a visit (as from the
 * home page), so the "welcome back" choice is seen over the lesson it belongs to.
 */
function LessonVisitHarness() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const real = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const path = new URL(url, window.location.origin).pathname;
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      if (!path.includes("/v1/")) return real(input, init);
      // Everything outside the lesson's own routes (recent chapters, profile) answers empty: no backend here.
      if (!path.includes("/v1/instances/")) return json({ chapters: [] });
      if (path.endsWith("/revisit-options")) {
        const sections = [1, 2, 3, 4, 5, 6, 7].map((step) =>
          section(step, step === 6 ? { status: "below_pass_mark", correct: 0, score: 0 } : step === 2 ? { status: "below_pass_mark", correct: 2, score: 0.4 } : {}),
        );
        return json({
          instance_id: LESSON_ID,
          state: "active",
          revision: 4,
          sections,
          weak: sections.filter((x) => x.status !== "passed"),
          resume: { instance_node_id: "r", step: 8, title: "3.4 Playing with Digits", nodes_done: 7, nodes_total: 17 },
          review_in_progress: false,
        });
      }
      if (path.endsWith("/teacher-payload/presentation-manifest")) return json({ expires_at: 4_102_444_800, figures: {} });
      if (path.endsWith("/teacher-payload")) return json(syntheticPayload("3.4 Playing with Digits"));
      if (path.endsWith("/teacher-turns")) {
        return json([{ turn_id: "t-1", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [FIGURE_GROUP], teacher_text: "Welcome back!" }]);
      }
      return json(makeLessonInstance());
    };
    useLessonLaunch.setState({
      instanceId: LESSON_ID,
      subject: "Mathematics",
      chapter: { chapter_id: "c", source_id: "", number: 3, title: "Number Play", book_title: "Ganita Prakash", palette: "mathematics:1", card: null },
    });
    useLessonLaunch.getState().offerRevisit(LESSON_ID);
    try {
      if (!localStorage.getItem("gened_auth_token")) localStorage.setItem("gened_auth_token", "token-synthetic");
    } catch {
      /* no storage: the lesson may ask to sign in */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount the lesson only once the fixtures answer
    setReady(true);
    return () => {
      window.fetch = real;
    };
  }, []);
  return ready ? <LessonScreen instanceId={LESSON_ID} /> : null;
}

function HarnessSwitch() {
  return useSearchParams().get("view") === "lesson" ? <LessonVisitHarness /> : <RevisitHarness />;
}

export default function RevisitHarnessPage() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <Suspense>
      <HarnessSwitch />
    </Suspense>
  );
}
