// The pilot sign-up is captured on our page and stored in the Google Form
// "GenEd Free AI Tutor Pilot — Grades 6-9", so responses show up in the form
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

export const GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9"] as const;
export const BOARDS = ["NCERT / CBSE", "ICSE", "State Board", "IB", "Other"] as const;

/** Answers this campaign page always sends, without asking. */
const FIXED = {
  subjects: ["Maths", "English", "Science"],
  heardFrom: "Instagram / Facebook ad",
  whatsappConsent: "Yes, contact me on WhatsApp",
};

export interface BetaSignup {
  name: string;
  /** 10-digit Indian mobile number, without +91. */
  whatsapp: string;
  grade: (typeof GRADES)[number];
  board: (typeof BOARDS)[number];
  /** Board name when `board` is "Other". */
  otherBoard?: string;
}

export function toFormBody(s: BetaSignup): URLSearchParams {
  const body = new URLSearchParams();
  body.append(ENTRY.name, s.name.trim());
  body.append(ENTRY.whatsapp, `+91 ${s.whatsapp}`);
  body.append(ENTRY.grade, s.grade);
  if (s.board === "Other") {
    // Google's "Other" choice: a sentinel value plus the typed text.
    body.append(ENTRY.board, "__other_option__");
    body.append(`${ENTRY.board}.other_option_response`, (s.otherBoard ?? "").trim());
  } else {
    body.append(ENTRY.board, s.board);
  }
  for (const subject of FIXED.subjects) body.append(ENTRY.subjects, subject);
  body.append(ENTRY.heardFrom, FIXED.heardFrom);
  body.append(ENTRY.whatsappConsent, FIXED.whatsappConsent);
  return body;
}

export async function submitBetaSignup(s: BetaSignup): Promise<void> {
  await fetch(GOOGLE_FORM_ACTION, { method: "POST", mode: "no-cors", body: toFormBody(s) });
}
