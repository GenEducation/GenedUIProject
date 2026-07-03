/**
 * Global test setup — registers custom matchers and mocks the native /
 * side-effecting modules that unit + component tests should never load.
 */
require("@testing-library/jest-native/extend-expect");

// --- expo-secure-store: in-memory stub (used by services/storage.ts,
//     store/usePrefsStore.ts). Each test can reset via jest.clearAllMocks. ---
jest.mock("expo-secure-store", () => {
  const mem = new Map();
  return {
    getItemAsync: jest.fn(async (k) => (mem.has(k) ? mem.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      mem.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      mem.delete(k);
    }),
  };
});

// --- Google sign-in native module ---
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {},
}));

// Note: the custom native modules (VoiceAudioEngine + AEC, referenced by
// services/aecManager.ts) are not mocked here — jest-expo sets up the native
// module registry, and seed tests avoid importing the audio services. Add a
// targeted jest.mock in the specific test file if/when those are exercised.

// --- expo-router: navigation hooks used by chat/voice components ---
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: "Link",
}));
