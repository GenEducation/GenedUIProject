import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LearnerChapter } from "./types";

/**
 * The chapter tile a student just opened, handed to the lesson page so it can
 * show the title and colours without another request. Kept in sessionStorage so
 * a reload in the same tab still knows the chapter; a lesson opened from a bare
 * URL in a new tab falls back to a generic heading.
 */
interface LessonLaunchState {
  instanceId: string | null;
  chapter: LearnerChapter | null;
  subject: string | null;
  launch: (instanceId: string, chapter: LearnerChapter, subject: string) => void;
  /**
   * The lesson the student has just come into from the home page or a chapter list: its "welcome back" choice may be
   * offered once. A reload, a remount or a step change is not a visit, so the choice is not offered again.
   */
  revisitOfferFor: string | null;
  /** Mark a visit to this lesson (the student opened the chapter). */
  offerRevisit: (instanceId: string) => void;
  /** Whether this lesson's visit still has its choice to offer; the offer is spent as it is taken. */
  takeRevisitOffer: (instanceId: string) => boolean;
}

export const useLessonLaunch = create<LessonLaunchState>()(
  persist(
    (set, get) => ({
      instanceId: null,
      chapter: null,
      subject: null,
      launch: (instanceId, chapter, subject) => set({ instanceId, chapter, subject }),
      revisitOfferFor: null,
      offerRevisit: (instanceId) => set({ revisitOfferFor: instanceId }),
      takeRevisitOffer: (instanceId) => {
        if (get().revisitOfferFor !== instanceId) return false;
        set({ revisitOfferFor: null });
        return true;
      },
    }),
    {
      name: "gened_lesson_launch",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ instanceId, chapter, subject, revisitOfferFor }) => ({ instanceId, chapter, subject, revisitOfferFor }),
    },
  ),
);
