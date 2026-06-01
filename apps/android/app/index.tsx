import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/store/useAuthStore";

/**
 * Entry guard — waits for auth hydration then routes:
 *   authenticated → student portal  (/(tabs))
 *   unauthenticated → sign-in
 */
export default function Index() {
  const { state } = useAuth();
  const router    = useRouter();

  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "authenticated") {
      router.replace("/(tabs)");
    } else {
      router.replace("/sign-in");
    }
  }, [state.status]);

  return null; // splash screen is still showing during hydration
}
