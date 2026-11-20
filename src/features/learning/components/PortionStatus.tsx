"use client";

import { useEffect, useState } from "react";
import { useUiText } from "../i18n";
import { fetchPortionAudio } from "../reading/passageAudio";
import { useLessonStore } from "../useLessonStore";

/** Where the learner is in a content-led chapter: the part, parts to come back to, ideas covered and owed. */
export function ChapterPosition() {
  const t = useUiText();
  const progress = useLessonStore((state) => (state.instance?.content_lesson ? state.instance.content_progress : null));
  if (!progress) return null;
  return (
    <p className="min-w-0 truncate text-[12px] font-semibold text-[var(--ls-ink-mid)]" data-testid="chapter-position">
      {t("chapterPosition", { n: progress.unit_position, total: progress.unit_count })}
      {progress.to_revisit > 0 && ` · ${t("toRevisit", { n: progress.to_revisit })}`}
      {progress.ideas_total ? ` · ${t("ideasProgress", { n: progress.ideas_covered ?? 0, total: progress.ideas_total })}` : null}
      {progress.owed_ideas ? ` · ${t("owedIdeas", { n: progress.owed_ideas })}` : null}
    </p>
  );
}

/**
 * Voice: the book's own lines are read aloud by the application before the tutor explains them, and the portion counts as
 * shown only when the audio played to its end. A pause or an unload confirms nothing.
 */
export function PortionAudio() {
  const t = useUiText();
  const instanceId = useLessonStore((state) => state.instanceId);
  const content = useLessonStore((state) => state.instance?.content_lesson ?? null);
  const confirmShown = useLessonStore((state) => state.confirmContentShown);
  const refresh = useLessonStore((state) => state.refreshContent);
  const portion = content?.portion_id;
  const due = !!instanceId && !!portion && content?.channel === "voice" && !content.shown;
  const [audio, setAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    if (!due || !instanceId || !portion) return;
    let active = true;
    let url: string | undefined;
    void fetchPortionAudio(instanceId, portion, "en").then((blob) => {
      if (!active) return;
      url = URL.createObjectURL(blob);
      setAudio(url);
    }).catch(() => { if (active) setAudioError(true); });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
      setAudio(null);
      setAudioError(false);
    };
  }, [due, instanceId, portion]);

  if (audioError) return <p role="status" className="text-[12px] text-[var(--ls-ink-mid)]">{t("bookAudioFailed")}</p>;
  if (!audio || !portion) return null;
  return (
    <audio
      aria-label={t("listenToBook")}
      controls
      autoPlay
      src={audio}
      data-testid="portion-audio"
      className="h-8 max-w-[240px]"
      onEnded={() => void confirmShown(portion, "voice").catch(() => void refresh())}
    />
  );
}
