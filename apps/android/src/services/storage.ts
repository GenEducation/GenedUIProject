/**
 * Secure token/profile storage for React Native.
 *
 * Replaces the web app's localStorage (authFetch.ts / authService.ts) with
 * expo-secure-store, which uses the Android Keystore on Android.
 *
 * Keys are intentionally identical to the web so any shared logic can be
 * ported without search-and-replace.
 */
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY   = "gened_auth_token";
const PROFILE_KEY = "gened_user_profile";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getProfile(): Promise<Record<string, any> | null> {
  const raw = await SecureStore.getItemAsync(PROFILE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setProfile(profile: Record<string, any>): Promise<void> {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}

export async function deleteProfile(): Promise<void> {
  await SecureStore.deleteItemAsync(PROFILE_KEY);
}

export async function clearSession(): Promise<void> {
  await Promise.all([deleteToken(), deleteProfile()]);
}
