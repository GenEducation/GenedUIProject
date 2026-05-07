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
}

export const TUTORIAL_SEQUENCE: TutorialStepDef[] = [
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
    id: "go-to-analytics",
    target: '[data-tutorial="analytics-nav"]',
    title: "Track Progress",
    description: "Now let's see your progress. Click on the Analytics tab in the navigation.",
    expectedRoute: "/student",
    position: "top",
    requiresAction: "navigate"
  },
  // 3. Analytics
  {
    id: "analytics-subject",
    target: '[data-tutorial="chapter-mastery-tab"]',
    title: "Subject Mastery",
    description: "Here you can see your overall mastery levels across different subjects.",
    expectedRoute: "/student/analytics",
    position: "bottom"
  },
  {
    id: "analytics-skill",
    target: '[data-tutorial="skill-mastery-tab"]',
    title: "Skill Mastery",
    description: "Click here to drill down into specific micro-skills within a subject.",
    expectedRoute: "/student/analytics",
    position: "bottom"
  },
  {
    id: "analytics-progression",
    target: '[data-tutorial="skill-progression-tab"]',
    title: "Skill Progression",
    description: "This shows how your skills have improved over time.",
    expectedRoute: "/student/analytics",
    position: "bottom"
  },
  {
    id: "go-to-chat",
    target: '[data-tutorial="analytics-back-button"]',
    title: "Back to Learning",
    description: "Let's head back to the Chat Hub to start learning. Click the Back button.",
    expectedRoute: "/student/analytics",
    position: "bottom",
    requiresAction: "navigate"
  },
  // 4. Chat Hub
  {
    id: "new-chat",
    target: '[data-tutorial="new-chat"]',
    title: "Start a Conversation",
    description: "Click here to start a new chat with a Socratic agent.",
    expectedRoute: "/student",
    position: "bottom"
  },
  {
    id: "agent-picker-info",
    target: '[data-tutorial="new-chat"]', 
    title: "Select an Agent",
    description: "You can pick different agents specializing in various subjects to start learning. You're all set!",
    expectedRoute: "/student",
    position: "bottom"
  }
];

interface TutorialState {
  isActive: boolean;
  currentStepIndex: number;
  completedActions: Record<string, boolean>;
  hasEnded: boolean;
  
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeAction: (actionId: string) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStepIndex: 0,
      completedActions: {},
      hasEnded: false,

      startTutorial: () => {
        set({
          isActive: true,
          currentStepIndex: 0,
          completedActions: {},
          hasEnded: false,
        });
      },

      nextStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex < TUTORIAL_SEQUENCE.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        } else {
          set({ isActive: false, hasEnded: true });
        }
      },

      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      skipTutorial: () => {
        set({ isActive: false, hasEnded: true });
      },

      completeAction: (actionId: string) => {
        set((state) => ({
          completedActions: {
            ...state.completedActions,
            [actionId]: true,
          },
        }));
      },
    }),
    {
      name: "gened_tutorial_state",
    }
  )
);
