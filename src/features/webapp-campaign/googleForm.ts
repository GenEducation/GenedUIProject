// The pilot sign-up is captured on our page and stored in the Google Form
// "Zoovi Free AI Tutor Pilot — Grades 6-9", so responses show up in the form
// (and its sheet) exactly as if filled in there.
//
// Google doesn't send CORS headers, so the POST is `no-cors`: the response is
// opaque and every check has to happen here before sending. If a question is
// renamed in the form its entry id stays the same; if a question is deleted
// and re-added, its new id must be copied in from the form's /viewform source.

export const GOOGLE_FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLScrN2uL1M2tyKO0aqWRNvWJgRCj3hYErI5tq7tM8_f1Xj_xzQ/formResponse";

const ENTRY = {
  grade: "entry.408290889",
  board: "entry.1917441760",
  subjects: "entry.1367073796",
  whatsapp: "entry.1705327254",
  name: "entry.624039706",
  heardFrom: "entry.1639274391",
  whatsappConsent: "entry.1989914263",
} as const;

/** Every class the invite form offers. The Google Form's grade question must list each one, word for word. */
export const GRADES = ["Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] as const;
/** The /pre-order pilot is Class 6 to 9 only. */
export const PILOT_GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9"] as const satisfies readonly (typeof GRADES)[number][];
export const BOARDS = ["NCERT / CBSE", "ICSE", "State Board", "IB", "Other"] as const;
/** The Google Form's subjects question must list each one, word for word. */
export const SUBJECTS = ["Maths", "English", "Science", "Social Studies", "Hindi", "EVS"] as const;
/** What the /pre-order pilot covers; the ad page sends all of these without asking. */
export const PILOT_SUBJECTS = ["Maths", "English", "Science"] as const satisfies readonly (typeof SUBJECTS)[number][];
/** "Where did you hear about GenEd?" — the form's own option text. */
export const HEARD_FROM = [
  "Friend or family",
  "School",
  "DIDAC",
  "WhatsApp group",
  "Facebook group",
  "Instagram / Facebook ad",
  "LinkedIn",
  "Reddit",
  "Other",
] as const;
/** Answers sent when the page doesn't ask for them (the /pre-order ad page). */
const FIXED = {
  subjects: PILOT_SUBJECTS,
  heardFrom: "Instagram / Facebook ad",
  whatsappConsent: "Yes, contact me on WhatsApp",
} as const;

export interface BetaSignup {
  name: string;
  /** 10-digit Indian mobile number, without +91. */
  whatsapp: string;
  grade: (typeof GRADES)[number];
  board: (typeof BOARDS)[number];
  /** Board name when `board` is "Other". */
  otherBoard?: string;
  /** Defaults to the pilot subjects. */
  subjects?: readonly (typeof SUBJECTS)[number][];
  /** Defaults to "Instagram / Facebook ad" (the /pre-order ad page). */
  heardFrom?: (typeof HEARD_FROM)[number];
  /** Free text when `heardFrom` is "Other". */
  otherHeardFrom?: string;
}

/** Indian mobile: 10 digits starting 6–9 (a leading 0, 91 or +91 is dropped). */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Google's "Other" choice: a sentinel value plus the typed text. */
export function appendChoice(body: URLSearchParams, entry: string, value: string, other?: string) {
  if (value === "Other") {
    body.append(entry, "__other_option__");
    body.append(`${entry}.other_option_response`, (other ?? "").trim());
  } else {
    body.append(entry, value);
  }
}

export function toFormBody(s: BetaSignup): URLSearchParams {
  const body = new URLSearchParams();
  body.append(ENTRY.name, s.name.trim());
  body.append(ENTRY.whatsapp, `+91 ${s.whatsapp}`);
  body.append(ENTRY.grade, s.grade);
  appendChoice(body, ENTRY.board, s.board, s.otherBoard);
  for (const subject of s.subjects ?? FIXED.subjects) body.append(ENTRY.subjects, subject);
  appendChoice(body, ENTRY.heardFrom, s.heardFrom ?? FIXED.heardFrom, s.otherHeardFrom);
  body.append(ENTRY.whatsappConsent, FIXED.whatsappConsent);
  return body;
}

export async function submitBetaSignup(s: BetaSignup): Promise<void> {
  await fetch(GOOGLE_FORM_ACTION, { method: "POST", mode: "no-cors", body: toFormBody(s) });
}
