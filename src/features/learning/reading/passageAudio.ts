import { ApiRequestError, authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** Why a segment's audio could not be played, in words a learner can act on. */
export type ListenProblem = "language" | "busy" | "trial" | "unavailable" | "not_in_lesson" | "unsupported";

export const LISTEN_MESSAGES: Record<ListenProblem, string> = {
  language: "Listening isn't ready in this language yet. You can still read it.",
  busy: "The reader is busy right now. Try again in a moment.",
  trial: "Your free trial has ended, so listening is paused.",
  unavailable: "The reader can't be reached right now. You can still read it, and try again later.",
  not_in_lesson: "This part isn't available to listen to yet.",
  unsupported: "This browser can't play the audio. You can still read it.",
};

export class ListenError extends Error {
  constructor(readonly problem: ListenProblem) {
    super(LISTEN_MESSAGES[problem]);
    this.name = "ListenError";
  }
}

/** The HTTP status the server answers with, as the learner's problem. */
export function problemFor(status: number): ListenProblem {
  if (status === 402) return "trial";
  if (status === 404) return "not_in_lesson";
  if (status === 409 || status === 422) return "language";
  if (status === 503) return "busy";
  return "unavailable";
}

/**
 * The audio of one part of a passage in the learner's lesson (`GET /v1/voice/passage-audio`). The server finds the text in the
 * learner's own lesson: a part is named by passage and segment, never sent as text. The audio is kept by the browser only for
 * this page (an object URL); nothing is stored.
 */
export async function fetchSegmentAudio(instanceId: string, passageId: string, segment: number): Promise<Blob> {
  const query = new URLSearchParams({ instance_id: instanceId, passage_id: passageId, segment: String(segment) });
  return fetchPassageAudio(query);
}

export async function fetchActivityAudio(instanceId: string, nodeId: string, itemId: string, language: string): Promise<Blob> {
  return fetchPassageAudio(new URLSearchParams({ instance_id: instanceId, instance_node_id: nodeId, item_id: itemId, language }));
}

async function fetchPassageAudio(query: URLSearchParams): Promise<Blob> {
  try {
    return await (await authFetch(`${API_BASE_URL}/v1/voice/passage-audio?${query}`)).blob();
  } catch (error) {
    if (error instanceof ApiRequestError) throw new ListenError(problemFor(error.status));
    throw new ListenError("unavailable");
  }
}
