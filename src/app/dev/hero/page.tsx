"use client";

/**
 * Dev-only harness for the dashboard's Continue card: the English, Mathematics and Science heroes (and the tide for
 * any other subject), with no auth or backend. `?subject=Science` shows one; `?done=7&total=19` sets the steps.
 * Reload to replay the entrance. Not linked from the app.
 */
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ContinueLearningCard } from "@/features/student/components/ContinueLearningCard";

const SUBJECTS = [
  { subject: "English", title: "A Bottle of Dew", color: "#2A6E22", chapter: 1 },
  { subject: "Mathematics", title: "Fractions on a Line", color: "#8DB000", chapter: 3 },
  { subject: "Science", title: "Light and Shadows", color: "#1D6315", chapter: 2 },
  { subject: "History", title: "The First Cities", color: "#9A6A3E", chapter: 4 },
];

function Heroes() {
  const params = useSearchParams();
  const only = params.get("subject");
  const done = Number(params.get("done") ?? 2);
  const total = Number(params.get("total") ?? 19);
  const list = only ? SUBJECTS.filter((s) => s.subject === only) : SUBJECTS;
  return (
    <main style={{ background: "#F5F2E8", minHeight: "100vh", padding: "32px clamp(16px, 4vw, 56px)" }}>
      {list.map((s) => (
        <ContinueLearningCard
          key={s.subject}
          subject={s.subject}
          session={{ title: s.title, mastery: Math.round((done / total) * 100), vis: { label: s.subject, color: s.color } }}
          chapterNumber={s.chapter}
          steps={{ done, total }}
          revisiting={s.subject === "English"}
          onStart={() => {}}
        />
      ))}
    </main>
  );
}

export default function HeroDevPage() {
  return (
    <Suspense>
      <Heroes />
    </Suspense>
  );
}
