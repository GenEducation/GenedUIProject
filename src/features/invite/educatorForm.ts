// The educator invite is stored in its own Google Form, "Zoovi for Educators — Get an Invite", so responses show
// up there (and in its sheet) exactly as if filled in on Google. Same rules as the parent form (googleForm.ts):
// the POST is `no-cors`, so every check happens here, and each option below must match the form's word for word,
// or Google drops the whole response without telling us.

import { BOARDS, SUBJECTS, appendChoice } from "@/features/webapp-campaign/googleForm";

export const EDUCATOR_FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSfeDH0JJu9ijmA5ItJAZUBjKXuSFEAFVYo_hBTaMu6KAE37UA/formResponse";

const ENTRY = {
  name: "entry.1947303286",
  whatsapp: "entry.737773296",
  email: "entry.1522013125",
  school: "entry.1078625606",
  city: "entry.946656613",
  role: "entry.103157093",
  board: "entry.558547876",
  classes: "entry.1024343567",
  subjects: "entry.2096216895",
  heardFrom: "entry.1415375585",
  whatsappConsent: "entry.688595184",
} as const;

export const ROLES = [
  "Teacher",
  "Head of department",
  "Principal / school leader",
  "School owner / trustee",
  "Tutor / coaching centre",
  "Other",
] as const;
export const CLASSES = ["Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9"] as const;
export const EDUCATOR_HEARD_FROM = [
  "Friend or colleague",
  "DIDAC",
  "School",
  "WhatsApp group",
  "LinkedIn",
  "Instagram / Facebook ad",
  "Other",
] as const;
export { BOARDS, SUBJECTS };

export interface EducatorSignup {
  name: string;
  /** 10-digit Indian mobile number, without +91. */
  whatsapp: string;
  email: string;
  school: string;
  city: string;
  role: (typeof ROLES)[number];
  /** Free text when `role` is "Other". */
  otherRole?: string;
  board: (typeof BOARDS)[number];
  otherBoard?: string;
  classes: readonly (typeof CLASSES)[number][];
  subjects: readonly (typeof SUBJECTS)[number][];
  heardFrom: (typeof EDUCATOR_HEARD_FROM)[number];
  otherHeardFrom?: string;
}

export function toEducatorFormBody(s: EducatorSignup): URLSearchParams {
  const body = new URLSearchParams();
  body.append(ENTRY.name, s.name.trim());
  body.append(ENTRY.whatsapp, `+91 ${s.whatsapp}`);
  body.append(ENTRY.email, s.email.trim());
  body.append(ENTRY.school, s.school.trim());
  body.append(ENTRY.city, s.city.trim());
  appendChoice(body, ENTRY.role, s.role, s.otherRole);
  appendChoice(body, ENTRY.board, s.board, s.otherBoard);
  for (const c of s.classes) body.append(ENTRY.classes, c);
  for (const subject of s.subjects) body.append(ENTRY.subjects, subject);
  appendChoice(body, ENTRY.heardFrom, s.heardFrom, s.otherHeardFrom);
  body.append(ENTRY.whatsappConsent, "Yes, contact me on WhatsApp");
  return body;
}

export async function submitEducatorInvite(s: EducatorSignup): Promise<void> {
  await fetch(EDUCATOR_FORM_ACTION, { method: "POST", mode: "no-cors", body: toEducatorFormBody(s) });
}
