import { FIELD_CLASSNAME, FIELD_FOCUS_CLASSNAME } from "@/components/ui/fieldStyles";

/** Text inputs in admin forms — the app's shared field look, with its horizontal padding. */
export const ADMIN_INPUT = `${FIELD_CLASSNAME} ${FIELD_FOCUS_CLASSNAME} px-4 text-ink placeholder:text-muted-light`;

export const ADMIN_LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted";

/** A secondary action drawn as a plain element (for triggers that cannot be a nested <Button>). */
export const SECONDARY_ACTION =
  "inline-flex h-10 items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--btn-neutral-border)] bg-white px-4 text-[13.5px] font-bold text-ink transition-colors hover:bg-[var(--btn-neutral-hover)]";

/** Ink-tinted resting shadow every admin card shares. */
export const CARD_SHADOW = "shadow-[0_1px_2px_rgba(18,45,48,.06),0_1px_3px_rgba(18,45,48,.05)]";
