import { useCallback, useEffect, useRef } from "react";
import { learnerService } from "./learnerService";
import { asLearnerChapter, subjectName } from "./recentChapters";
import { useLessonLaunch } from "./useLessonLaunch";

/**
 * Keeps the lesson page's chapter (and its cover card) current. A card's image URL is signed to expire at the top of
 * the next hour (backend `cards.py`, `CARD_URL_TTL_S`), but the chapter is kept in sessionStorage across reloads, so a
 * reload can bring back a URL that no longer opens. On load, and again when the image fails, this reads the chapter
 * from `GET /v1/learner/recent-chapters` (which signs its card afresh) and puts it back. A lesson opened from a bare
 * link in a new tab gets its title and card the same way.
 *
 * Returns `refresh`, for the image's `onError`; a failed read keeps what was there.
 */
export function useFreshChapterCard(instanceId: string | null, chapterId: string | null | undefined): () => void {
  const asked = useRef(0);

  const refresh = useCallback(() => {
    // Once on load and once after a failed image is plenty: a second failure means the card itself is gone.
    if (!instanceId || !chapterId || asked.current >= 2) return;
    asked.current += 1;
    learnerService
      .recentChapters(50)
      .then(({ chapters }) => {
        const fresh = chapters.find((c) => c.chapter_id === chapterId);
        if (!fresh) return;
        const launch = useLessonLaunch.getState();
        const same = launch.instanceId === instanceId;
        launch.launch(
          instanceId,
          { ...(same && launch.chapter ? launch.chapter : {}), ...asLearnerChapter(fresh), source_id: (same && launch.chapter?.source_id) || "" },
          (same && launch.subject) || subjectName(fresh.subject),
        );
      })
      .catch(() => undefined);
  }, [instanceId, chapterId]);

  useEffect(() => {
    asked.current = 0;
    refresh();
  }, [refresh]);

  return refresh;
}
