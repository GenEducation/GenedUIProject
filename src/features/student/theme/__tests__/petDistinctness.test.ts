import { describe, it, expect } from "vitest";
import { palette } from "blobatar";
import { BACKEND_EMOTIONS, PET_EMOTIONS, type PetEmotionSpec } from "../petExpressions";

/**
 * The property the reaction roster exists for: every positive emotion looks
 * unmistakably like itself.
 *
 * Blobatar can only move two capsule eyes, so eyes alone could never carry
 * eight emotions — cheer, supportive and proud all read "narrow eyes" when
 * they differed there only. Each reaction is therefore built from five
 * layers, and any two must disagree on at least three of them. A future edit
 * that quietly makes two reactions twins fails here, not in front of a child.
 */

/** A mid coral body — any real palette would do; tints are compared by effect. */
const REFERENCE = palette(18);

const LAYERS = {
  eyes: (s: PetEmotionSpec) => JSON.stringify(s.face.p),
  mark: (s: PetEmotionSpec) => s.accent ?? "none",
  // What the tint actually does to a body: its output on a reference palette.
  // (Several tints come from one factory, so their source text is identical.)
  tint: (s: PetEmotionSpec) => (s.face.tint ? JSON.stringify(s.face.tint(REFERENCE, s.face.p)) : "none"),
  motion: (s: PetEmotionSpec) => `${s.move ?? ""}|${s.then ?? ""}|${s.loop ?? ""}`,
  particles: (s: PetEmotionSpec) => s.particles?.kind ?? "none",
};

const MIN_DIFFERENT_LAYERS = 3;

describe("reaction distinctness", () => {
  const reactions = [...BACKEND_EMOTIONS];

  for (let i = 0; i < reactions.length; i++) {
    for (let j = i + 1; j < reactions.length; j++) {
      const [a, b] = [reactions[i], reactions[j]];
      it(`${a} and ${b} differ on at least ${MIN_DIFFERENT_LAYERS} layers`, () => {
        const differing = Object.entries(LAYERS)
          .filter(([, layer]) => layer(PET_EMOTIONS[a]) !== layer(PET_EMOTIONS[b]))
          .map(([name]) => name);
        expect(differing.length, `${a} vs ${b} differ only on: ${differing.join(", ") || "nothing"}`)
          .toBeGreaterThanOrEqual(MIN_DIFFERENT_LAYERS);
      });
    }
  }

  it("no two reactions share the same eyes", () => {
    const eyes = reactions.map((e) => LAYERS.eyes(PET_EMOTIONS[e]));
    expect(new Set(eyes).size).toBe(eyes.length);
  });
});

describe("reaction tints keep the pet's own colour", () => {
  // The student's colour is theirs: a tint may change the shade, never the hue.
  const hueOf = (hex: string) => {
    const n = parseInt(hex.slice(1, 7), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d === 0) return 0;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

  for (const emotion of ["cheer", "supportive", "impressed"] as const) {
    it(`${emotion} stays within a few degrees of the body's own hue`, () => {
      for (const hue of [18, 158, 186, 255, 300]) {
        const base = palette(hue);
        const face = PET_EMOTIONS[emotion].face;
        const tinted = face.tint!(base, face.p);
        expect(hueGap(hueOf(tinted.head!), hueOf(base.head!)), `hue ${hue}`).toBeLessThan(15);
      }
    });
  }
});
