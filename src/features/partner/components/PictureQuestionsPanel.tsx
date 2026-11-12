"use client";

import { useEffect, useState } from "react";
import { Check, ImageOff, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { visualsService } from "../services/visualsService";
import type {
  PictureFigure,
  PictureQuestion,
  PictureReason,
} from "../types/sources";
import type { VisualSummary } from "../types/visuals";

/** What a held picture question needs from the partner, in plain words. */
export const PICTURE_REASON: Record<PictureReason, string> = {
  not_identified:
    "This question mentions a picture, but GenEd couldn’t tell which one. Choose its picture, or remove the question.",
  redraw_pending:
    "Its picture’s redraw is waiting for your review. Accept the redraw in Visuals and the next run includes it.",
  no_redraw:
    "Its picture was judged to need no redraw, so there is nothing to show with it. Choose another picture, or remove the question.",
  not_in_step:
    "The tutor would discuss it at a lesson step that doesn’t show its picture, so it is left out for now.",
};

/** A figure's textbook crop and redraw from the visual library, by target key (`<section key>:<reading order>`). */
export type FigureImages = Record<
  string,
  { crop?: VisualSummary; redraw?: VisualSummary }
>;

/** The chapter's figure crops and redraws, pending and accepted, by target key. */
export async function loadFigureImages(
  sourceId: string,
): Promise<FigureImages> {
  const lists = await Promise.all(
    (["pending", "accepted"] as const).map((state) =>
      visualsService.listCandidates({
        source_id: sourceId,
        kind: "figure",
        state,
        limit: 200,
      }),
    ),
  );
  const out: FigureImages = {};
  // Accepted last, so an accepted visual wins over a pending one of the same figure.
  for (const v of lists.flat()) {
    if (!v.target_key) continue;
    const slot = (out[v.target_key] ??= {});
    if (v.origin === "textbook_crop") slot.crop = v;
    else slot.redraw = v;
  }
  return out;
}

interface Props {
  sourceId: string;
  pictures: PictureQuestion[];
  /** Questions the partner is removing (`item_key`). */
  removed: Set<string>;
  /** The figure chosen for each question (`item_key` -> target key). */
  chosen: Record<string, string>;
  onRemove: (keys: string[], remove: boolean) => void;
  onChoose: (key: string, figure: string | null) => void;
}

/** Every printed question that needs a picture: what it shows, why it is held, and the partner's way out. */
export function PictureQuestionsPanel({
  sourceId,
  pictures,
  removed,
  chosen,
  onRemove,
  onChoose,
}: Props) {
  const [images, setImages] = useState<FigureImages>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    loadFigureImages(sourceId)
      .then((found) => !cancelled && setImages(found))
      .catch(() => undefined); // the pictures stay as placeholders; the decisions still work
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const held = pictures.filter((p) => p.status === "held");
  const open = held.filter((p) => !removed.has(p.item_key));
  const unidentified = open.filter(
    (p) => p.reason === "not_identified" || p.reason === "no_redraw",
  );
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const removeSelected = () => {
    onRemove([...selected], true);
    setSelected(new Set());
  };

  return (
    <div className="flex flex-col gap-3">
      {held.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 border border-[#122D30]/8">
          <p className="text-xs text-[#122D30]/70 flex-1 min-w-48">
            {open.length} of {held.length} held{" "}
            {held.length === 1 ? "question needs" : "questions need"} a
            decision. Nothing here blocks the chapter.
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={unidentified.length === 0}
            onClick={() =>
              setSelected(new Set(unidentified.map((p) => p.item_key)))
            }
          >
            Select all without a picture ({unidentified.length})
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={selected.size === 0}
            onClick={removeSelected}
            leadingIcon={<Trash2 size={14} />}
          >
            Remove selected ({selected.size})
          </Button>
        </div>
      )}
      {pictures.map((p) => (
        <PictureCard
          key={p.item_key}
          question={p}
          images={images}
          removing={removed.has(p.item_key)}
          selected={selected.has(p.item_key)}
          chosen={chosen[p.item_key] ?? null}
          onSelect={() => toggle(p.item_key)}
          onRemove={(remove) => onRemove([p.item_key], remove)}
          onChoose={(figure) => onChoose(p.item_key, figure)}
        />
      ))}
    </div>
  );
}

function PictureCard({
  question,
  images,
  removing,
  selected,
  chosen,
  onSelect,
  onRemove,
  onChoose,
}: {
  question: PictureQuestion;
  images: FigureImages;
  removing: boolean;
  selected: boolean;
  chosen: string | null;
  onSelect: () => void;
  onRemove: (remove: boolean) => void;
  onChoose: (figure: string | null) => void;
}) {
  const held = question.status === "held";
  const linked = chosen ? [chosen] : question.figures;
  const status = removing
    ? "Will be removed (listed as rejected)"
    : question.status === "removed"
      ? "Removed"
      : chosen
        ? "Picture chosen: included on the next run once its redraw is accepted"
        : held
          ? "Held"
          : "Shown with its picture";
  return (
    <article
      className={`rounded-2xl border bg-white p-4 flex flex-col gap-3 ${removing ? "opacity-60" : ""} ${held && !removing ? "border-amber-300" : "border-[#122D30]/8"}`}
      aria-label={question.prompt}
    >
      <div className="flex items-start gap-3">
        {held && !removing && (
          <input
            type="checkbox"
            className="mt-1"
            checked={selected}
            onChange={onSelect}
            aria-label={`Select “${question.prompt.slice(0, 60)}”`}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#122D30]">
            {question.prompt}
          </p>
          <p className="text-[11px] text-[#122D30]/50 mt-0.5">
            {question.page ? `Page ${question.page} · ` : ""}
            {status}
          </p>
          {held && question.reason && !removing && !chosen && (
            <p className="text-xs text-amber-800 mt-1">
              {PICTURE_REASON[question.reason]}
            </p>
          )}
        </div>
        {removing || question.status === "removed" ? (
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Undo2 size={14} />}
            onClick={() => onRemove(false)}
          >
            Keep
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Trash2 size={14} />}
            onClick={() => onRemove(true)}
          >
            Remove
          </Button>
        )}
      </div>
      {linked.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {linked.map((key) => (
            <FigureTile
              key={key}
              figureKey={key}
              images={images}
              label="Attached picture"
            />
          ))}
        </div>
      )}
      {!removing &&
        question.status !== "removed" &&
        question.suggestions.length > 0 && (
          <details
            open={
              held &&
              (question.reason === "not_identified" ||
                question.reason === "no_redraw")
            }
          >
            <summary className="cursor-pointer text-xs font-bold text-[#075E63]">
              {linked.length
                ? "Choose a different picture"
                : "Choose its picture"}
            </summary>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {question.suggestions.map((f) => (
                <Suggestion
                  key={f.key}
                  figure={f}
                  images={images}
                  picked={chosen === f.key}
                  onPick={() => onChoose(chosen === f.key ? null : f.key)}
                />
              ))}
            </div>
          </details>
        )}
    </article>
  );
}

function Thumb({ visual, alt }: { visual?: VisualSummary; alt: string }) {
  const src = visualsService.imageSrc(visual?.image_url ?? null);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived library image.
    <img
      src={src}
      alt={alt}
      className="h-24 w-full object-contain rounded-lg bg-[#F6F7F2]"
    />
  ) : (
    <div className="h-24 w-full rounded-lg bg-[#F6F7F2] flex items-center justify-center text-[#122D30]/30">
      <ImageOff size={18} aria-hidden />
    </div>
  );
}

function FigureTile({
  figureKey,
  images,
  label,
}: {
  figureKey: string;
  images: FigureImages;
  label: string;
}) {
  const found = images[figureKey] ?? {};
  return (
    <figure className="w-40 flex flex-col gap-1">
      <div className="grid grid-cols-2 gap-1">
        <Thumb visual={found.crop} alt={`Textbook figure ${figureKey}`} />
        <Thumb visual={found.redraw} alt={`Redraw of figure ${figureKey}`} />
      </div>
      <figcaption className="text-[10.5px] text-[#122D30]/50">
        {label}: textbook · redraw
        {found.redraw ? ` (${found.redraw.state})` : " (none yet)"}
      </figcaption>
    </figure>
  );
}

function Suggestion({
  figure,
  images,
  picked,
  onPick,
}: {
  figure: PictureFigure;
  images: FigureImages;
  picked: boolean;
  onPick: () => void;
}) {
  const found = images[figure.key] ?? {};
  return (
    <div
      className={`rounded-xl border p-2 flex flex-col gap-1.5 ${picked ? "border-[#075E63]" : "border-[#122D30]/8"}`}
    >
      <Thumb visual={found.crop ?? found.redraw} alt={`Figure ${figure.key}`} />
      <p className="text-[10.5px] text-[#122D30]/50">
        {figure.page ? `Page ${figure.page} · ` : ""}
        {figure.role}
      </p>
      <Button
        variant={picked ? "primary" : "secondary"}
        size="sm"
        leadingIcon={picked ? <Check size={14} /> : undefined}
        onClick={onPick}
      >
        {picked ? "Chosen" : "Use this picture"}
      </Button>
    </div>
  );
}
