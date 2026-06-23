import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/store/useAuthStore";

/**
 * Entry guard — waits for auth hydration then routes by role:
 *   partner       → partner portal  (/(partner))
 *   student/other → student portal  (/(tabs))
 *   unauthenticated → sign-in
 */
export default function Index() {
  const { state, logout } = useAuth();
  const router    = useRouter();

  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "authenticated") {
      const role = state.profile.role?.toLowerCase();
      if (role === "partner") {
        router.replace("/(partner)");
      } else if (role === "parent") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace("/(parent)" as any);
      } else if (role === "teacher") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace("/(teacher)" as any);
      } else if (role === "student") {
        router.replace("/(tabs)");
      } else {
        // Unknown or missing role — reject rather than grant student access
        console.warn("[auth] unrecognized role:", role, "— signing out");
        logout();
        router.replace("/sign-in");
      }
    } else {
      router.replace("/sign-in");
    }
  }, [state.status]);

  return null; // splash screen is still showing during hydration
}
