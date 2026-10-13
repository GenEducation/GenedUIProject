/**
 * Which campaign `/pre-order` serves. Flip this to switch the ad landing page
 * without deleting the other one.
 *
 *  - "webapp":  the parent web-app pilot campaign (film + sign-up into the Google Form)
 *  - "deskbot": the Deskbot device pre-order (paused, kept intact)
 *
 * The landing page's pre-order buttons read their label from here too.
 */
export const ACTIVE_CAMPAIGN: "webapp" | "deskbot" = "webapp";

/** Label for a landing-page button that links to `/pre-order`: the button's
 *  own Deskbot wording while that campaign runs, a web-app one otherwise. */
export function campaignLabel(deskbotLabel: string): string {
  return ACTIVE_CAMPAIGN === "webapp" ? "Join the free pilot" : deskbotLabel;
}

/** Meta (Facebook/Instagram) Pixel for the campaign ads. Loaded on the campaign page only. */
export const META_PIXEL_ID = "1132054889546244";

/** Web-app pilot offer, shown on the campaign page. Seats are hardcoded until
 *  the sign-up count can be read back from the Google Form's sheet. */
export const PILOT_SEATS = 30;
export const PILOT_START = "16 Oct";
/** When the pilot starts (IST); the seats-left pill counts down to it. */
export const PILOT_START_AT = "2026-10-16T00:00:00+05:30";
export const PILOT_TAGLINE = `Free pilot · Only ${PILOT_SEATS} families · Starts ${PILOT_START}`;

/** "Seats left" shown on the campaign page. Hardcoded (no live count yet); it
 *  drops by one for a visitor once they've signed up, remembered in their browser. */
export const PILOT_SEATS_LEFT = 11;
