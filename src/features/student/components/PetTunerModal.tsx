"use client";

import React from "react";
import { X, Shuffle, RotateCcw, Pin, PinOff } from "lucide-react";
import { Blobatar } from "@blobatar/react";
import type { TraitOverrides } from "blobatar";
import { Button } from "@/components/ui/Button";
import {
  usePetStore,
  PET_SIZE_MIN,
  PET_SIZE_MAX,
  PET_SIZE_DEFAULT,
} from "@/features/student/store/usePetStore";
import { StudentBlobatar } from "./StudentBlobatar";
import { useBuddySeed } from "@/features/student/hooks/useBuddySeed";
import {
  SILHOUETTES,
  SILHOUETTE_NAMES,
  TONES,
  TONE_NAMES,
  TRAIT_KEYS,
  DECORATION,
  DECORATION_HINTS,
  resolveTraits,
  type SilhouetteName,
  type ToneName,
} from "@/features/student/theme/blobatar";

/**
 * "Make it yours" — the desk buddy's character creator.
 *
 * **Tunes the companion, not the profile picture.** The student's profile
 * avatar is one of two illustrations picked in `AvatarPickerModal`; this tunes
 * the creature that lives on their screen. Keeping them separate is the whole
 * point — a buddy and an identity are different things.
 *
 * Laid out as a two-column editor: the creature and its actions stay put on
 * the left while the trait panel scrolls on the right, so an edit is always
 * visible against the thing it changes. That structure, and the pin model
 * below, follow blobatar.dev's own editor.
 *
 * **The pin model.** Every axis is either *auto* — still coming from the
 * student's `user_id`, which is the default and usually the right answer — or
 * *pinned* to a value they chose. Touching a control pins that axis; the pin
 * button beside it hands the axis back to the seed. Nothing is
 * all-or-nothing, so a student can fix the one thing they care about and
 * leave the rest theirs.
 *
 * Curated, not complete: blobatar exposes roughly twenty axes, and the ones
 * left out — body proportion and squareness, eye roundness, stretch and lean,
 * gaze x/y, tilt, corner rounding, petal distance and rotation, nub angle —
 * are the ones that make a creature subtly wrong rather than differently
 * right. They stay hashed from `user_id`, so they still vary per student. See
 * `theme/blobatar.ts`.
 *
 * Nothing here needs validation. Blobatar runs its full layout on every value,
 * so no combination can put an eye outside the body or geometry outside the
 * frame — an extreme value is scaled to fit rather than rejected. The only
 * thing being exercised is taste.
 */

const C = {
  ink: "#1A202C",
  mid: "#4A5568",
  muted: "#94A3B8",
  faint: "#CBD5E1",
  border: "#E2E8F0",
  accent: "#059F6D",
  surface: "#F7F8FC",
};

interface PetTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Also show the desk pet's own settings.
   *
   * Set when the tuner is opened from the pet itself. Everything else in here
   * describes the *creature*, which is shared by every surface — the sidebar
   * chip, the profile hero, the chat bubbles. How big the desk pet is drawn is
   * a property of that one placement, so it is only offered where it applies.
   */
  showPetSettings?: boolean;
}

export function PetTunerModal({ isOpen, onClose, showPetSettings }: PetTunerModalProps) {
  const petSize = usePetStore((s) => s.petSize);
  const setPetSize = usePetStore((s) => s.setPetSize);
  const petTraits = usePetStore((s) => s.petTraits);
  const setPetTraits = usePetStore((s) => s.setPetTraits);

  const seed = useBuddySeed();

  if (!isOpen) return null;

  const traits: TraitOverrides = petTraits ?? {};
  const pinnedCount = Object.keys(traits).length;

  /** Write one axis. Live — there is no Apply step. */
  const setTrait = (key: string, value: number | null) => {
    const next = { ...traits };
    if (value === null) delete next[key];
    else next[key] = value;
    setPetTraits(Object.keys(next).length ? next : null);
  };

  const readTrait = (key: string): number | null => {
    const v = traits[key];
    return typeof v === "number" ? v : null;
  };

  const pinnedShape: SilhouetteName | null = (() => {
    const v = readTrait(TRAIT_KEYS.shape);
    if (v === null) return null;
    return SILHOUETTE_NAMES.find((n) => Math.abs(SILHOUETTES[n] - v) < 1e-6) ?? null;
  })();

  const pinnedTone: ToneName | null = (() => {
    const v = readTrait("tone");
    if (v === null) return null;
    return TONE_NAMES.find((n) => Math.abs(TONES[n] - v) < 1e-6) ?? null;
  })();

  const decoration = pinnedShape ? DECORATION[pinnedShape] : undefined;

  const surprise = () => {
    const shape = SILHOUETTE_NAMES[Math.floor(Math.random() * SILHOUETTE_NAMES.length)]!;
    const tone = TONE_NAMES[Math.floor(Math.random() * TONE_NAMES.length)]!;
    setPetTraits({
      [TRAIT_KEYS.shape]: SILHOUETTES[shape],
      tone: TONES[tone],
      hue: Math.random(),
      [TRAIT_KEYS.eyeSize]: Math.random(),
      [TRAIT_KEYS.eyeGap]: Math.random(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Customize your buddy"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="blobatar-editor"
        style={{
          background: "#fff", borderRadius: 24, width: "100%", maxWidth: 860,
          maxHeight: "min(88vh, 720px)", boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          position: "relative", overflow: "hidden", display: "flex",
        }}
      >
        <Button
          variant="tertiary"
          size="sm"
          iconOnly
          aria-label="Close"
          onClick={onClose}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 3, color: C.muted }}
        >
          <X size={20} />
        </Button>

        {/* ── Left: the creature, held still while the panel scrolls ── */}
        <div
          className="blobatar-editor__stage"
          style={{
            width: 300, flexShrink: 0, borderRight: `1px solid ${C.border}`,
            padding: "36px 24px 20px", display: "flex", flexDirection: "column",
            alignItems: "center", textAlign: "center", background: C.surface,
          }}
        >
          <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
            <StudentBlobatar size={150} animate="always" />
          </div>

          <h2 style={{
            fontSize: 20, fontWeight: 800, color: C.ink, margin: "16px 0 4px",
            fontFamily: "var(--font-display)",
          }}>
            Make it yours
          </h2>
          <p style={{ fontSize: 12, color: C.mid, margin: "0 0 16px", lineHeight: 1.5 }}>
            {pinnedCount === 0
              ? "Nothing is pinned, so this buddy is entirely you."
              : `${pinnedCount} ${pinnedCount === 1 ? "thing" : "things"} pinned. The rest is still you.`}
          </p>

          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={surprise}
              leadingIcon={<Shuffle size={14} />}
              style={{ flex: 1 }}
            >
              Surprise me
            </Button>
            <Button variant="primary" size="sm" onClick={onClose} style={{ flex: 1 }}>
              Done
            </Button>
          </div>
        </div>

        {/* ── Right: the trait panel ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 56px 14px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: pinnedCount ? C.ink : C.muted }}>
              {pinnedCount === 0 ? "nothing pinned" : `${pinnedCount} pinned`}
            </span>
            {/* eslint-disable-next-line no-restricted-syntax -- low-emphasis inline reset in a panel header; <Button>'s min-height would push the header out of line with the stage column beside it. */}
            <button
              onClick={() => setPetTraits(null)}
              disabled={pinnedCount === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
                padding: 0, fontSize: 11, fontWeight: 700,
                color: pinnedCount ? C.accent : C.faint,
                cursor: pinnedCount ? "pointer" : "default",
              }}
            >
              <RotateCcw size={12} /> unpin all
            </button>
          </div>

          <div style={{ overflowY: "auto", flex: 1, padding: "18px 24px 24px" }}>
            <Section title="shape">
              <TileGrid>
                <Tile
                  selected={pinnedShape === null}
                  label="auto"
                  onClick={() => setTrait(TRAIT_KEYS.shape, null)}
                >
                  <Shuffle size={18} color={C.muted} />
                </Tile>
                {SILHOUETTE_NAMES.map((name) => (
                  <Tile
                    key={name}
                    selected={pinnedShape === name}
                    label={name}
                    onClick={() => setTrait(TRAIT_KEYS.shape, SILHOUETTES[name])}
                  >
                    {/* The student's OWN creature in that silhouette — their
                        colour and eyes, this shape — so the tile shows what
                        picking it actually does. */}
                    <Blobatar
                      name={seed}
                      size={30}
                      traits={resolveTraits({ ...traits, [TRAIT_KEYS.shape]: SILHOUETTES[name] })}
                    />
                  </Tile>
                ))}
              </TileGrid>
            </Section>

            <Section title="colour">
              <TileGrid>
                <Tile selected={pinnedTone === null} label="auto" onClick={() => setTrait("tone", null)}>
                  <Shuffle size={18} color={C.muted} />
                </Tile>
                {TONE_NAMES.map((name) => (
                  <Tile
                    key={name}
                    selected={pinnedTone === name}
                    label={name}
                    onClick={() => setTrait("tone", TONES[name])}
                  >
                    <Blobatar
                      name={seed}
                      size={30}
                      traits={resolveTraits({ ...traits, tone: TONES[name] })}
                    />
                  </Tile>
                ))}
              </TileGrid>
              <Slider
                label="hue"
                spectrum
                value={readTrait("hue")}
                onChange={(v) => setTrait("hue", v)}
                onUnpin={() => setTrait("hue", null)}
              />
            </Section>

            <Section title="eyes">
              <Slider
                label="eye size"
                value={readTrait(TRAIT_KEYS.eyeSize)}
                onChange={(v) => setTrait(TRAIT_KEYS.eyeSize, v)}
                onUnpin={() => setTrait(TRAIT_KEYS.eyeSize, null)}
              />
              <Slider
                label="eye spacing"
                value={readTrait(TRAIT_KEYS.eyeGap)}
                onChange={(v) => setTrait(TRAIT_KEYS.eyeGap, v)}
                onUnpin={() => setTrait(TRAIT_KEYS.eyeGap, null)}
              />
            </Section>

            {showPetSettings && (
              <Section title="desk buddy">
                <PixelSlider
                  label="size on screen"
                  value={petSize}
                  min={PET_SIZE_MIN}
                  max={PET_SIZE_MAX}
                  onChange={setPetSize}
                  onReset={() => setPetSize(PET_SIZE_DEFAULT)}
                />
              </Section>
            )}

            <Section title="decoration">
              {decoration?.keys.map(({ key, label }) => (
                <Slider
                  key={key}
                  label={label}
                  value={readTrait(key)}
                  onChange={(v) => setTrait(key, v)}
                  onUnpin={() => setTrait(key, null)}
                />
              ))}
              {/* Says why an axis is absent instead of silently omitting it —
                  otherwise picking `sun` appears to grow controls out of
                  nowhere, and a student who wants petals has no way to learn
                  that petals belong to a shape. */}
              {DECORATION_HINTS.filter((h) => h.label !== decoration?.label).map((h) => (
                <p key={h.label} style={{ fontSize: 11, color: C.faint, margin: "0 0 6px" }}>
                  {h.hint}
                </p>
              ))}
            </Section>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .blobatar-editor { flex-direction: column; max-height: 90vh; }
          .blobatar-editor__stage {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid ${C.border};
            padding: 24px 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.mid, marginBottom: 10,
        paddingBottom: 6, borderBottom: `1px solid ${C.border}`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
      gap: 8, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Tile({
  selected, label, onClick, children,
}: {
  selected: boolean; label: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    // A selection swatch rather than a button: its whole surface is a live
    // blobatar preview and its selected state is `aria-pressed` plus a ring,
    // both of which <Button>'s variants would fight.
    // eslint-disable-next-line no-restricted-syntax -- selection swatch, see above
    <button
      onClick={onClick}
      aria-pressed={selected}
      title={label}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "8px 2px 6px", borderRadius: 10, cursor: "pointer",
        background: selected ? `${C.accent}0F` : "transparent",
        border: `1.5px solid ${selected ? C.accent : C.border}`,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 30 }}>
        {children}
      </span>
      <span style={{ fontSize: 9, fontWeight: 600, color: selected ? C.ink : C.muted }}>
        {label}
      </span>
    </button>
  );
}

/**
 * A plain pixel measurement, unlike `Slider` below.
 *
 * The desk pet's size is not a blobatar trait and has no "auto" — there is
 * always a number — so it carries a reset to the default rather than a pin.
 */
function PixelSlider({
  label, value, min, max, onChange, onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{label}</span>
        <span style={{ fontSize: 11, color: C.mid, fontVariantNumeric: "tabular-nums" }}>{value}px</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={2}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          style={{ flex: 1, minWidth: 0, cursor: "pointer", accentColor: C.accent }}
        />
        {/* eslint-disable-next-line no-restricted-syntax -- a 22px inline reset inside a slider row; <Button>'s padding and min-height would break the row's alignment. */}
        <button
          onClick={onReset}
          disabled={value === PET_SIZE_DEFAULT}
          aria-label="Reset size"
          title="Back to the default size"
          style={{
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, padding: 0, borderRadius: 6, border: "none",
            background: "none",
            color: value === PET_SIZE_DEFAULT ? C.faint : C.accent,
            cursor: value === PET_SIZE_DEFAULT ? "default" : "pointer",
          }}
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}

/**
 * One axis. `null` means unpinned — still coming from the seed — which is why
 * the row carries a pin toggle rather than a sentinel value inside the range.
 * Moving the control pins the axis; the pin button hands it back.
 */
function Slider({
  label, value, onChange, onUnpin, spectrum,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  onUnpin: () => void;
  spectrum?: boolean;
}) {
  const pinned = value !== null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: pinned ? C.ink : C.mid }}>{label}</span>
        <span style={{ fontSize: 11, color: pinned ? C.mid : C.faint, fontVariantNumeric: "tabular-nums" }}>
          {pinned ? value.toFixed(3) : "auto"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          min={0}
          max={0.999}
          step={0.001}
          value={value ?? 0.5}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          style={{
            flex: 1, minWidth: 0, cursor: "pointer",
            accentColor: C.accent,
            opacity: pinned ? 1 : 0.4,
            ...(spectrum
              ? {
                  height: 18, WebkitAppearance: "none", appearance: "none", borderRadius: 9,
                  background:
                    "linear-gradient(to right, hsl(0,70%,55%), hsl(60,70%,55%), hsl(120,70%,55%), " +
                    "hsl(180,70%,55%), hsl(240,70%,55%), hsl(300,70%,55%), hsl(360,70%,55%))",
                }
              : {}),
          }}
        />
        {/* eslint-disable-next-line no-restricted-syntax -- a 22px inline pin toggle inside a slider row; <Button>'s padding and min-height would break the row's alignment. */}
        <button
          onClick={onUnpin}
          disabled={!pinned}
          aria-label={pinned ? `Unpin ${label}` : `${label} is automatic`}
          title={pinned ? "Back to automatic" : "Automatic — set by your name"}
          style={{
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, padding: 0, borderRadius: 6, border: "none",
            background: "none", color: pinned ? C.accent : C.faint,
            cursor: pinned ? "pointer" : "default",
          }}
        >
          {pinned ? <Pin size={13} /> : <PinOff size={13} />}
        </button>
      </div>
    </div>
  );
}
