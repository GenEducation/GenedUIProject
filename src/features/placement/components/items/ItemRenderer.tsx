"use client";

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
 * Dispatches one placement item to its widget, and owns the chrome every item
 * shares: a compact numbered card, no marks pill and no score anywhere on
 * this screen — a placement form that advertises what each item is worth
 * invites a child to game it, and they are told nothing about correctness
 * until the result page anyway.
 *
 * Deliberately dense, not the roomy single-question layout the test paper
 * uses: up to five of these render on one screen at once, laid out by
 * slot family (see `slotGrid.ts`), so the per-item chrome has to earn its
 * height. A batch mixes 3–4 subjects across its cards, so — unlike a screen
 * with one subject heading — every card names its own `item.subject` next to
 * its strand; the prompt drops the relaxed line-height a single full-page
 * question could afford.
 */
export function ItemRenderer({ item, value, onChange, disabled }: ItemWidgetProps) {
  const { lang } = langAttrs(item);

  return (
    <div
      className="rounded-xl border p-3 sm:p-3.5 space-y-2.5"
      style={{ background: "var(--pl-card)", borderColor: "var(--pl-border)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-full text-[10px] font-black"
          style={{ background: "var(--pl-primary)", color: "var(--pl-accent)" }}
          aria-hidden="true"
        >
          {item.index + 1}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--pl-ink-faint)" }}
          lang={lang}
        >
          {item.subject} · {item.strand}
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
