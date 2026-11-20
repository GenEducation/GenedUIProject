/** The Zoovi marketing pages. */
export type SitePage = "home" | "parents" | "educators";

export const ROUTES: Record<SitePage, string> = {
  home: "/",
  parents: "/for-parents",
  educators: "/for-educators",
};

/** Where "Get an Invite", "Contact" and every "Talk to Us" go. */
export const CONTACT_EMAIL = "info@gened.ai";
/** Opens a new email to CONTACT_EMAIL in the visitor's own mail app. */
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;

/**
 * The nav's Home link takes the visitor home without replaying the Zoovi loader (the logo still plays it). It leaves
 * this one-time flag for the home page, which reads and clears it (engine/run-home.js).
 */
export const SKIP_INTRO_KEY = "zoovi-skip-intro";
