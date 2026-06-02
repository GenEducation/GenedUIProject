/**
 * Extracts the authenticated student's user_id from the auth store.
 * Returns an empty string if the user is not authenticated yet.
 */
import { useAuth } from "../store/useAuthStore";

export function useStudentId(): string {
  const { state } = useAuth();
  return state.status === "authenticated" ? state.profile.user_id : "";
}
