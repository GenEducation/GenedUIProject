"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Loader2, MicOff, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { updateProfile } from "@/features/auth/authService";
import { fetchVoices } from "@/features/student/services/voiceCatalogService";
import type { TutorVoice } from "@/constants/tutorVoices";
import { useStudentStore, type StudentProfile } from "../../store/useStudentStore";

/**
 * The tutor voice: the current one with a preview in the profile row, and the whole catalogue in a dialog where any voice
 * can be heard before it is chosen. Hearing never saves; choosing saves `tutor_voice` (the backend's app voice id, ADR
 * 0036), which the next voice lesson speaks in. No pick, or one the catalogue dropped, shows the catalogue's default: what
 * the backend speaks for such a student too.
 */
export function TutorVoiceControl({ persist }: { persist: (next: StudentProfile, accessToken?: string) => void }) {
  const profile = useStudentStore((s) => s.studentProfile);
  const [voices, setVoices] = useState<TutorVoice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const preview = usePreview();
  const [filter, setFilter] = useState<VoiceFilter>("all");

  useEffect(() => {
    let cancelled = false;
    fetchVoices()
      .then((list) => { if (!cancelled) setVoices(list); })
      .catch((err: unknown) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : "Network error"); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const saved = profile?.tutor_voice;
  const defaultId = voices.find((v) => v.is_default)?.id ?? "";
  const current = saved && voices.some((v) => v.id === saved) ? saved : defaultId;
  const currentVoice = voices.find((v) => v.id === current);

  // Filter chips only when the catalogue actually has more than one kind of voice to tell apart.
  const counts = { female: 0, male: 0 };
  for (const v of voices) {
    const g = genderOf(v);
    if (g) counts[g] += 1;
  }
  const filters: { key: VoiceFilter; label: string; count: number }[] =
    counts.female && counts.male
      ? [
          { key: "all", label: "All", count: voices.length },
          { key: "female", label: "Female", count: counts.female },
          { key: "male", label: "Male", count: counts.male },
        ]
      : [];
  const shown = filter === "all" || !filters.length ? voices : voices.filter((v) => genderOf(v) === filter);

  const choose = async (id: string) => {
    if (!profile || saving || id === current) return;
    setSaving(id);
    setSaveError(null);
    try {
      const res = await updateProfile({ user_id: profile.user_id, tutor_voice: id });
      persist({ ...profile, tutor_voice: res.tutor_voice ?? id }, res.access_token);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save voice. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const close = () => {
    preview.stop();
    setOpen(false);
    setFilter("all");
  };

  return (
    <>
      {/* The current voice as one field, shaped like the other preferences' controls: hear it on the left, open the
          catalogue from the rest. */}
      <div className="flex min-h-[56px] items-center gap-2.5 rounded-xl bg-white py-2 pl-2 pr-1 ring-1 ring-[var(--surface-border)] transition hover:ring-[var(--tutor-soft)]">
        {currentVoice ? (
          <PlayButton voice={currentVoice} preview={preview} />
        ) : (
          <span aria-hidden className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--canvas)] text-[var(--text-muted)]">
            {loaded ? <MicOff size={15} /> : <Loader2 size={15} className="animate-spin" />}
          </span>
        )}
        {/* eslint-disable-next-line no-restricted-syntax -- the field itself opens the voice catalogue, like a select. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!voices.length}
          aria-label="Change voice"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 pl-0.5 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)] disabled:cursor-not-allowed"
        >
          <span className="min-w-0 flex-1" aria-live="polite">
            <span className="block truncate text-[14px] font-bold text-[var(--ink)]">
              {currentVoice ? currentVoice.label : loaded ? (loadError ? "Voices unavailable" : "No voices available") : "Loading voices…"}
            </span>
            {currentVoice && (genderOf(currentVoice) || currentVoice.is_default) && (
              <span className="mt-0.5 flex items-center gap-1 text-[11.5px] capitalize text-[var(--text-mid)]">
                {genderOf(currentVoice)}
                {genderOf(currentVoice) && currentVoice.is_default && <span aria-hidden>·</span>}
                {currentVoice.is_default && <span className="font-semibold text-[var(--primary)]">Default</span>}
              </span>
            )}
          </span>
          {voices.length > 0 && (
            <span className="flex flex-none items-center gap-0.5 text-[12.5px] font-bold text-[var(--primary)]">
              Change <ChevronRight size={15} strokeWidth={2.4} aria-hidden />
            </span>
          )}
        </button>
      </div>
      {loadError && <p className="text-[12px] text-[var(--danger-ink)]">Couldn&apos;t load voices: {loadError}</p>}

      <Modal
        open={open}
        onClose={close}
        size="lg"
        title="Choose your tutor voice"
        titleVisible
        footer={
          <div className="flex items-center justify-between gap-3 border-t border-[var(--surface-border)] px-6 py-4">
            <p className={`text-[12px] ${saveError ? "text-[var(--danger-ink)]" : "text-[var(--text-muted)]"}`} aria-live="polite">
              {saveError ?? (saving ? "Saving…" : "Your tutor uses this voice from your next voice lesson.")}
            </p>
            <Button variant="primary" size="md" onClick={close}>
              Done
            </Button>
          </div>
        }
      >
        <div className="px-5 pb-4 pt-1 sm:px-6">
          <p className="text-[13px] text-[var(--text-mid)]">Tap ▶ to hear a voice, then tap the card to make it yours.</p>
          {filters.length > 1 && (
            <div role="group" aria-label="Show voices" className="mt-3 flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  pill
                  variant={filter === f.key ? "primary" : "outline"}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}{" "}
                  <span className="tabular-nums opacity-60">{f.count}</span>
                </Button>
              ))}
            </div>
          )}

          {/* One full-width row per voice on a phone (two columns there squeeze the name and tags under the play
              button); a grid of three from a small tablet up, where every voice fits on one screen. */}
          <div role="radiogroup" aria-label="Tutor voices" className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
            {shown.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                on={voice.id === current}
                saving={saving === voice.id}
                disabled={saving !== null}
                preview={preview}
                onChoose={() => choose(voice.id)}
              />
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}

function nameOf(voice: TutorVoice) {
  return voice.is_default ? `${voice.label} (Default)` : voice.label;
}

type VoiceFilter = "all" | "female" | "male";

/** The catalogue has no gender field; its descriptions say it ("An AI tutor voice: female."). Unknown stays unfiltered. */
function genderOf(voice: TutorVoice): "female" | "male" | null {
  if (/\bfemale\b/i.test(voice.description)) return "female";
  if (/\bmale\b/i.test(voice.description)) return "male";
  return null;
}

/** The description, unless it only restates the gender the card already tags. */
function extraDescription(voice: TutorVoice): string | null {
  const text = voice.description.trim();
  return /^an ai tutor voice:\s*(fe)?male\.?$/i.test(text) || !text ? null : text;
}

/** Calm, on-brand tints so a grid of voices reads as distinct people rather than a column of identical rows. */
const MONOGRAM_TINTS = [
  { bg: "#DCEBE7", fg: "#075E63" },
  { bg: "#EEF7C8", fg: "#4A5A12" },
  { bg: "#E3EEF8", fg: "#22507A" },
  { bg: "#F6E9DC", fg: "#7A4A1F" },
  { bg: "#EDE6F3", fg: "#5A3E77" },
];

function tintOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return MONOGRAM_TINTS[h % MONOGRAM_TINTS.length];
}

function VoiceCard({
  voice,
  on,
  saving,
  disabled,
  preview,
  onChoose,
}: {
  voice: TutorVoice;
  on: boolean;
  saving: boolean;
  disabled: boolean;
  preview: ReturnType<typeof usePreview>;
  onChoose: () => void;
}) {
  const playing = preview.playing?.id === voice.id && preview.playing.state === "playing";
  const tint = tintOf(voice.id);
  const gender = genderOf(voice);
  const extra = extraDescription(voice);
  return (
    <div
      className={`relative rounded-2xl transition ${
        on
          ? "bg-[var(--soft-surface)] ring-2 ring-[var(--primary)]"
          : "bg-white ring-1 ring-[var(--surface-border)] hover:ring-[var(--tutor-soft)] hover:shadow-[0_8px_20px_-14px_rgb(7_94_99/0.5)]"
      }`}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- a radio inside a radiogroup: the whole card picks the voice. */}
      <button
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={nameOf(voice)}
        onClick={onChoose}
        disabled={disabled}
        className="flex w-full items-center gap-2.5 rounded-2xl p-2.5 pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)] disabled:cursor-wait"
      >
        <span
          aria-hidden
          className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full text-[16px] font-extrabold"
          style={{ background: tint.bg, color: tint.fg }}
        >
          {playing ? <SoundBars /> : voice.label.charAt(0).toUpperCase()}
          {(on || saving) && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-white ring-2 ring-white">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-[var(--ink)]">{voice.label}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1">
            {gender && (
              <span className="rounded-full bg-[var(--canvas)] px-2 py-0.5 text-[10.5px] font-semibold capitalize text-[var(--text-mid)] ring-1 ring-[var(--surface-border)]">
                {gender}
              </span>
            )}
            {voice.is_default && (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--accent-ink)]">Default</span>
            )}
          </span>
          {extra && <span className="mt-1 block text-[11.5px] leading-snug text-[var(--text-mid)]">{extra}</span>}
        </span>
      </button>

      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
        <PlayButton voice={voice} preview={preview} />
      </div>
    </div>
  );
}

/** Three bars bouncing in place of the monogram while that voice's sample plays. */
function SoundBars() {
  return (
    <span className="voice-bars flex h-4 items-end gap-[3px]">
      <span />
      <span />
      <span />
    </span>
  );
}

/** One audio element for every preview: starting a voice stops the one playing. */
function usePreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<{ id: string; state: "loading" | "playing" } | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
  };

  const toggle = (voice: TutorVoice) => {
    if (playing?.id === voice.id) return stop();
    audioRef.current?.pause();
    const audio = new Audio(voice.sample_url);
    audioRef.current = audio;
    setPlaying({ id: voice.id, state: "loading" });
    const settle = () => { if (audioRef.current === audio) setPlaying(null); };
    audio.oncanplay = () => { if (audioRef.current === audio) setPlaying({ id: voice.id, state: "playing" }); };
    audio.onended = settle;
    audio.onerror = settle;
    Promise.resolve(audio.play()).catch(settle);
  };

  return { playing, toggle, stop };
}

function PlayButton({
  voice,
  preview,
}: {
  voice: TutorVoice;
  preview: ReturnType<typeof usePreview>;
}) {
  const state = preview.playing?.id === voice.id ? preview.playing.state : "idle";
  return (
    // eslint-disable-next-line no-restricted-syntax -- round icon-only play control beside a voice.
    <button
      type="button"
      onClick={() => preview.toggle(voice)}
      aria-label={state === "idle" ? `Play a sample of ${voice.label}` : `Stop the sample of ${voice.label}`}
      className={`flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_6px_14px_-8px_rgb(184_214_63/0.9)] transition hover:bg-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]`}
    >
      {state === "loading" ? (
        <Loader2 size={15} className="animate-spin" />
      ) : state === "playing" ? (
        <Pause size={15} fill="currentColor" />
      ) : (
        <Play size={15} fill="currentColor" className="ml-0.5" />
      )}
    </button>
  );
}
