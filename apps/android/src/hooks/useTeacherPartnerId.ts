/**
 * Extracts the authenticated teacher's linked partner (school) id from the
 * auth store. Returns an empty string if unauthenticated or unset.
 */
import { useAuth } from "../store/useAuthStore";

export function useTeacherPartnerId(): string {
  const { state } = useAuth();
  return state.status === "authenticated" ? state.profile.partner_id ?? "" : "";
}
