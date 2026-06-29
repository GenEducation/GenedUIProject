/**
 * Auth store — React Context + useReducer (no extra libs needed).
 *
 * Mirrors the pattern from the web's useStudentStore / localStorage but uses
 * expo-secure-store for persistence and provides typed state for the whole app.
 */
import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { getToken, getProfile, setToken, setProfile, clearSession } from "../services/storage";
import { clearHomeCache } from "../services/homeCache";
import type { AuthTokenResponse } from "../services/authService";

export interface UserProfile {
  user_id:        string;
  username:       string;
  email?:         string;
  name?:          string;
  role:           string;
  grade?:         number;
  school_board?:  string;
  ai_name?:       string;
  preferred_voice?: string;
  plan?:          "FREE" | "PRO";
  plan_expires_at?: string | null;
}

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; token: string; profile: UserProfile };

type Action =
  | { type: "HYDRATED_EMPTY" }
  | { type: "HYDRATED_OK";  token: string; profile: UserProfile }
  | { type: "LOGGED_IN";   token: string; profile: UserProfile }
  | { type: "LOGGED_OUT" };

function reducer(_: AuthState, action: Action): AuthState {
  switch (action.type) {
    case "HYDRATED_EMPTY": return { status: "unauthenticated" };
    case "HYDRATED_OK":
    case "LOGGED_IN":
      return { status: "authenticated", token: action.token, profile: action.profile };
    case "LOGGED_OUT":     return { status: "unauthenticated" };
  }
}

function tokenToProfile(r: AuthTokenResponse): UserProfile {
  return {
    user_id:         r.user_id,
    username:        r.username,
    email:           r.email,
    name:            r.name,
    role:            r.role,
    grade:           r.grade,
    school_board:    r.school_board,
    ai_name:         r.ai_name,
    preferred_voice: r.preferred_voice,
    plan:            r.plan,
    plan_expires_at: r.plan_expires_at,
  };
}

interface AuthCtx {
  state:   AuthState;
  login:   (r: AuthTokenResponse) => Promise<void>;
  logout:  () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { status: "loading" });

  /* Hydrate from secure store on mount */
  useEffect(() => {
    (async () => {
      const [token, profile] = await Promise.all([getToken(), getProfile()]);
      if (token && profile) {
        dispatch({ type: "HYDRATED_OK", token, profile: profile as UserProfile });
      } else {
        dispatch({ type: "HYDRATED_EMPTY" });
      }
    })();
  }, []);

  const login = useCallback(async (r: AuthTokenResponse) => {
    const profile = tokenToProfile(r);
    await Promise.all([setToken(r.access_token), setProfile(profile as any)]);
    dispatch({ type: "LOGGED_IN", token: r.access_token, profile });
  }, []);

  const logout = useCallback(async () => {
    if (state.status === "authenticated") {
      await clearHomeCache(state.profile.user_id);
    }
    await clearSession();
    dispatch({ type: "LOGGED_OUT" });
  }, [state]);

  return React.createElement(Ctx.Provider, { value: { state, login, logout } }, children);
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
