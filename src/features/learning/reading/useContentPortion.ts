"use client";

import { useEffect } from "react";
import { lessonService } from "../lessonService";
import { useLessonStore } from "../useLessonStore";

/**
 * The part of the book the server assigned (backend CL 3.4), with no screen of its own. The server owns the order: this asks
 * for the next portion only when none is assigned and hands its printed lines to the store (`contentSource`), where the book
 * panel shows them and confirms them in chat, and `PortionAudio` reads them aloud in voice. Nothing here decides what is
 * taught, ready or complete.
 */
export function useContentPortion(instanceId: string) {
  const voiceSessionId = useLessonStore((state) => state.voiceSessionId);
  const instance = useLessonStore((state) => state.instance);
  const refresh = useLessonStore((state) => state.refreshContent);
  const openContentLesson = useLessonStore((state) => state.openContentLesson);
  const setContentSource = useLessonStore((state) => state.setContentSource);
  const content = instance?.id === instanceId ? instance.content_lesson : null;
  const revision = instance?.revision;
  const portion = content?.portion_id;
  const phase = content?.phase;

  // Read the assignment; ask for the next portion only when none is assigned. A refused request re-reads the state.
  useEffect(() => {
    if (phase !== "teaching" || revision === undefined) return;
    let active = true;
    const load = async () => {
      const assignment = await lessonService.contentAssignment(instanceId, portion ? undefined : {
        request_id: crypto.randomUUID(), expected_revision: revision, channel: voiceSessionId ? "voice" : "chat",
      });
      if (!active) return;
      if (assignment.lesson.portion_id) setContentSource({ portionId: assignment.lesson.portion_id, lines: assignment.source });
      if (assignment.revision !== revision) await refresh();
      if (assignment.lesson.portion_id) openContentLesson();
    };
    void load().catch(() => { if (active) void refresh(); });
    return () => { active = false; };
  }, [instanceId, phase, portion, revision, refresh, voiceSessionId, openContentLesson, setContentSource]);

  // The book marks only the portion being taught now.
  useEffect(() => {
    if (phase !== "teaching" || !portion) setContentSource(null);
  }, [phase, portion, setContentSource]);
}

/**
 * The portion still waiting for its chat confirmation: assigned, its printed lines read, taught in chat and not yet shown.
 * The book panel confirms it once every line is on screen; until then the Book button asks to be opened.
 */
export function usePortionToConfirm(): { portionId: string; lines: string[] } | null {
  const content = useLessonStore((state) => state.instance?.content_lesson ?? null);
  const source = useLessonStore((state) => state.contentSource);
  if (!content || !source || content.phase !== "teaching" || content.shown || content.channel !== "chat") return null;
  return content.portion_id === source.portionId ? source : null;
}
