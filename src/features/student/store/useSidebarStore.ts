import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SidebarState {
  sidebarOpen: boolean;
  /** true once the student has explicitly opened/closed the sidebar — after
   *  that, window-resize/mount checks must stop overriding their choice. */
  userSet: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** Width-based auto collapse/expand; no-ops once the user has toggled manually. */
  applyResponsive: (open: boolean) => void;
}

const initialOpen = typeof window !== "undefined" ? window.innerWidth >= 1024 : true;

/** The student's open/closed choice is kept for the browser tab (sessionStorage), so it survives a full page load:
 *  the sidebar's Home link reloads the page, which used to reset a closed sidebar to open. Only a choice the
 *  student made is kept; until then the width decides. */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      sidebarOpen: initialOpen,
      userSet: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open, userSet: true }),
      applyResponsive: (open) => {
        if (!get().userSet) set({ sidebarOpen: open });
      },
    }),
    {
      name: "gened-student-sidebar",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => (s.userSet ? { sidebarOpen: s.sidebarOpen, userSet: true } : {}),
    },
  ),
);
