/**
 * Whether this browser tab has already been through the parent portal's
 * entry (the "Who are you checking on today?" picker).
 *
 * Opening the portal — a new tab, a new window, or after logging in — starts
 * at the picker. Refreshing a tab that is already in the portal keeps the page
 * the parent was on. sessionStorage gives exactly that split: it survives a
 * reload but not the tab. The mark is tied to the current login, so logging
 * out and back in (or a session expiring) in the same tab starts fresh.
 */

const KEY = "gened_parent_portal_entered";

/** Short fingerprint of the auth token, so the raw token isn't copied around. */
function currentLoginFingerprint(): string | null {
  try {
    const token = localStorage.getItem("gened_auth_token");
    if (!token) return null;
    let hash = 5381;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) + hash + token.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
  } catch {
    return null;
  }
}

export function hasEnteredPortal(): boolean {
  try {
    const login = currentLoginFingerprint();
    return !!login && sessionStorage.getItem(KEY) === login;
  } catch {
    return false;
  }
}

export function markPortalEntered(): void {
  try {
    const login = currentLoginFingerprint();
    if (login) sessionStorage.setItem(KEY, login);
  } catch {
    // Blocked storage: the picker simply shows again after a refresh.
  }
}

export function clearPortalEntry(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
