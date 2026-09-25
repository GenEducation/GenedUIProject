"use client";

/**
 * Dev-only harness for the blobatar avatar layer. Renders the real components
 * against the real generator (no auth, no backend), so the things that decide
 * whether this feature works can be checked against actual pixels:
 *
 *  - **Distinctness** — a wall of fixture seeds under the house hue band. This
 *    is the check that says whether the band in `theme/blobatar.ts` was pinned
 *    too tightly and collapsed everyone into the same creature.
 *  - **Silhouettes** — all ten, proving the thresholds captured from
 *    `blobatar/src/styles/blob.ts` actually select what they claim to.
 *  - **Tones** — all six, including `ink`, which renders pale if the 0.999
 *    wrap is got wrong.
 *  - **Expressions** — the roster this app uses.
 *  - **The desk pet** — mounted directly so dragging can be exercised without
 *    a signed-in session.
 *
 * 404s in production.
 */

import { useState } from "react";
import { Blobatar } from "@blobatar/react";
import { happy, thinking, sleepy, surprised, unsure, idle } from "blobatar/expression";
import { PetCompanion } from "@/features/student/components/PetCompanion";
import { PetFaceAccents } from "@/features/student/components/PetFaceAccents";
import { StudentBlobatar } from "@/features/student/components/StudentBlobatar";
import { PetTunerModal } from "@/features/student/components/PetTunerModal";
import { CompleteProfileBanner } from "@/features/student/components/CompleteProfileBanner";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { usePetStore } from "@/features/student/store/usePetStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useHydrated } from "@/hooks/useHydrated";
import {
  PET_EMOTIONS,
  BACKEND_EMOTIONS,
  type PetEmotion,
} from "@/features/student/theme/petExpressions";
import { resolveMove } from "@/features/student/utils/petLocomotion";
import {
  SILHOUETTES,
  SILHOUETTE_NAMES,
  TONES,
  TONE_NAMES,
  resolveTraits,
} from "@/features/student/theme/blobatar";

const FIXTURE_SEEDS = [
  "stu_aarav_8f21c4", "stu_priya_1b9e02", "stu_rohan_77ac31", "stu_meera_04df9a",
  "stu_kabir_c3128e", "stu_ananya_9012bb", "stu_vihaan_5e6a70", "stu_ishita_ab3312",
  "stu_arjun_66f019", "stu_saanvi_d40c85", "stu_reyansh_23b7ee", "stu_diya_910fa2",
  "stu_aditya_7c5504", "stu_navya_e8813d", "stu_krishna_2af6c1", "stu_myra_b07e44",
  "stu_shaurya_1d9038", "stu_kiara_5520cf", "stu_atharv_e9a163", "stu_anika_38cc7b",
];

const POSES = [
  ["idle", idle], ["happy", happy], ["thinking", thinking],
  ["sleepy", sleepy], ["surprised", surprised], ["unsure", unsure],
] as const;

export default function BlobatarHarness() {
  const setPetEnabled = usePetStore((s) => s.setPetEnabled);
  const hydrated = useHydrated();
  const petEnabled = usePetStore((s) => s.petEnabled) && hydrated;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const setStudentProfile = useStudentStore((s) => s.setStudentProfile);
  const studentProfile = useStudentStore((s) => s.studentProfile);

  if (process.env.NODE_ENV === "production") return null;

  // Dev-only: lets a verification script drive the app-state triggers
  // (streaks, notifications) that the buddy reacts to but this page has no UI
  // for. This whole route is absent in production, per the guard above.
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__stores = {
      student: useStudentStore,
      notifications: useNotificationStore,
      pet: usePetStore,
    };
  }

  return (
    <main style={{ padding: 32, fontFamily: "var(--font-body)", background: "#F7F8FC", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>blobatar harness</h1>
      <p style={{ fontSize: 13, color: "#4A5568", marginBottom: 28 }}>
        Dev-only. Everything below renders through the same code path the student app uses.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
        <button onClick={() => setPetEnabled(!petEnabled)} style={btn}>
          {petEnabled ? "Disable" : "Enable"} desk pet
        </button>
        <button onClick={() => setPickerOpen(true)} style={btn}>Open pet tuner</button>
        <button
          onClick={() => {
            // The banner reads `user_id` for its seed and renders regardless of
            // the rest, so a bare profile is enough to exercise the pose ladder.
            setStudentProfile({
              user_id: "stu_aarav_8f21c4",
              username: "aarav",
              role: "student",
            });
            setOnboardingOpen(true);
          }}
          style={btn}
        >
          Open onboarding
        </button>
      </div>

      <Section
        title="Distinctness — 20 fixture seeds, house hue band"
        note="If these read as one creature repeated, the hue band is pinned too tightly."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {FIXTURE_SEEDS.map((seed) => (
            <div key={seed} style={{ textAlign: "center" }}>
              <Blobatar name={seed} size={56} traits={resolveTraits(null)} />
              <div style={cap}>{seed.split("_")[1]}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Silhouettes — all ten, one seed"
        note="Each must visibly differ. Same seed throughout, so only `shape` is moving."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {SILHOUETTE_NAMES.map((name) => (
            <div key={name} style={{ textAlign: "center" }}>
              <Blobatar
                name="stu_aarav_8f21c4"
                size={56}
                traits={resolveTraits({ shape: SILHOUETTES[name] })}
              />
              <div style={cap}>{name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Tones — all six"
        note="`ink` must be DARK. If it renders pale, the tone-1 wrap regressed."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {TONE_NAMES.map((name) => (
            <div key={name} style={{ textAlign: "center" }}>
              <Blobatar
                name="stu_aarav_8f21c4"
                size={56}
                traits={resolveTraits({ tone: TONES[name] })}
              />
              <div style={cap}>{name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Expressions" note="`thinking` seesaws; the rest are held poses.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {POSES.map(([label, pose]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <Blobatar
                name="stu_aarav_8f21c4"
                size={64}
                animate="always"
                expression={pose}
                traits={resolveTraits(null)}
              />
              <div style={cap}>{label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Pet emotions — face, marks, tint, move, particles"
        note="Every emotion in the roster, on the student's own creature, with its face marks and tint. Motion and particles are listed; play them on the desk pet with the “Fire backend frames” buttons below."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {(Object.keys(PET_EMOTIONS) as PetEmotion[]).map((e) => <EmotionCard key={e} emotion={e} />)}
        </div>
      </Section>

      <Section
        title="Fire backend frames"
        note="Injects a `pet_emotion` frame through the same ingest the chat stream and voice socket use (seq de-dupe and damper included). Enable the desk pet first."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {BACKEND_EMOTIONS.map((e) => (
            <button
              key={e}
              style={btn}
              onClick={() => {
                devSeq += 1;
                usePetStore.getState().ingestPetFrame(
                  { type: "pet_emotion", emotion: e, cause: "dev.harness", seq: devSeq },
                  "dev",
                );
              }}
            >
              {e}
            </button>
          ))}
          <button
            style={btn}
            onClick={() => usePetStore.getState().ingestPetFrame(
              { type: "pet_emotion", emotion: "cheer", cause: "dev.replay", seq: devSeq },
              "dev",
            )}
          >
            replay last seq (should do nothing)
          </button>
        </div>
      </Section>

      <Section
        title="Local sources and presence"
        note="Frontend-derived triggers and browser-detected states."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button style={btn} onClick={() => usePetStore.getState().recordWidgetAnswer({ directiveId: `w${Date.now()}`, isCorrect: true })}>
            widget: right
          </button>
          <button style={btn} onClick={() => usePetStore.getState().recordWidgetAnswer({ directiveId: `w${Date.now()}`, isCorrect: false })}>
            widget: wrong
          </button>
          <button style={btn} onClick={() => usePetStore.getState().fireEmotion("noticing", "dev")}>notification</button>
          <button style={btn} onClick={() => usePetStore.getState().fireEmotion("love", "dev")}>love</button>
          {([
            ["speaking", { voiceSessionStatus: "active", isAITyping: true, isMuted: false, pttHeld: false, connectionQuality: null }],
            ["listening (ptt)", { voiceSessionStatus: "active", isAITyping: false, isMuted: true, pttHeld: true, connectionQuality: null }],
            ["muted", { voiceSessionStatus: "active", isAITyping: false, isMuted: true, pttHeld: false, connectionQuality: null }],
            ["reconnecting", { voiceSessionStatus: "active", isAITyping: false, isMuted: false, pttHeld: false, connectionQuality: "reconnecting" }],
            ["thinking", { voiceSessionStatus: "idle", isAITyping: true, isMuted: false, pttHeld: false, connectionQuality: null }],
            ["clear", { voiceSessionStatus: "idle", isAITyping: false, isMuted: false, pttHeld: false, connectionQuality: null }],
          ] as const).map(([label, state]) => (
            <button key={label} style={btn} onClick={() => useStudentStore.setState(state)}>
              {label}
            </button>
          ))}
          <button style={btn} onClick={() => usePetStore.getState().setPetWander(!usePetStore.getState().petWander)}>
            toggle wander
          </button>
        </div>
      </Section>

      <Section title="Sizes" note="The sizes the app actually renders at.">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          {[28, 32, 34, 48, 64, 76, 112, 120].map((size) => (
            <div key={size} style={{ textAlign: "center" }}>
              <Blobatar name="stu_aarav_8f21c4" size={size} traits={resolveTraits(null)} />
              <div style={cap}>{size}px</div>
            </div>
          ))}
        </div>
      </Section>

      {onboardingOpen && studentProfile && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOnboardingOpen(false); }}>
          <CompleteProfileBanner studentProfile={studentProfile} />
        </div>
      )}

      {/* Mirrors StudentProfile: the size control only appears when there
          is a floating pet to size. */}
      <PetTunerModal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} showPetSettings={petEnabled} />
      <PetCompanion />
    </main>
  );
}

/** Monotonic like the backend's, so the harness exercises the real seq de-dupe. */
let devSeq = 0;

const btn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 10, border: "1px solid #E2E8F0",
  background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const cap: React.CSSProperties = { fontSize: 10, color: "#94A3B8", marginTop: 4 };

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{title}</h2>
      <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 12 }}>{note}</p>
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: 18 }}>
        {children}
      </div>
    </section>
  );
}

/** One roster entry: the creature in that emotion, its face marks drawn inside it. */
function EmotionCard({ emotion }: { emotion: PetEmotion }) {
  const spec = PET_EMOTIONS[emotion];
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <div style={{ textAlign: "center", width: 96 }}>
      <div ref={setHost} style={{ width: 64, height: 64, margin: "0 auto" }}>
        <StudentBlobatar size={64} animate="always" expression={spec.face} />
        {spec.accent && <PetFaceAccents accent={spec.accent} host={host} />}
      </div>
      <div style={cap}>{emotion}</div>
      <div style={{ ...cap, marginTop: 0 }}>
        {spec.move ?? "—"}
        {spec.then && ` → ${spec.then}`}
        {spec.move && ` / ${resolveMove(spec.move, spec.inPlace, true) ?? "none"}`}
        {spec.loop && ` · ${spec.loop}`}
        {spec.particles && ` · ${spec.particles.count}× ${spec.particles.kind}`}
      </div>
    </div>
  );
}
