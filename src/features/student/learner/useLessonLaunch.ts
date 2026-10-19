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
}

export const useLessonLaunch = create<LessonLaunchState>()(
  persist(
    (set) => ({
      instanceId: null,
      chapter: null,
      subject: null,
      launch: (instanceId, chapter, subject) => set({ instanceId, chapter, subject }),
    }),
    {
      name: "gened_lesson_launch",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ instanceId, chapter, subject }) => ({ instanceId, chapter, subject }),
    },
  ),
);
