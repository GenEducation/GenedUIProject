"use client";

import { Globe } from "lucide-react";
import { McqItem } from "./McqItem";
import { TrueFalseItem } from "./TrueFalseItem";
import { MultiSelectItem } from "./MultiSelectItem";
import { NumericItem } from "./NumericItem";
import { FillBlankItem } from "./FillBlankItem";
import { MatchItem } from "./MatchItem";
import { OrderItem } from "./OrderItem";
import { MapPointItem } from "./MapPointItem";
import { ChartItem } from "./ChartItem";
import { langAttrs, type ItemWidgetProps } from "./itemProps";

/**
 * A subject's icon, vendored from `public/placement/icons/` (see that
 * folder's source pack) — each file already bakes in its own rounded-square
 * background, so there is no separate tint/chip styling to maintain here.
 * Matched by substring so bank spellings that vary ("Social & Political
 * Science" vs "Social Science", "EVS" vs "Environmental Studies") still
 * resolve — this is decorative, never load-bearing, so a loose match beats
 * an exhaustive one that silently falls through to the default for anything
 * unanticipated.
 */
const SUBJECT_ICONS: { match: RegExp; file: string }[] = [
  { match: /math/i, file: "mathematics" },
  { match: /science/i, file: "science" },
  { match: /social|political|civics/i, file: "social-political-science" },
  { match: /english/i, file: "english" },
  { match: /hindi/i, file: "hindi" },
  { match: /geography/i, file: "geography" },
  { match: /history/i, file: "history" },
  { match: /environmental|evs/i, file: "evs" },
  { match: /econom/i, file: "economics" },
];

function subjectIconSrc(subject: string): string | null {
  const match = SUBJECT_ICONS.find((s) => s.match.test(subject));
  return match ? `/placement/icons/${match.file}.png` : null;
}

/**
 * Dispatches one placement item to its widget, and owns the chrome every item
 * shares: a subject icon chip, a "Q{n}" label, no marks pill and no score
 * anywhere on this screen — a placement form that advertises what each item
 * is worth invites a child to game it, and they are told nothing about
 * correctness until the result page anyway.
 *
 * Deliberately dense, not the roomy single-question layout the test paper
 * uses: up to five of these render on one screen at once in a masonry
 * column (see `PlacementBoard.tsx`), so the per-item chrome has to earn its
 * height. A batch mixes 3–4 subjects across its cards, so — unlike a screen
 * with one subject heading — every card names its own `item.subject`; the
 * prompt drops the relaxed line-height a single full-page question could
 * afford.
 */
export function ItemRenderer({ item, value, onChange, disabled }: ItemWidgetProps) {
  const { lang } = langAttrs(item);
  const iconSrc = subjectIconSrc(item.subject);

  return (
    <div
      className="rounded-xl border p-3 sm:p-3.5 space-y-2.5"
      style={{ background: "var(--pl-card)", borderColor: "var(--pl-border)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {iconSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- a tiny (24px) decorative vendored icon, not a page asset next/image needs to optimize.
            <img src={iconSrc} alt="" className="w-6 h-6 shrink-0 rounded-lg" aria-hidden="true" />
          ) : (
            <span
              className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-lg"
              style={{ background: "var(--pl-surface)", color: "var(--pl-ink-mid)" }}
              aria-hidden="true"
            >
              <Globe size={13} strokeWidth={2.4} />
            </span>
          )}
          <span
            className="text-[12px] font-bold truncate"
            style={{ color: "var(--pl-ink)" }}
            lang={lang}
          >
            {item.subject}
          </span>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider shrink-0"
          style={{ color: "var(--pl-ink-faint)" }}
        >
          Q{item.index + 1}
        </span>
      </div>

      <p
        lang={lang}
        className="text-[14px] sm:text-[15px] font-semibold leading-snug m-0"
        style={{ color: "var(--pl-ink)" }}
      >
        {item.prompt}
      </p>

      {renderWidget()}
    </div>
  );

  function renderWidget() {
    const props: ItemWidgetProps = { item, value, onChange, disabled };
    switch (item.item_type) {
      case "mcq":
        return <McqItem {...props} />;
      case "true_false":
        return <TrueFalseItem {...props} />;
      case "multi_select":
        return <MultiSelectItem {...props} />;
      case "numeric":
        return <NumericItem {...props} />;
      case "fill_blank":
        return <FillBlankItem {...props} />;
      case "match":
        return <MatchItem {...props} />;
      case "order":
        return <OrderItem {...props} />;
      case "map_point":
        return <MapPointItem {...props} />;
      case "chart":
        return <ChartItem {...props} />;
      default:
        // A new item type shipped ahead of its widget. Better an honest note
        // than a blank card the student cannot get past.
        return (
          <p className="text-[13px] font-medium" style={{ color: "var(--pl-ink-mid)" }}>
            This question needs a newer version of the app. Please refresh.
          </p>
        );
    }
  }
}
