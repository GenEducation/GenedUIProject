"use client";

import { useEffect, useRef, useState } from "react";
import { useUiText } from "../i18n";
import { fetchPortionAudio } from "../reading/passageAudio";
import { lessonService } from "../lessonService";
import { useLessonStore } from "../useLessonStore";

/** Whether `el` shows exactly these lines of the book, in order (what the learner can actually see, not what was fetched). */
export function rendersExactly(el: HTMLElement | null, portionId: string, lines: string[]): boolean {
  if (!el || el.dataset.portionId !== portionId) return false;
  const shown = Array.from(el.querySelectorAll<HTMLElement>("[data-source-line]")).map((p) => p.textContent ?? "");
  return shown.length === lines.length && shown.every((text, i) => text === lines[i]);
}

/**
 * The part of the book the server assigned (backend CL 3.4). The server owns the order: this asks for the next portion only when
 * none is assigned, shows it exactly as printed, and confirms it was shown only after the exact lines are on screen (chat) or its
 * audio played to the end (voice). Nothing here decides what is taught, ready or complete.
 */
export function ContentPortion({ instanceId }: { instanceId: string }) {
  const t = useUiText();
  const voiceSessionId = useLessonStore((state) => state.voiceSessionId);
  const instance = useLessonStore((state) => state.instance);
  const refresh = useLessonStore((state) => state.refreshContent);
  const openContentLesson = useLessonStore((state) => state.openContentLesson);
  const setContentSource = useLessonStore((state) => state.setContentSource);
  const confirmShown = useLessonStore((state) => state.confirmContentShown);
  const content = instance?.id === instanceId ? instance.content_lesson : null;
  const progress = instance?.id === instanceId ? instance.content_progress : null;
  const revision = instance?.revision;
  const portion = content?.portion_id;
  const phase = content?.phase;
  const [audio, setAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [page, setPage] = useState<{ id: string; source: string[] } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Read the assignment; ask for the next portion only when none is assigned. A refused request re-reads the state.
  useEffect(() => {
    if (phase !== "teaching" || revision === undefined) return;
    let active = true;
    const load = async () => {
      const assignment = await lessonService.contentAssignment(instanceId, portion ? undefined : {
        request_id: crypto.randomUUID(), expected_revision: revision, channel: voiceSessionId ? "voice" : "chat",
      });
      if (!active) return;
      if (assignment.lesson.portion_id) {
        setPage({ id: assignment.lesson.portion_id, source: assignment.source });
        setContentSource({ portionId: assignment.lesson.portion_id, lines: assignment.source });
      }
      if (assignment.revision !== revision) await refresh();
      if (assignment.lesson.portion_id) openContentLesson();
    };
    void load().catch(() => { if (active) void refresh(); });
    return () => { active = false; };
  }, [instanceId, phase, portion, revision, refresh, voiceSessionId, openContentLesson, setContentSource]);

  // The book panel marks only the portion being taught now.
  useEffect(() => {
    if (phase !== "teaching" || !portion) setContentSource(null);
  }, [phase, portion, setContentSource]);

  // Chat: confirm only once the exact assigned lines are painted and the tab is visible.
  useEffect(() => {
    if (!page || page.id !== portion || content?.shown || content?.channel !== "chat" || revision === undefined) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (document.visibilityState !== "visible" || !rendersExactly(panel.current, page.id, page.source)) return;
        void confirmShown(page.id, "chat").catch(() => void refresh());
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [page, portion, revision, content?.shown, content?.channel, refresh, confirmShown]);

  // Voice: the book's own lines are read aloud by the application before the tutor explains them.
  useEffect(() => {
    if (!portion || content?.channel !== "voice" || content.shown) return;
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
  }, [instanceId, portion, content?.channel, content?.shown]);

  if (!content) return null;
  const position = progress ? t("chapterPosition", { n: progress.unit_position, total: progress.unit_count }) : null;
  return (
    <section aria-label={t("fromYourBook")} className="mx-4 mb-2 max-h-56 overflow-auto rounded border p-3" data-testid="content-portion">
      {position && (
        <p className="text-[13px] font-semibold" data-testid="chapter-position">
          {position}
          {progress && progress.to_revisit > 0 && ` · ${t("toRevisit", { n: progress.to_revisit })}`}
          {progress?.ideas_total ? ` · ${t("ideasProgress", { n: progress.ideas_covered ?? 0, total: progress.ideas_total })}` : null}
          {progress?.owed_ideas ? ` · ${t("owedIdeas", { n: progress.owed_ideas })}` : null}
        </p>
      )}
      {audioError && <p role="status">{t("bookAudioFailed")}</p>}
      {audio && portion && revision !== undefined && (
        <audio
          aria-label={t("listenToBook")}
          controls
          autoPlay
          src={audio}
          data-testid="portion-audio"
          // `ended` fires only when the audio reached its end; a pause or an unload confirms nothing.
          onEnded={() => void confirmShown(portion, "voice").catch(() => void refresh())}
        />
      )}
      {phase === "teaching" && page && page.id === portion && (
        <div
          ref={panel}
          aria-current="true"
          data-portion-id={page.id}
          data-testid="current-portion"
          className="mt-2 whitespace-pre-wrap border-l-4 border-[var(--ls-ink,#333)] bg-[var(--ls-sage)] p-2"
        >
          {page.source.map((line, index) => <p key={index} data-source-line>{line}</p>)}
        </div>
      )}
    </section>
  );
}
