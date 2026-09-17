"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PlacementResult, PlacementResultItem } from "../types/placement";

/**
 * The score screen — and the only place in the whole flow where correctness is
 * shown. Nothing during the form hints at it, by design, so this page carries
 * all of it at once: overall, per subject, per strand, and per item with the
 * answer key and the bank's explanation.
 *
 * `normalized_score` is `correct / total`, shown as a percentage.
 * `raw_score` is the same figure on the platform's 0–4 mastery scale; it is
 * not shown here, because a number a child cannot interpret next to a
 * percentage they can only adds noise.
 *
 * The per-item review is collapsed by default. A child who just finished 19
 * questions should meet a summary, not a wall of nineteen verdicts — but the
 * explanations are the genuinely useful part, so they are one tap away and
 * never behind a paywall or a "discuss with your teacher" gate.
 */
export function PlacementResultView({
  result,
  onDone,
}: {
  result: PlacementResult;
  onDone: () => void;
}) {
  const [showReview, setShowReview] = useState(false);
  const percent = Math.round(result.normalized_score * 100);

  return (
    <div className="px-6 sm:px-10 py-9 sm:py-11">
      <header className="text-center">
        <p
          className="text-[11px] font-black uppercase tracking-widest m-0"
          style={{ color: "var(--pl-ink-faint)" }}
        >
          All done
        </p>
        <h2
          className="mt-2 mb-0 font-extrabold text-[26px] sm:text-[30px]"
          style={{ color: "var(--pl-primary)", fontFamily: "var(--font-display)" }}
        >
          You got {result.correct} of {result.total}
        </h2>
        <p className="mt-2 mb-0 text-[15px]" style={{ color: "var(--pl-ink-mid)" }}>
          That&apos;s {percent}% — this is where we&apos;ll start you from, not a grade.
        </p>
      </header>

      <div
        className="mt-7 h-3 rounded-full overflow-hidden"
        style={{ background: "var(--pl-surface)" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Overall score"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: "var(--pl-accent)",
            transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>

      <Section title="By subject">
        <div className="grid gap-2.5">
          {result.subjects.map((subject) => (
            <ScoreRow
              key={subject.subject}
              label={subject.subject}
              correct={subject.correct}
              total={subject.total}
              fraction={subject.normalized_score}
            />
          ))}
        </div>
      </Section>

      {result.skills.length > 0 && (
        <Section title="By topic">
          <div className="grid gap-2.5">
            {result.skills.map((skill) => (
              <ScoreRow
                key={skill.skill_ref}
                label={skill.strand}
                sublabel={skill.subject}
                correct={skill.correct}
                total={skill.total}
                fraction={skill.normalized_score}
              />
            ))}
          </div>
        </Section>
      )}

      <div className="mt-8">
        {/* eslint-disable-next-line no-restricted-syntax -- a disclosure
            toggle, not an action: it needs aria-expanded and a full-width
            two-column layout with a rotating chevron, none of which Button
            models. */}
        <button
          type="button"
          onClick={() => setShowReview((v) => !v)}
          aria-expanded={showReview}
          className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 border-2 transition-colors focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: "var(--pl-card)",
            borderColor: "var(--pl-border)",
            color: "var(--pl-primary)",
            // @ts-expect-error -- CSS custom property for the focus ring
            "--tw-ring-color": "var(--pl-ring)",
          }}
        >
          <span className="text-[14px] font-bold">
            {showReview ? "Hide" : "Go through"} all {result.items.length} questions
          </span>
          <ChevronDown
            size={18}
            strokeWidth={2.6}
            style={{ transform: showReview ? "rotate(180deg)" : undefined, transition: "transform 200ms" }}
          />
        </button>

        {showReview && (
          <div className="mt-3 grid gap-3">
            {result.items.map((item, i) => (
              <ReviewCard key={item.item_id} item={item} number={i + 1} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-9 flex justify-center">
        <div className="w-full max-w-[320px]">
          <Button variant="primary" size="lg" fullWidth onClick={onDone}>
            Start learning
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h3
        className="text-[11px] font-black uppercase tracking-widest m-0 mb-3"
        style={{ color: "var(--pl-ink-faint)" }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function ScoreRow({
  label,
  sublabel,
  correct,
  total,
  fraction,
}: {
  label: string;
  sublabel?: string;
  correct: number;
  total: number;
  fraction: number;
}) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--pl-card)", border: "1px solid var(--pl-border)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold" style={{ color: "var(--pl-ink)" }}>
          {label}
          {sublabel && (
            <span className="ml-2 text-[12px] font-medium" style={{ color: "var(--pl-ink-faint)" }}>
              {sublabel}
            </span>
          )}
        </span>
        <span className="text-[13px] font-bold shrink-0" style={{ color: "var(--pl-primary)" }}>
          {correct}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "var(--pl-surface)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(fraction * 100)}%`,
            background: "var(--pl-primary)",
            transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
    </div>
  );
}

function ReviewCard({ item, number }: { item: PlacementResultItem; number: number }) {
  return (
    <article
      className="rounded-xl p-4"
      style={{
        background: "var(--pl-card)",
        border: "1px solid var(--pl-border)",
        borderLeft: `4px solid ${item.is_correct ? "var(--pl-primary)" : "var(--pl-ink-faint)"}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
          style={{
            background: item.is_correct ? "var(--pl-primary)" : "var(--pl-surface)",
            color: item.is_correct ? "var(--pl-accent)" : "var(--pl-ink-mid)",
          }}
        >
          {item.is_correct ? (
            <Check size={13} strokeWidth={3.5} />
          ) : (
            <X size={13} strokeWidth={3.5} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-black uppercase tracking-widest m-0"
            style={{ color: "var(--pl-ink-faint)" }}
          >
            {number} · {item.subject} · {item.strand}
          </p>
          <p className="mt-1.5 mb-0 text-[14px] font-semibold leading-relaxed" style={{ color: "var(--pl-ink)" }}>
            {item.prompt}
          </p>

          <dl className="mt-3 mb-0 grid gap-1.5 text-[13px]">
            <Row term="You said" value={formatResponse(item.response)} />
            {!item.is_correct && <Row term="Answer" value={formatResponse(item.answer_key)} />}
          </dl>

          {item.explanation && (
            <p className="mt-3 mb-0 text-[13px] leading-relaxed" style={{ color: "var(--pl-ink-mid)" }}>
              {item.explanation}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="font-bold shrink-0" style={{ color: "var(--pl-ink-faint)" }}>
        {term}
      </dt>
      <dd className="m-0 font-medium" style={{ color: "var(--pl-ink)" }}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Renders an answer payload for a human.
 *
 * These are ids, not display text — the item's options aren't in the result
 * payload, so there is nothing to look them up against. Ids in this bank are
 * short and mnemonic ("b", "true", "l1→r2"), which is legible enough beside
 * the explanation; resolving them to text would mean refetching every item.
 */
function formatResponse(response: PlacementResultItem["response"]): string {
  if ("choice" in response) return response.choice;
  if ("selected" in response) return response.selected.join(", ");
  if ("value" in response) return String(response.value);
  if ("text" in response) return response.text;
  if ("order" in response) return response.order.join(" → ");
  if ("pairs" in response) return response.pairs.map(([l, r]) => `${l}→${r}`).join(", ");
  if ("point" in response) return `(${response.point.x}, ${response.point.y})`;
  return "—";
}
