import { create } from "zustand";

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

export const useSidebarStore = create<SidebarState>((set, get) => ({
  sidebarOpen: initialOpen,
  userSet: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open, userSet: true }),
  applyResponsive: (open) => {
    if (!get().userSet) set({ sidebarOpen: open });
  },
}));
