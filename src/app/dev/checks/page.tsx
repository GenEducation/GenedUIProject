"use client";

/**
 * Dev-only harness for the deterministic check renderers: mounts the real StepCard with the lesson routes answered from local
 * fixtures (no auth, no backend), one format per `?format=`. An answer is marked right or wrong by a fixture key kept here, and every
 * request body is kept in `window.__answers` so a browser test can read exactly what the renderer sent. 404s in production.
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StepCard } from "@/features/learning/components/StepCard";
import { useLessonStore } from "@/features/learning/useLessonStore";
import { useStudentStore, type StudentProfile } from "@/features/student/store/useStudentStore";
import type { AnswerResponse, CheckItem } from "@/features/learning/types";
import { CHECK_ITEM, LESSON_ID, makeLessonInstance, syntheticPayload } from "@/test/msw/handlers/lesson";

const opt = (id: string, text: string) => ({ id, text });
const base = { id: CHECK_ITEM, role: "checkpoint" as const, figure_groups: [] };

/** SYNTHETIC fixtures: the check as the payload carries it, and whether a response is the right one. */
const FIXTURES: Record<string, { check: CheckItem; right: (r: AnswerResponse) => boolean }> = {
  written: {
    check: { ...base, prompt: "SYNTHETIC what do plants need to grow?", response_type: "rubric", options: [], task: { mode: "written", min_chars: 5, max_chars: 400 } },
    right: () => false, // a written answer goes to /written-responses, scripted below
  },
  multiple_select: {
    check: { ...base, prompt: "SYNTHETIC choose every even number", response_type: "mcq", selection: "multiple", options: [opt("o1", "2"), opt("o2", "3"), opt("o3", "4"), opt("o4", "5")] },
    right: (r) => r.kind === "choice" && r.option_ids.length === 2 && r.option_ids.includes("o1") && r.option_ids.includes("o3"),
  },
  matching: {
    check: { ...base, prompt: "SYNTHETIC match each animal to its sound", response_type: "matching", left_entries: ["cat", "cow", "dog"], options: [opt("m1", "moo"), opt("m2", "woof"), opt("m3", "meow")] },
    right: (r) => r.kind === "pairs" && JSON.stringify(r.pairs) === JSON.stringify([{ left: "cat", right: "meow" }, { left: "cow", right: "moo" }, { left: "dog", right: "woof" }]),
  },
  sequencing: {
    check: { ...base, prompt: "SYNTHETIC put the steps in order", response_type: "sequence", options: [opt("s2", "second"), opt("s3", "third"), opt("s1", "first")] },
    right: (r) => r.kind === "ordered" && JSON.stringify(r.items) === JSON.stringify(["first", "second", "third"]),
  },
  number_line: {
    check: { ...base, prompt: "SYNTHETIC place 6 on the line", response_type: "numeric", options: [], entry: { mode: "number_line", min: "0", max: "10", step: "1" } },
    right: (r) => r.kind === "numeric" && Number(r.value) === 6,
  },
  slider: {
    check: { ...base, prompt: "SYNTHETIC set the slider to 3", response_type: "numeric", options: [], entry: { mode: "slider", min: "0", max: "10", step: "1" } },
    right: (r) => r.kind === "numeric" && Number(r.value) === 3,
  },
  tiles: {
    check: { ...base, prompt: "SYNTHETIC build 2 times x plus 3", response_type: "symbolic", options: [], entry: { mode: "tiles", tiles: ["2", "*", "x", "+", "3", "-"] } },
    right: (r) => r.kind === "text" && r.text.replace(/\s+/g, "") === "2*x+3",
  },
  grouping: {
    check: { ...base, prompt: "SYNTHETIC sort the fruit by colour", response_type: "grouping", left_entries: ["apple", "banana", "cherry"], options: [opt("g1", "red"), opt("g2", "yellow")] },
    right: (r) => r.kind === "pairs" && JSON.stringify(r.pairs) === JSON.stringify([{ left: "apple", right: "red" }, { left: "banana", right: "yellow" }, { left: "cherry", right: "red" }]),
  },
  blanks: {
    check: { ...base, prompt: "SYNTHETIC fill in: [1] comes first, then [2], then [3]", response_type: "blanks", left_entries: ["1", "2", "3"], options: [opt("w1", "alpha"), opt("w2", "beta"), opt("w3", "gamma"), opt("w4", "delta")] },
    right: (r) => r.kind === "pairs" && JSON.stringify(r.pairs) === JSON.stringify([{ left: "1", right: "alpha" }, { left: "2", right: "beta" }, { left: "3", right: "gamma" }]),
  },
};

declare global {
  interface Window {
    __answers?: unknown[];
    __seen?: Record<string, boolean>;
  }
}

function Harness() {
  const params = useSearchParams();
  const format = params.get("format") ?? "multiple_select";
  const grade = Number(params.get("grade") ?? 6);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fixture = FIXTURES[format];
    if (!fixture) return;
    const real = window.fetch.bind(window);
    window.__answers = [];
    let revision = 4;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const path = new URL(url, window.location.origin).pathname;
      if (!path.includes("/v1/instances/")) return real(input, init);
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
      if (path.endsWith("/teacher-payload")) {
        const payload = syntheticPayload();
        payload.node.check_items = [fixture.check];
        return json(payload);
      }
      if (path.endsWith("/teacher-turns")) return json([]);
      if (path.includes("/checks/") && path.endsWith("/delivered")) return json({ item_id: CHECK_ITEM, round_ordinal: 1, replayed: false });
      if (path.endsWith("/written-responses")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { request_id: string; text: string; clarification?: string };
        window.__answers?.push(body);
        const instance = makeLessonInstance({ revision });
        const seen = (window.__seen ??= {});
        // A scripted evaluator for the harness only: the first send of "fail" drops (500), the retry with the SAME request id commits once.
        if (body.text.includes("fail") && !seen[body.request_id]) {
          seen[body.request_id] = true;
          return json({ detail: "boom" }, 500);
        }
        if (body.text.includes("ambiguous") && !body.clarification) {
          return json({ status: "needs_clarification", attempt_id: null, outcome: null, correct: null, round_state: null, replayed: false, feedback: null, clarification: { criterion: "needs", probe: "Can you tell me one more thing plants need?", remaining: 1 }, instance });
        }
        if (body.text.includes("gate")) {
          return json({ status: "committed", attempt_id: "99999999-0000-4000-8000-000000000002", outcome: "unscorable", correct: null, round_state: "open", replayed: false, feedback: { kind: "retry", code: "write_a_little_more", retry: true, reason: "gate_response_too_short" }, clarification: null, instance });
        }
        revision += 1;
        const good = /water and light/i.test(body.text + " " + (body.clarification ?? ""));
        return json({ status: "committed", attempt_id: "99999999-0000-4000-8000-000000000003", outcome: good ? "correct" : "incorrect", correct: good, round_state: good ? "open" : "failed", replayed: Boolean(seen[body.request_id]), feedback: { kind: "criteria", criteria: [{ criterion: "needs", title: "Names two needs", met: good, shown: good ? "names two needs" : "names none", next: good ? null : "names one need", error_tags: [] }] }, clarification: null, instance: makeLessonInstance({ revision }) });
      }
      if (path.endsWith("/responses")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { response: AnswerResponse };
        window.__answers?.push(body);
        const correct = fixture.right(body.response);
        revision += 1;
        return json({
          attempt_id: "99999999-0000-4000-8000-000000000001",
          outcome: correct ? "correct" : "incorrect",
          correct,
          eligibility_reason: null,
          round_id: null,
          round_state: "open",
          replayed: false,
          instance: makeLessonInstance({ revision }),
        });
      }
      return json(makeLessonInstance({ revision }));
    };
    localStorage.setItem("gened_auth_token", "token-synthetic");
    useStudentStore.setState({ studentProfile: { grade } as StudentProfile });
    void useLessonStore.getState().load(LESSON_ID).then(() => setReady(true));
    return () => {
      window.fetch = real;
    };
  }, [format, grade]);

  if (process.env.NODE_ENV === "production") return null;
  if (!FIXTURES[format]) return <p>Unknown format: {format}</p>;
  return (
    <main className="mx-auto max-w-xl p-4" data-testid="harness">
      {ready ? <StepCard subject="Mathematics" /> : null}
    </main>
  );
}

export default function ChecksHarness() {
  return (
    <Suspense fallback={null}>
      <Harness />
    </Suspense>
  );
}
