/**
 * Native Google Sign-In helper.
 *
 * Wraps @react-native-google-signin/google-signin so the auth screens only deal
 * with a single `signInWithGoogle()` call that returns a Google ID token. That
 * token is then sent to the backend (`/auth/google-sign-in` or
 * `/auth/google-sign-up`) which verifies it against the same OAuth web client ID.
 *
 * Requires a dev/EAS build — the native module does not run in Expo Go.
 */
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";

/** Thrown when the user dismisses the Google account picker — UI should ignore it. */
export class GoogleSignInCancelled extends Error {
  constructor() {
    super("Google sign-in cancelled");
    this.name = "GoogleSignInCancelled";
  }
}

// Same OAuth *web* client ID the backend verifies the idToken against
// (mirrors the web app's NEXT_PUBLIC_GOOGLE_CLIENT_ID).
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// Configure once at module load. webClientId makes the returned idToken's
// audience match what the backend verifies against.
GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });

/**
 * Launches the native Google account picker and returns the ID token.
 * @throws {GoogleSignInCancelled} if the user dismisses the picker.
 * @throws {Error} for any other failure (Play Services missing, network, etc.).
 */
export async function signInWithGoogle(): Promise<string> {
  if (!WEB_CLIENT_ID) {
    throw new Error("Google sign-in is not configured (missing web client ID).");
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // A previous session can leave a cached account; sign out first so the picker
  // always appears and a fresh idToken is minted.
  await GoogleSignin.signOut().catch(() => {});

  try {
    const response = await GoogleSignin.signIn();

    // v13+ returns { type, data }; older shape returns the user info directly.
    const idToken =
      (response as any)?.data?.idToken ?? (response as any)?.idToken ?? null;

    if ((response as any)?.type === "cancelled") {
      throw new GoogleSignInCancelled();
    }
    if (!idToken) {
      throw new Error("Google sign-in did not return an ID token.");
    }
    return idToken;
  } catch (err) {
    if (
      isErrorWithCode(err) &&
      (err.code === statusCodes.SIGN_IN_CANCELLED ||
        err.code === statusCodes.IN_PROGRESS)
    ) {
      throw new GoogleSignInCancelled();
    }
    throw err;
  }
}
