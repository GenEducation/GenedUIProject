import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TutorialStepDef {
  id: string;
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  expectedRoute?: string;
  requiresAction?: string;
  mobileOnly?: boolean;
}

export const TUTORIAL_SEQUENCE: TutorialStepDef[] = [
  // 0. Mobile Hamburger Menu (Mobile Only)
  {
    id: "hamburger-menu",
    target: '[data-tutorial="hamburger-menu"]',
    title: "Open Menu",
    description: "On smaller screens, you can access your profile and analytics from this menu icon.",
    expectedRoute: "/student",
    position: "bottom",
    mobileOnly: true,
    requiresAction: "open_sidebar"
  },
  // 1. Start in Chat Hub
  {
    id: "go-to-profile",
    target: '[data-tutorial="profile-nav"]',
    title: "Your Profile",
    description: "Click on the Profile button to configure your settings.",
    expectedRoute: "/student",
    position: "top",
    requiresAction: "navigate"
  },
  // 2. Profile
  {
    id: "partner-requests",
    target: '[data-tutorial="partner-requests"]',
    title: "School Partners",
    description: "You must connect to 'GenEd Admin' to access the curriculum. Send a request now.",
    expectedRoute: "/student/profile",
    position: "left",
    requiresAction: "send_admin_request",
  },
  {
    id: "parent-access",
    target: '[data-tutorial="parent-access"]',
    title: "Guardian Access",
    description: "You can add your parent's email here so they can stay updated. This is optional.",
    expectedRoute: "/student/profile",
    position: "left"
  },
  {
    id: "go-back-from-profile",
    target: '[data-tutorial="profile-back-button"]',
    title: "Return to Hub",
    description: "Great! Let's go back to the main menu. Click the Back button.",
    expectedRoute: "/student/profile",
    position: "bottom",
    requiresAction: "navigate"
  },
  {
    id: "youre-all-set",
    target: '[data-tutorial="profile-nav"]',
    title: "You're All Set!",
    description: "Amazing work! You're ready to start your learning journey. Check out your Practice tests or talk to a tutor.",
    expectedRoute: "/student",
    position: "bottom",
  },
];

interface TutorialState {
  isActive: boolean;
  currentStepIndex: number;
  completedActions: Record<string, boolean>;
  hasEnded: boolean;
  hasDismissedCelebration: boolean;

  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  /** User watched the video to the end and deliberately closed it — show confetti. */
  completeTutorial: () => void;
  /** User dismissed the tutorial early (header X) — no confetti. */
  skipTutorial: () => void;
  completeAction: (actionId: string) => void;
  getCurrentStep: () => TutorialStepDef | null;
  dismissCelebration: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStepIndex: 0,
      completedActions: {},
      hasEnded: false,
      hasDismissedCelebration: true, // Default to true so old users don't see it

      getCurrentStep: () => {
        const { currentStepIndex } = get();
        return TUTORIAL_SEQUENCE[currentStepIndex] || null;
      },

      startTutorial: () => {
        set({
          isActive: true,
          currentStepIndex: 0,
          completedActions: {},
          hasEnded: false,
          hasDismissedCelebration: false, // Reset to false when starting
        });
      },

      nextStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex < TUTORIAL_SEQUENCE.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        } else {
          set({ isActive: false, hasEnded: true, hasDismissedCelebration: false });
        }
      },

      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      completeTutorial: () => {
        // Watched the whole video → reward with confetti on home screen
        set({ isActive: false, hasEnded: true, hasDismissedCelebration: false });
      },

      skipTutorial: () => {
        // Early dismiss via header X → no confetti
        set({ isActive: false, hasEnded: true, hasDismissedCelebration: true });
      },

      completeAction: (actionId: string) => {
        set((state) => ({
          completedActions: {
            ...state.completedActions,
            [actionId]: true,
          },
        }));
      },

      dismissCelebration: () => {
        set({ hasDismissedCelebration: true });
      },
    }),
    {
      name: "gened_tutorial_state",
    }
  )
);
