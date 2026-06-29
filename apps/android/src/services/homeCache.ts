/**
 * Persistent cache for the student Home screen (stale-while-revalidate).
 *
 * React Native has no localStorage, so we persist a small JSON snapshot to the
 * app's document directory via expo-file-system (same library usePdfStore uses).
 * documentDirectory — NOT cacheDirectory — so the OS never evicts it; it survives
 * full app restarts and is cleared explicitly on logout.
 *
 * The file always holds the most recent successful Home load, i.e. the data from
 * the end of the student's last session. On next launch useHomeData reads it and
 * paints instantly while the live API calls revalidate in the background.
 */
import * as FileSystem from "expo-file-system/legacy";
import type { SubjectInfo, ChatSession } from "../types/api";
import type { HomeStats } from "../hooks/useHomeData";

const VERSION = 1;

const fileFor = (studentId: string) =>
  `${FileSystem.documentDirectory}home-cache-${studentId}.json`;

export interface HomeCacheData {
  stats: HomeStats | null;
  subjects: SubjectInfo[];
  recentSessions: ChatSession[];
}

interface CacheEnvelope {
  version: number;
  savedAt: number;
  data: HomeCacheData;
}

/** Load the cached Home snapshot for a student, or null on miss / parse / version error. */
export async function loadHomeCache(studentId: string): Promise<HomeCacheData | null> {
  if (!studentId) return null;
  try {
    const path = fileFor(studentId);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (parsed?.version !== VERSION || !parsed.data) return null;

    return parsed.data;
  } catch {
    // Corrupt / unreadable cache — degrade silently to a normal fetch.
    return null;
  }
}

/** Persist the latest successful Home snapshot for a student. */
export async function saveHomeCache(studentId: string, data: HomeCacheData): Promise<void> {
  if (!studentId) return;
  try {
    const envelope: CacheEnvelope = { version: VERSION, savedAt: Date.now(), data };
    await FileSystem.writeAsStringAsync(fileFor(studentId), JSON.stringify(envelope));
  } catch {
    // Best-effort cache; a write failure must never break the screen.
  }
}

/** Remove a student's Home cache (called on logout). */
export async function clearHomeCache(studentId: string): Promise<void> {
  if (!studentId) return;
  try {
    await FileSystem.deleteAsync(fileFor(studentId), { idempotent: true });
  } catch {
    // Ignore — file may not exist.
  }
}
