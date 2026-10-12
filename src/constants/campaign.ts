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
