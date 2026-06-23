/**
 * Extracts the authenticated student's user_id from the auth store.
 * Returns an empty string if the user is not authenticated yet.
 */
import { useAuth } from "../store/useAuthStore";

export function useStudentId(): string {
  const { state } = useAuth();
  if (state.status !== "authenticated") return "";
  // Return empty for non-student roles so student hooks never fire with a partner/teacher user_id
  if (state.profile.role !== "student") return "";
  return state.profile.user_id;
}
