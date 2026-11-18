"use client";

import { useEffect, useState } from "react";

import { AlertTriangle, CheckCircle2, Monitor, Smartphone } from "lucide-react";
import type {
  BankConcept,
  BankQuestion,
  ConceptGap,
  ConceptPoolSurface,
  DeviceLimits,
  LiveSurface,
  SurfaceReadiness,
} from "../types/sources";
import { sourcesService } from "../services/sourcesService";

/**
 * The device side of the review (backend device-ready plan §13): whether the touch device can show a question, how strong the
 * finished question's evidence is, and whether each concept has enough device-ready questions for a learner to finish it there.
 * The backend decides everything shown here; this file only words it.
 */

/** The device profile the review shows today (backend `bank_device.PROFILES`). */
export const DEVICE_PROFILE = "gened-p4-touch-v1";

const chip =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-black";

/** Device refusal codes in the partner's words. An unknown code is shown as a generic reason. */
const REFUSAL: Record<string, string> = {
  format_not_declared: "the device has no screen for this answer type",
  too_many_options: "too many choices (at most 6)",
  too_many_entries: "too many pairs (at most 4)",
  too_many_blanks: "too many blanks (at most 2)",
  entry_too_long: "a choice or entry is too long",
  stem_too_long: "the question is over 500 characters",
  not_ascii: "uses characters the device cannot show",
  not_renderable: "the device cannot draw it",
  figure_not_allowed: "needs a picture the device cannot show",
  figure_unavailable: "needs a picture the device cannot show",
  unscorable: "its answer cannot be checked automatically",
  activity: "activities run in the app, not on the device",
};

const TIER: Record<string, { label: string; tone: string; hint: string }> = {
  strong: {
    label: "Strong evidence",
    tone: "bg-[#075E63]/10 text-[#075E63]",
    hint: "One correct answer counts double.",
  },
  weak: {
    label: "Ordinary evidence",
    tone: "bg-[#122D30]/5 text-[#122D30]/60",
    hint: "Counts once.",
  },
  rubric: {
    label: "Marked by rubric",
    tone: "bg-[#122D30]/5 text-[#122D30]/60",
    hint: "Marked against a rubric.",
  },
  none: {
    label: "Not counted",
    tone: "bg-amber-100 text-amber-900",
    hint: "Its answer cannot be checked, so it counts for nothing.",
  },
};

/** The two chips on a question card: its computed evidence strength, and whether the device can show it. */
export function QuestionDeviceChips({ q }: { q: BankQuestion }) {
  const fit = q.device?.[DEVICE_PROFILE];
  const tier = q.tier ? TIER[q.tier] : undefined;
  const downgraded = q.tier === "weak" && q.requested_strength === "strong";
  if (!fit && !tier) return null;
  return (
    <>
      {tier && (
        <span
          className={`${chip} ${tier.tone}`}
          title={
            downgraded
              ? `${tier.hint} Proposed as strong, but the finished question gives ordinary evidence.`
              : (q.tier_problem ?? tier.hint)
          }
        >
          {tier.label}
          {downgraded && " (was strong)"}
        </span>
      )}
      {fit &&
        (fit.eligible ? (
          <span
            className={`${chip} bg-emerald-50 text-emerald-700`}
            title="The GenEd device can show this question."
          >
            <Smartphone size={11} aria-hidden /> Fits the device
          </span>
        ) : (
          <span
            className={`${chip} bg-[#122D30]/5 text-[#122D30]/60`}
            title={`Shown in the app only: ${refusalText(fit.refusal)}.`}
          >
            <Monitor size={11} aria-hidden /> App only
          </span>
        ))}
    </>
  );
}

/** One line under a card that cannot go to the device: why, so an edit can fix it. */
export function DeviceRefusalNote({ q }: { q: BankQuestion }) {
  const fit = q.device?.[DEVICE_PROFILE];
  if (!fit || fit.eligible || fit.refusal === "activity") return null;
  return (
    <p className="text-[11.5px] text-[#122D30]/55">
      Not on the device: {refusalText(fit.refusal)}. It still counts in the app.
    </p>
  );
}

function refusalText(code: string | null, limits?: DeviceLimits): string {
  const stem = limits ? stemLimit(limits) : undefined;
  if (code === "stem_too_long" && stem)
    return `the question is over ${stem} characters`;
  return (code && REFUSAL[code]) || "it does not fit the device";
}

/** The smallest stem limit any format declares. */
function stemLimit(limits: DeviceLimits): number | undefined {
  const all = Object.values(limits.formats)
    .map((f) => f.max_stem_chars)
    .filter((n): n is number => typeof n === "number");
  return all.length ? Math.min(...all) : undefined;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** The device-limits paragraph, built from the limits the review sends; the older wording when there are none. */
export function limitsText(limits?: DeviceLimits): string {
  const f = limits?.formats;
  const choice = f?.single_choice ?? f?.multiple_select;
  const match = f?.matching_pairs;
  const blanks = f?.blanks;
  const parts: string[] = [];
  if (choice?.max_options && choice.max_chars) {
    parts.push(
      `single or multiple choice (up to ${plural(choice.max_options, "choice")} of ${choice.max_chars} characters)`,
    );
  }
  if (match?.max_entries && match.max_chars)
    parts.push(
      `matching (up to ${plural(match.max_entries, "pair")} of ${match.max_chars} characters)`,
    );
  if (blanks?.max_blanks && blanks.max_chars)
    parts.push(
      `fill in the blanks (up to ${plural(blanks.max_blanks, "blank")} of ${blanks.max_chars} characters)`,
    );
  if (f?.number_line) parts.push("number lines");
  if (parts.length === 0)
    return "The device shows single or multiple choice (up to 6 choices of 60 characters), matching (up to 4 pairs of 45 characters), fill in the blanks (up to 2 blanks of 14 characters) and number lines.";
  const stem = limits ? stemLimit(limits) : undefined;
  const list =
    parts.length > 1
      ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
      : parts[0];
  return `The device shows ${list}.${stem ? ` Question text up to ${stem} characters.` : ""}`;
}

/** How many more device-ready questions, from distinct families, the concept needs to be resilient on the device. */
export function devicesNeeded(pool: ConceptPoolSurface): number {
  if (pool.alternate === "resilient") return 0;
  if (pool.strong_families > 0) return 1;
  return Math.max(1, 3 - pool.families);
}

const STATUS: Record<
  ConceptPoolSurface["alternate"],
  { label: string; tone: string }
> = {
  resilient: { label: "Ready on the device", tone: "text-emerald-700" },
  needs_alternate: {
    label: "Needs a spare device question",
    tone: "text-amber-800",
  },
  not_completable: {
    label: "Not possible on the device yet",
    tone: "text-amber-800",
  },
};

/** Per concept: can a learner finish it on the device? Counted from accepted questions; drafts are shown as what accepting adds. */
export function DeviceReadiness({
  concepts,
  limits,
}: {
  concepts: BankConcept[];
  limits?: DeviceLimits;
}) {
  const rows = concepts
    .filter((c) => c.status === "planned" && c.pool)
    .map((c) => {
      const withDrafts = c.pool?.[DEVICE_PROFILE];
      // An older backend sends no accepted-only pool: fall back to the pool with drafts.
      const accepted =
        c.pool_accepted === undefined
          ? withDrafts
          : (c.pool_accepted?.[DEVICE_PROFILE] ?? undefined);
      return { c, accepted, withDrafts };
    });
  if (rows.length === 0) return null;
  const isReady = (p?: ConceptPoolSurface) => p?.alternate === "resilient";
  const ready = rows.filter((r) => isReady(r.accepted)).length;
  const afterDrafts = rows.filter((r) => isReady(r.withDrafts)).length;
  return (
    <details
      open={ready < rows.length}
      className="group rounded-2xl bg-[#F6F7F2] px-3.5 py-3"
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#122D30]/55 [&::-webkit-details-marker]:hidden">
        <Smartphone size={13} aria-hidden /> On the GenEd device
        <span className="ml-auto normal-case tracking-normal font-bold tabular-nums text-[#122D30]/50">
          {ready} of {rows.length} ready
          {afterDrafts > ready &&
            ` · ${afterDrafts} once you accept the drafts`}
        </span>
      </summary>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {rows.map(({ c, accepted, withDrafts }) => {
          const ok = isReady(accepted);
          const draftsFix = !ok && isReady(withDrafts);
          const look = STATUS[accepted?.alternate ?? "not_completable"];
          const need = accepted ? devicesNeeded(accepted) : 3;
          return (
            <li
              key={c.concept_key}
              className="flex items-start gap-2 text-xs text-[#122D30]/80"
            >
              {ok ? (
                <CheckCircle2
                  size={13}
                  className="mt-0.5 shrink-0 text-emerald-600"
                  aria-hidden
                />
              ) : (
                <AlertTriangle
                  size={13}
                  className="mt-0.5 shrink-0 text-amber-600"
                  aria-hidden
                />
              )}
              <span>
                <span className="font-bold text-[#122D30]">{c.title}</span>
                <span
                  className={`block text-[11px] ${draftsFix ? "text-sky-800" : look.tone}`}
                >
                  {ok
                    ? `${look.label}: ${accepted!.families} accepted device question${accepted!.families === 1 ? "" : "s"} from different families.`
                    : draftsFix
                      ? "Ready once you accept its draft questions below."
                      : `${look.label}: add ${need} more question${need === 1 ? "" : "s"} the device can show, each testing it a different way.`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {ready < rows.length && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-[#122D30]/55">
          Only accepted questions reach learners. {limitsText(limits)} Questions
          that don&rsquo;t fit still count in the app.
        </p>
      )}
    </details>
  );
}

const SURFACE: Record<string, { label: string; icon: typeof Monitor }> = {
  web: { label: "Web app", icon: Monitor },
  [DEVICE_PROFILE]: { label: "GenEd device", icon: Smartphone },
};

/** A concept key in readable form: the part after the section prefix, words spaced. */
export function conceptName(key: string): string {
  const name = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
  return name.replace(/[-_]+/g, " ").trim() || key;
}

function gapText(g: ConceptGap): string {
  const need = devicesNeeded({
    units: 0,
    clean_path: false,
    families: g.families,
    strong_families: g.strong_families,
    alternate: g.alternate,
  });
  return `${conceptName(g.concept_key)} needs ${need} more accepted question${need === 1 ? "" : "s"}`;
}

/**
 * Before publishing: per surface, how many steps a learner can finish, counted from the accepted questions only.
 * Informative: a chapter that is not device-ready still works in the app, so it never blocks publishing.
 */
export function ReadyForStudents({
  readiness,
}: {
  readiness: SurfaceReadiness[] | undefined;
}) {
  if (!readiness || readiness.length === 0) return null;
  return (
    <section
      aria-label="Ready for students"
      className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3.5"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">
        Ready for students
      </p>
      <ul className="flex flex-col gap-2">
        {readiness.map((s) => {
          const look = SURFACE[s.surface] ?? {
            label: s.surface,
            icon: Smartphone,
          };
          const Icon = look.icon;
          const ready = s.steps.filter((st) => st.ready).length;
          const short = s.steps.filter((st) => !st.ready);
          return (
            <li key={s.surface} className="text-sm text-[#122D30]">
              <span className="flex items-center gap-2">
                <Icon size={14} aria-hidden className="text-[#122D30]/50" />
                <span className="font-bold">{look.label}</span>
                <span
                  className={`ml-auto flex items-center gap-1 text-xs font-bold tabular-nums ${s.ready ? "text-emerald-700" : "text-amber-800"}`}
                >
                  {s.ready ? (
                    <CheckCircle2 size={13} aria-hidden />
                  ) : (
                    <AlertTriangle size={13} aria-hidden />
                  )}
                  {ready} of {s.steps.length} steps ready
                </span>
              </span>
              {short.length > 0 && (
                <ul className="mt-1 ml-6 flex flex-col gap-0.5 text-[11.5px] text-[#122D30]/65">
                  {short.map((st) => (
                    <li key={st.section_key}>
                      <span className="font-bold">
                        {st.section_key} {st.title}
                      </span>
                      : {st.gaps.map(gapText).join("; ")}.
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {readiness.some((s) => !s.ready) && (
        <p className="text-[11px] leading-relaxed text-[#122D30]/55">
          Counted from accepted questions only. You can still publish: a step
          that isn&rsquo;t ready on the device still works in the app.
        </p>
      )}
    </section>
  );
}

/** For a published chapter: which surfaces the live version works on. Fetched on its own; shows nothing until it arrives. */
export function LiveReadiness({ sourceId }: { sourceId: string }) {
  const [live, setLive] = useState<LiveSurface[] | null>(null);
  useEffect(() => {
    let gone = false;
    sourcesService
      .release(sourceId)
      .then((r) => !gone && setLive(r.live_readiness ?? []))
      .catch(() => !gone && setLive([]));
    return () => {
      gone = true;
    };
  }, [sourceId]);
  if (!live || live.length === 0) return null;
  return <LiveReadinessChips live={live} />;
}

export function LiveReadinessChips({ live }: { live: LiveSurface[] }) {
  return (
    <ul aria-label="Live on" className="mt-2 flex flex-wrap gap-1.5">
      {live.map((s) => {
        const look = SURFACE[s.surface] ?? {
          label: s.surface,
          icon: Smartphone,
        };
        const Icon = look.icon;
        return (
          <li
            key={s.surface}
            title={
              s.short_steps.length
                ? `Not yet on ${look.label}: ${s.short_steps.join("; ")}`
                : undefined
            }
            className={`${chip} ${s.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
          >
            <Icon size={11} aria-hidden /> {look.label}
            {s.ready ? " ✓" : `: ${s.steps_ready} of ${s.steps_total} steps`}
          </li>
        );
      })}
    </ul>
  );
}
