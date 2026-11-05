import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/**
 * A GenEd bot paired to a student with the device code (backend ADR 0043). It stays connected while a student
 * uses it; after 30 days without use, or once removed here, it shows a new pairing code by itself.
 */
export interface PairedBot {
  id: string;
  /** "GenEd bot ·8CEA": the last 4 characters of the id the bot reported. */
  label: string;
  paired_at: string;
  /** When a student last used it: the wake word, a touch on its face, or a voice session. */
  last_used_at: string;
  /** When it will ask for a new code if nobody uses it before then. */
  disconnects_at: string;
}

async function list(path: string): Promise<PairedBot[]> {
  const response = await authFetch(`${API_BASE_URL}${path}`, { allow403: true });
  return (await response.json()) as PairedBot[];
}

async function remove(path: string): Promise<void> {
  await authFetch(`${API_BASE_URL}${path}`, { method: "DELETE", allow403: true });
}

/** The signed-in student's own bots. */
export const listMyBots = () => list("/v1/devices/bots");
export const removeMyBot = (botId: string) => remove(`/v1/devices/bots/${encodeURIComponent(botId)}`);

/** A parent's view of an approved child's bots; 403 (thrown) when the link isn't approved. */
export const listChildBots = (studentId: string) =>
  list(`/v1/devices/children/${encodeURIComponent(studentId)}/bots`);
export const removeChildBot = (studentId: string, botId: string) =>
  remove(`/v1/devices/children/${encodeURIComponent(studentId)}/bots/${encodeURIComponent(botId)}`);
