import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../useAuthStore";
import type { AuthTokenResponse } from "../../services/authService";

jest.mock("../../services/storage");
jest.mock("../../services/homeCache");

import * as storage from "../../services/storage";
import { clearHomeCache } from "../../services/homeCache";

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockClearHomeCache = clearHomeCache as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const tokenResponse: AuthTokenResponse = {
  access_token: "tok-123",
  user_id: "u1",
  username: "amy",
  role: "student",
} as AuthTokenResponse;

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getToken.mockResolvedValue(null);
  mockStorage.getProfile.mockResolvedValue(null);
  mockStorage.setToken.mockResolvedValue(undefined as never);
  mockStorage.setProfile.mockResolvedValue(undefined as never);
  mockStorage.clearSession.mockResolvedValue(undefined as never);
  mockClearHomeCache.mockResolvedValue(undefined);
});

describe("useAuthStore", () => {
  it("hydrates to unauthenticated when the store is empty", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe("unauthenticated"));
  });

  it("hydrates to authenticated when a token + profile exist", async () => {
    mockStorage.getToken.mockResolvedValue("tok-123");
    mockStorage.getProfile.mockResolvedValue({ user_id: "u1", username: "amy", role: "student" } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe("authenticated"));
  });

  it("login() persists the token and transitions to authenticated", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe("unauthenticated"));

    await act(async () => {
      await result.current.login(tokenResponse);
    });

    expect(mockStorage.setToken).toHaveBeenCalledWith("tok-123");
    expect(result.current.state.status).toBe("authenticated");
    if (result.current.state.status === "authenticated") {
      expect(result.current.state.profile.username).toBe("amy");
    }
  });

  it("logout() clears the session and home cache", async () => {
    mockStorage.getToken.mockResolvedValue("tok-123");
    mockStorage.getProfile.mockResolvedValue({ user_id: "u1", username: "amy", role: "student" } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state.status).toBe("authenticated"));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockClearHomeCache).toHaveBeenCalledWith("u1");
    expect(mockStorage.clearSession).toHaveBeenCalled();
    expect(result.current.state.status).toBe("unauthenticated");
  });

  it("useAuth() throws when used outside the provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
