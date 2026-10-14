"use client";

/**
 * Dev-only harness for how the lesson screen fits a screen: mounts the real LessonScreen with the lesson routes
 * answered from the test fixtures (no auth, no backend), so a phone size can be checked against rendered pixels.
 * Use the browser's device sizes (e.g. 375 × 667 upright, 667 × 375 sideways). 404s in production.
 */
import { useEffect, useState } from "react";
import { LessonScreen } from "@/features/learning/components/LessonScreen";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { FIGURE_GROUP, LESSON_ID, makeLessonInstance, syntheticPayload } from "@/test/msw/handlers/lesson";

export default function LessonFitHarness() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const real = window.fetch.bind(window);
    const picture = `${window.location.origin}/loaders/journey/char-read.svg`;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const path = (() => {
        try {
          return new URL(url, window.location.origin).pathname;
        } catch {
          return url;
        }
      })();
      if (!path.includes("/v1/instances/")) return real(input, init);
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      if (path.endsWith("/teacher-payload/presentation-manifest")) {
        return json({
          expires_at: 4_102_444_800,
          figures: { "pic-1": { figure_group_id: FIGURE_GROUP, url: picture, width_px: 800, height_px: 600, mime: "image/svg+xml", sha256: "0".repeat(64) } },
        });
      }
      if (path.endsWith("/teacher-payload")) return json(syntheticPayload("3.4 Playing with Digits"));
      if (path.endsWith("/teacher-turns")) {
        return json([
          { turn_id: "t-1", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [FIGURE_GROUP],
            teacher_text: "Here's a number. What do you get when you add up its digits? Try it for 1400." },
        ]);
      }
      return json(makeLessonInstance());
    };
    useLessonLaunch.setState({
      instanceId: LESSON_ID,
      subject: "Mathematics",
      chapter: { chapter_id: "c", source_id: "", number: 3, title: "Number Play", book_title: "Ganita Prakash", palette: "mathematics:1", card: null },
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount the lesson only once the fixtures answer
    setReady(true);
    return () => {
      window.fetch = real;
    };
  }, []);

  if (process.env.NODE_ENV === "production") return null;
  return ready ? <LessonScreen instanceId={LESSON_ID} /> : null;
}
