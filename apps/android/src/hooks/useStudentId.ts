/**
 * Extracts the authenticated student's user_id from the auth store.
 * Returns an empty string if the user is not authenticated yet.
 */
import { useAuth } from "../store/useAuthStore";

export function useStudentId(): string {
  const { state } = useAuth();
  if (state.status !== "authenticated") return "";
  // Return empty for non-student roles so student hooks never fire with a partner/teacher user_id.
  // Role casing varies by backend ("STUDENT" vs "student"), so compare case-insensitively —
  // every other call site (routing in index.tsx / sign-in.tsx) already lowercases.
  if (state.profile.role?.toLowerCase() !== "student") return "";
  return state.profile.user_id;
}
