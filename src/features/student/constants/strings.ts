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
    profile: "Profile",
  },

  streak: {
    dayStreak: "Current Streak",
    chaptersCompleted: "Chapters Completed",
    longestStreak: "Longest Streak",
    timeSpent: "Time Spent (est.)",
  },

  practice: {
    pageTitle: "Practice",
    pastSectionTitle: "Past Tests",
    startCta: "Start Test",
    lockedMessage: "Finish your onboarding test to unlock assessments.",
  },

  chat: {
    doubtMode: "Ask a doubt",
    studyMode: "Learn a topic",
  },
} as const;
