export type SessionIdentityChat = {
  id: string;
  session_id?: string;
};

/**
 * Promote one temporary voice conversation to its immutable backend identity.
 *
 * The promotion is deliberately pure so id/session_id/cache ownership can never
 * drift through separate store updates. A caller may apply the returned values in
 * one atomic state update and then update the route to the same canonical ID.
 */
export function promoteTemporaryVoiceSession<TChat extends SessionIdentityChat, TMessage>(
  activeChat: TChat,
  messages: TMessage[],
  cache: Record<string, TMessage[]>,
  canonicalSessionId: string,
): { activeChat: TChat; cache: Record<string, TMessage[]> } {
  const temporaryId = activeChat.id;
  if (temporaryId !== "new" && temporaryId !== "new-focused") {
    throw new Error("Only a temporary voice conversation can be promoted");
  }

  const nextCache = { ...cache };
  const temporaryMessages = nextCache[temporaryId] || messages;
  delete nextCache[temporaryId];
  nextCache[canonicalSessionId] = temporaryMessages;

  return {
    activeChat: {
      ...activeChat,
      id: canonicalSessionId,
      session_id: canonicalSessionId,
    },
    cache: nextCache,
  };
}

/** A canonical conversation ID may be announced once and can never be replaced. */
export function isCompatibleVoiceSessionId(
  activeChat: SessionIdentityChat,
  receivedSessionId: string,
): boolean {
  const current = activeChat.session_id || activeChat.id;
  return current === "new" || current === "new-focused" || current === receivedSessionId;
}
