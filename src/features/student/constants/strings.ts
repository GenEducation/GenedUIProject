/**
 * Settled student-app vocabulary. The design audit found the same concept
 * worded differently per screen (nav "Practice" vs page header "Test", Home
 * "Best Streak" vs Profile/Chat "Longest Streak", "Doubt/Teaching" jargon).
 * Route new copy through here instead of hardcoding strings per file, so
 * fixing a word fixes it everywhere.
 */
export const STRINGS = {
  brand: "GenEd",
  tutorName: "Nia",

  nav: {
    home: "Home",
    practice: "Practice",
    schedule: "Schedule",
    reportCard: "Report Card",
    me: "Me",
    profile: "Profile",
  },

  streak: {
    dayStreak: "Day Streak",
    sessions: "Sessions",
    longestStreak: "Longest Streak",
  },

  practice: {
    pageTitle: "Practice",
    pastSectionTitle: "Past Tests",
    startCta: "Start Test",
    lockedMessage: "Complete your English or Mathematics onboarding to unlock assessments.",
  },

  chat: {
    doubtMode: "Ask a doubt",
    studyMode: "Learn a topic",
  },
} as const;
