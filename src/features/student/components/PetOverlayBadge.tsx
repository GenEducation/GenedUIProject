"use client";

import React from "react";
import {
  Bell,
  Ear,
  Ellipsis,
  Heart,
  MicOff,
  PartyPopper,
  Volume2,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { PetOverlay } from "../theme/petExpressions";

/**
 * The small badge that says what state the pet is in — a mic for a muted
 * session, an ear while listening. The positive reactions (Cheer, Proud…)
 * carry no badge: their face marks and particles say it instead. Decorative: the pet's whole overlay is
 * `aria-hidden`, and every state it reflects is announced by real UI elsewhere.
 */

const ICONS: Record<Exclude<PetOverlay, "zzz">, { Icon: LucideIcon; color: string }> = {
  ear: { Icon: Ear, color: "#059F6D" },
  speaker: { Icon: Volume2, color: "#059F6D" },
  micOff: { Icon: MicOff, color: "#E8635A" },
  wifiOff: { Icon: WifiOff, color: "#94A3B8" },
  dots: { Icon: Ellipsis, color: "#4A5568" },
  bell: { Icon: Bell, color: "#D97706" },
  heart: { Icon: Heart, color: "#E0527E" },
  confetti: { Icon: PartyPopper, color: "#E0527E" },
};

export function PetOverlayBadge({ overlay, size }: { overlay: PetOverlay; size: number }) {
  const d = Math.round(Math.max(20, Math.min(30, size * 0.3)));
  const base: React.CSSProperties = {
    position: "absolute",
    top: -d * 0.25,
    right: -d * 0.25,
    width: d,
    height: d,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    pointerEvents: "none",
  };

  if (overlay === "zzz") {
    return (
      <span
        className="pet-badge-zzz"
        style={{ ...base, background: "none", boxShadow: "none", fontWeight: 800, fontSize: d * 0.6, color: "#64748B" }}
      >
        z
      </span>
    );
  }

  const { Icon, color } = ICONS[overlay];
  return (
    // Keyed on the overlay so switching badges replays the pop-in.
    <span key={overlay} className={overlay === "dots" ? "pet-badge pet-badge-blink" : "pet-badge"} style={base}>
      <Icon size={Math.round(d * 0.55)} color={color} strokeWidth={2.5} />
    </span>
  );
}

/**
 * Debug stand-in for the icon badge: the name of the emotion the pet is
 * showing, so what it is doing can be read at a glance. Shown for every
 * emotion (including `idle`, which has no icon), plus `· pat` while a pat
 * reaction is overriding the face.
 */
export function PetEmotionLabel({ emotion, reacting, size }: { emotion: string; reacting: boolean; size: number }) {
  return (
    <span
      key={emotion}
      className="pet-badge"
      style={{
        position: "absolute",
        // Below the pet, not above: the "?" and the particles live up there.
        top: "100%",
        left: "50%",
        translate: "-50% 4px",
        padding: "2px 8px",
        borderRadius: 999,
        background: "rgba(15, 23, 42, 0.86)",
        color: "#fff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: Math.max(10, Math.round(size * 0.12)),
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        pointerEvents: "none",
      }}
    >
      {emotion}
      {reacting ? " · pat" : ""}
    </span>
  );
}
