export function selectContinueSession<T extends { is_complete?: boolean }>(
  sessions: readonly T[],
): T | null {
  return sessions.find(session => !session.is_complete) ?? null;
}
