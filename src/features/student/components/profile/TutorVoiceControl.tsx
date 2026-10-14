"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pause, Play } from "lucide-react";
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
  };

  return (
    <>
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-[var(--ink)]" aria-live="polite">
            {currentVoice ? nameOf(currentVoice) : loaded ? (loadError ? "Voices unavailable" : "No voices available") : "Loading voices…"}
          </p>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setOpen(true)}
            disabled={!voices.length}
            className="-ml-2 mt-0.5"
          >
            Change voice
          </Button>
        </div>
        {currentVoice && <PlayButton voice={currentVoice} preview={preview} large />}
      </div>
      {loadError && <p className="text-[12px] text-[var(--danger-ink)]">Couldn&apos;t load voices: {loadError}</p>}

      <Modal
        open={open}
        onClose={close}
        size="md"
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
        <div role="radiogroup" aria-label="Tutor voices" className="flex flex-col gap-1.5 px-4 py-3">
          {voices.map((voice) => {
            const on = voice.id === current;
            return (
              <div
                key={voice.id}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition ${
                  on ? "bg-[var(--soft-surface)] ring-[var(--primary)]" : "ring-[var(--surface-border)] hover:bg-[var(--canvas)]"
                }`}
              >
                <PlayButton voice={voice} preview={preview} />
                {/* eslint-disable-next-line no-restricted-syntax -- a radio inside a radiogroup, not a standalone action. */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={nameOf(voice)}
                  onClick={() => choose(voice.id)}
                  disabled={saving !== null}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)] rounded-xl"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-[var(--ink)]">{nameOf(voice)}</span>
                    <span className="block text-[12px] leading-snug text-[var(--text-mid)]">{voice.description}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ring-1 ${
                      on ? "bg-[var(--primary)] text-white ring-[var(--primary)]" : "ring-[var(--surface-border)]"
                    }`}
                  >
                    {saving === voice.id ? <Loader2 size={13} className="animate-spin" /> : on ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

function nameOf(voice: TutorVoice) {
  return voice.is_default ? `${voice.label} (Default)` : voice.label;
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
  large = false,
}: {
  voice: TutorVoice;
  preview: ReturnType<typeof usePreview>;
  large?: boolean;
}) {
  const state = preview.playing?.id === voice.id ? preview.playing.state : "idle";
  const size = large ? "h-11 w-11" : "h-9 w-9";
  return (
    // eslint-disable-next-line no-restricted-syntax -- round icon-only play control beside a voice.
    <button
      type="button"
      onClick={() => preview.toggle(voice)}
      aria-label={state === "idle" ? `Play a sample of ${voice.label}` : `Stop the sample of ${voice.label}`}
      className={`flex ${size} flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_6px_14px_-8px_rgb(184_214_63/0.9)] transition hover:bg-[var(--accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]`}
    >
      {state === "loading" ? (
        <Loader2 size={large ? 17 : 15} className="animate-spin" />
      ) : state === "playing" ? (
        <Pause size={large ? 17 : 15} fill="currentColor" />
      ) : (
        <Play size={large ? 17 : 15} fill="currentColor" className="ml-0.5" />
      )}
    </button>
  );
}
