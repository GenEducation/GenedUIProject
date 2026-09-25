import { create } from "zustand";
import type { TraitOverrides } from "blobatar";
import type { PetEmotion } from "../theme/petExpressions";
import {
  EMPTY_TALLY,
  LOCAL_SOURCES,
  acceptSeq,
  fromWidgetResult,
  parsePetFrame,
  passDamper,
  type DamperState,
  type WidgetTally,
} from "../utils/petEvents";

/**
 * The desk pet's own state: whether it is loose on screen, and where.
 *
 * A small dedicated store rather than more fields on `useStudentStore`, which
 * is already past 3000 lines and is about session/chat/profile data. This is
 * UI chrome, so it follows `useSidebarStore`'s precedent instead.
 *
 * Client-only, like the rest of the avatar layer. Position in particular is
 * inherently per-device — a corner that works on a 27" monitor is not the same
 * corner on a laptop — so there is little to gain from syncing it.
 */

export interface PetPosition {
  x: number;
  y: number;
}

const ENABLED_KEY = "gened_pet_enabled";
const POSITION_KEY = "gened_pet_position";
const SIZE_KEY = "gened_pet_size";
const TRAITS_KEY = "gened_pet_traits";
const SEED_KEY = "gened_pet_seed";
const WANDER_KEY = "gened_pet_wander";
const LAST_STREAK_KEY = "gened_pet_last_streak";

/** Distance kept from every viewport edge, in px. */
export const PET_MARGIN = 16;

/**
 * How big the creature is drawn on screen, in px.
 *
 * This is a property of the *pet*, not of the creature — the same student
 * renders at 34px in a sidebar chip and 112px on their profile hero, so size
 * cannot live in `avatarTraits` alongside shape and colour. It belongs here,
 * next to position, for the same reason position does.
 *
 * Blobatar's own `body` traits are a different thing again: they change how
 * much of the fixed 100-unit viewBox the blob fills, so maxing one out makes a
 * fatter creature inside the same box, never a bigger element.
 */
export const PET_SIZE_DEFAULT = 76;
export const PET_SIZE_MIN = 48;
export const PET_SIZE_MAX = 160;

const getInitialEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ENABLED_KEY) === "true";
  } catch {
    return false;
  }
};

/**
 * The buddy's own appearance, as blobatar trait overrides keyed exactly as its
 * layout reads them (see `theme/blobatar.ts`). `null` means untouched — the
 * creature is then derived purely from `user_id` under the house hue band.
 *
 * Lives here rather than on the student profile on purpose. A companion and a
 * profile picture are different things: `useStudentStore.avatarId` is who the
 * student *is*, and this is what their buddy *looks like*.
 */
/**
 * The seed this student's buddy was born from, frozen when they saved their
 * name during onboarding.
 *
 * Stored rather than recomputed so that editing your profile name later does
 * not hand you a different creature. `null` means "not yet frozen" — the seed
 * is then derived live from the current profile, which is what makes the
 * onboarding reveal work and what existing students fall back to.
 */
const getInitialSeed = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SEED_KEY);
  } catch {
    return null;
  }
};

const getInitialTraits = (): TraitOverrides | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TRAITS_KEY);
    return raw ? (JSON.parse(raw) as TraitOverrides) : null;
  } catch {
    // A hand-edited or truncated value must not take the store down on boot.
    return null;
  }
};

const getInitialSize = (): number => {
  if (typeof window === "undefined") return PET_SIZE_DEFAULT;
  try {
    const n = Number(localStorage.getItem(SIZE_KEY));
    // Clamped rather than trusted: a hand-edited value must not render a pet
    // at 4000px or at NaN, which positions it nowhere.
    if (!Number.isFinite(n) || n <= 0) return PET_SIZE_DEFAULT;
    return Math.min(Math.max(n, PET_SIZE_MIN), PET_SIZE_MAX);
  } catch {
    return PET_SIZE_DEFAULT;
  }
};

/** Off unless the student turns it on: a pet that roams is not for everyone. */
const getInitialWander = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(WANDER_KEY) === "true";
  } catch {
    return false;
  }
};

/**
 * The day streak as of the last visit, so a streak gained or lost *between*
 * visits can be noticed. Without it the first observation in a session has
 * nothing to compare against and must be ignored.
 */
const getInitialLastSeenStreak = (): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_STREAK_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
};

const getInitialPosition = (): PetPosition | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PetPosition;
    // A hand-edited or half-written value must not render the pet at NaN,
    // which positions it nowhere and makes it look like the feature is broken.
    if (!Number.isFinite(parsed?.x) || !Number.isFinite(parsed?.y)) return null;
    return parsed;
  } catch {
    return null;
  }
};

/**
 * One requested reaction. `id` increments on every fire, so the same emotion
 * twice in a row is still two events to whoever is watching.
 */
export interface PetBurst {
  emotion: PetEmotion;
  id: number;
  /** `backend:<cause>` or `local:<source>` — for logs and the dev harness. */
  source: string;
}

let burstSeq = 0;

interface PetState {
  petEnabled: boolean;
  /** `null` until the student has moved it — the default corner is computed. */
  petPosition: PetPosition | null;
  petSize: number;
  petTraits: TraitOverrides | null;
  petSeed: string | null;
  setPetEnabled: (enabled: boolean) => void;
  setPetPosition: (position: PetPosition) => void;
  setPetSize: (size: number) => void;
  setPetTraits: (traits: TraitOverrides | null) => void;
  setPetSeed: (seed: string | null) => void;
  resetPetPosition: () => void;

  /** Roams around its home spot while idle. */
  petWander: boolean;
  setPetWander: (wander: boolean) => void;

  petLastSeenStreak: number | null;
  setPetLastSeenStreak: (streak: number) => void;

  /** The latest requested reaction; `usePetExpression` decides whether it shows. */
  petBurst: PetBurst | null;
  /** Request a reaction. Returns `false` when the damper swallowed it. */
  fireEmotion: (emotion: PetEmotion, source?: string) => boolean;
  /**
   * Feed one event from the chat stream or voice socket. Anything that is not
   * a pet frame is ignored, so callers can hand over every event unfiltered.
   */
  ingestPetFrame: (event: unknown, sessionKey: string) => void;
  /** A graded math or comprehension widget answer (a local source). */
  recordWidgetAnswer: (result: { directiveId: string; isCorrect: boolean; attempts?: number }) => void;

  /** Internal bookkeeping for the functions above. */
  lastSeqBySession: Record<string, number>;
  damper: DamperState;
  widgetTally: WidgetTally;
}

export const usePetStore = create<PetState>((set, get) => ({
  petEnabled: getInitialEnabled(),
  petPosition: getInitialPosition(),
  petSize: getInitialSize(),
  petTraits: getInitialTraits(),
  petSeed: getInitialSeed(),

  setPetEnabled: (enabled) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ENABLED_KEY, String(enabled));
      } catch {
        // Private mode / blocked storage: the toggle still works this session.
      }
    }
    set({ petEnabled: enabled });
  },

  setPetPosition: (position) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(position));
      } catch {
        /* see above */
      }
    }
    set({ petPosition: position });
  },

  setPetSize: (size) => {
    const clamped = Math.min(Math.max(Math.round(size), PET_SIZE_MIN), PET_SIZE_MAX);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SIZE_KEY, String(clamped));
      } catch {
        /* see above */
      }
    }
    set({ petSize: clamped });
  },

  setPetTraits: (traits) => {
    if (typeof window !== "undefined") {
      try {
        if (traits) localStorage.setItem(TRAITS_KEY, JSON.stringify(traits));
        else localStorage.removeItem(TRAITS_KEY);
      } catch {
        /* see above */
      }
    }
    set({ petTraits: traits });
  },

  setPetSeed: (seed) => {
    if (typeof window !== "undefined") {
      try {
        if (seed) localStorage.setItem(SEED_KEY, seed);
        else localStorage.removeItem(SEED_KEY);
      } catch {
        /* see above */
      }
    }
    set({ petSeed: seed });
  },

  resetPetPosition: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(POSITION_KEY);
      } catch {
        /* see above */
      }
    }
    set({ petPosition: null });
  },

  petWander: getInitialWander(),
  setPetWander: (wander) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(WANDER_KEY, String(wander));
      } catch {
        /* see above */
      }
    }
    set({ petWander: wander });
  },

  petLastSeenStreak: getInitialLastSeenStreak(),
  setPetLastSeenStreak: (streak) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LAST_STREAK_KEY, String(streak));
      } catch {
        /* see above */
      }
    }
    set({ petLastSeenStreak: streak });
  },

  petBurst: null,
  lastSeqBySession: {},
  damper: {},
  widgetTally: EMPTY_TALLY,

  fireEmotion: (emotion, source = "local") => {
    const r = passDamper(get().damper, emotion, Date.now());
    if (!r.pass) return false;
    burstSeq += 1;
    set({ damper: r.lastAt, petBurst: { emotion, id: burstSeq, source } });
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[pet] ${emotion} ← ${source}`);
    }
    return true;
  },

  ingestPetFrame: (event, sessionKey) => {
    const frame = parsePetFrame(event);
    if (!frame) return;
    const seq = acceptSeq(get().lastSeqBySession, sessionKey, frame.seq);
    if (!seq.accept) return;
    set({ lastSeqBySession: seq.lastSeqBySession });
    // `answer_graded` only advances the sequence: the pet shows exactly the
    // emotions the backend sends, and derives nothing from a running score.
    if (frame.type === "pet_emotion") {
      get().fireEmotion(frame.emotion, `backend:${frame.cause}`);
    }
  },

  recordWidgetAnswer: (result) => {
    if (!LOCAL_SOURCES.interactive) return;
    const r = fromWidgetResult(get().widgetTally, result);
    set({ widgetTally: r.tally });
    get().fireEmotion(r.emotion, "local:interactive");
  },
}));
