"use client";

import { Mic, Radio, Settings } from "lucide-react";
import { useStudentStore, type StudentProfile } from "../../store/useStudentStore";
import { PttHotkeyConfig } from "../PttHotkeyConfig";
import { CardIcon, ProfileCard } from "./ProfileCard";
import { TutorVoiceControl } from "./TutorVoiceControl";

/** Persist a profile patch to the store and the cached localStorage copy. */
function persistProfile(next: StudentProfile, accessToken?: string) {
  useStudentStore.getState().setStudentProfile(next);
  try {
    const stored = JSON.parse(localStorage.getItem("gened_user_profile") || "{}");
    localStorage.setItem("gened_user_profile", JSON.stringify({ ...stored, ...next }));
    if (accessToken) localStorage.setItem("gened_auth_token", accessToken);
  } catch {
    /* a corrupt cache is healed by the next profile fetch */
  }
}

function Row({
  icon,
  title,
  description,
  control,
  footnote,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  control: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <CardIcon size={44}>{icon}</CardIcon>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[15px] font-extrabold text-[var(--ink)]">{title}</h3>
          <p className="mt-1 text-[13px] leading-snug text-[var(--text-mid)]">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 pl-[60px] sm:w-[240px] sm:flex-none sm:pl-0">
        {control}
        {footnote && <p className="text-[12px] text-[var(--text-muted)]">{footnote}</p>}
      </div>
    </div>
  );
}

/* ─── Voice activation ────────────────────────────────────────────────────── */
function ListenModeToggle() {
  const { voicePrefs, setListenMode } = useStudentStore();
  const modes = [
    { key: "continuous", label: "Continuous" },
    { key: "ptt", label: "Hold to talk" },
  ] as const;
  return (
    <div role="radiogroup" aria-label="Voice activation" className="grid grid-cols-2 rounded-xl bg-[var(--canvas)] p-1 ring-1 ring-[var(--surface-border)]">
      {modes.map((m) => {
        const on = voicePrefs.listenMode === m.key;
        return (
          // eslint-disable-next-line no-restricted-syntax -- segment inside a radiogroup, not a standalone action.
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setListenMode(m.key)}
            className={`rounded-lg px-3 py-2 text-[13px] font-bold transition ${
              on ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-mid)] hover:text-[var(--ink)]"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export function LearningPreferencesCard({ index }: { index: number }) {
  const listenMode = useStudentStore((s) => s.voicePrefs.listenMode);

  return (
    <ProfileCard index={index}>
      <div className="flex items-center gap-4">
        <CardIcon>
          <Settings size={24} strokeWidth={1.9} />
        </CardIcon>
        <h2 className="text-[18px] font-extrabold text-[var(--ink)]">Learning preferences</h2>
      </div>

      <div className="mt-6 divide-y divide-[var(--surface-border)]">
        <Row
          icon={<Mic size={20} strokeWidth={2} />}
          title="Tutor voice"
          description="Choose the voice for your AI tutor. It applies from your next voice lesson."
          control={<TutorVoiceControl persist={persistProfile} />}
        />

        {/* The push-to-talk key lives inside this row, on a line that's always there: switching modes changes
            the line, never the card's height, so the card beside it never stretches to a gap. */}
        <Row
          icon={<Radio size={20} strokeWidth={2} />}
          title="Voice activation"
          description="Talk freely, or press and hold to speak."
          control={
            <>
              <ListenModeToggle />
              <span className="flex h-7 items-center justify-center" aria-live="polite">
                {listenMode === "ptt" ? (
                  <>
                    {/* A key to hold only means something with a keyboard: on a phone (or any small or touch-only
                        screen) push to talk is the lesson's talk button, so that's what this line says instead. */}
                    <span className="hidden sm:pointer-fine:inline-flex">
                      <PttHotkeyConfig inline />
                    </span>
                    <span className="text-[12px] text-[var(--text-muted)] sm:pointer-fine:hidden">
                      Hold the talk button in a lesson to speak.
                    </span>
                  </>
                ) : (
                  <span className="text-[12px] text-[var(--text-muted)]">Your tutor listens whenever you speak.</span>
                )}
              </span>
            </>
          }
        />
      </div>
    </ProfileCard>
  );
}
