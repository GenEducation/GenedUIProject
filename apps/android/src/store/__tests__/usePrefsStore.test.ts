import { prefsStore } from "../usePrefsStore";
import * as SecureStore from "expo-secure-store";

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("prefsStore", () => {
  it("exposes sensible defaults", () => {
    const snap = prefsStore.get();
    expect(snap.soundEnabled).toBe(true);
    expect(snap.listenMode).toBe("continuous");
  });

  it("setSoundEnabled updates state and persists", () => {
    prefsStore.setSoundEnabled(false);
    expect(prefsStore.get().soundEnabled).toBe(false);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "gened_prefs",
      expect.stringContaining('"soundEnabled":false')
    );
    prefsStore.setSoundEnabled(true); // restore
  });

  it("setListenMode updates state and persists", () => {
    prefsStore.setListenMode("ptt");
    expect(prefsStore.get().listenMode).toBe("ptt");
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "gened_prefs",
      expect.stringContaining('"listenMode":"ptt"')
    );
    prefsStore.setListenMode("continuous"); // restore
  });

  it("hydrate loads persisted prefs and marks hydrated", async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(
      JSON.stringify({ soundEnabled: false, listenMode: "ptt" })
    );
    await prefsStore.hydrate();
    const snap = prefsStore.get();
    expect(snap.hydrated).toBe(true);
    expect(snap.soundEnabled).toBe(false);
    expect(snap.listenMode).toBe("ptt");
    // restore defaults for other tests
    prefsStore.setSoundEnabled(true);
    prefsStore.setListenMode("continuous");
  });

  it("hydrate keeps defaults when nothing is stored", async () => {
    prefsStore.setSoundEnabled(true);
    prefsStore.setListenMode("continuous");
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
    await prefsStore.hydrate();
    expect(prefsStore.get().soundEnabled).toBe(true);
    expect(prefsStore.get().listenMode).toBe("continuous");
  });
});
