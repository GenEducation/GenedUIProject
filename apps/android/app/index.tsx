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
  const { state } = useAuth();
  const router    = useRouter();

  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "authenticated") {
      const role = state.profile.role?.toLowerCase();
      if (role === "partner") {
        router.replace("/(partner)");
      } else {
        router.replace("/(tabs)");
      }
    } else {
      router.replace("/sign-in");
    }
  }, [state.status]);

  return null; // splash screen is still showing during hydration
}
