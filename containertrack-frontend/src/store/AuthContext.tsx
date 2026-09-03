import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/authApi";
import { setAuthCallbacks, setAuthTokens } from "../api/axiosInstance";
import type { AuthUser, LoginRequest } from "../types/auth";

// Tradeoff: the refresh token lives in React state (memory) by default, which
// is the safest option (never survives a reload, never touchable by a
// same-origin XSS reading storage). We ALSO mirror it into sessionStorage so a
// hard reload (F5) doesn't force a re-login — sessionStorage is cleared when
// the tab closes and isn't shared across tabs/origins, which is an acceptable
// middle ground. The access token is NEVER persisted anywhere but memory.
const REFRESH_TOKEN_SESSION_KEY = "ct_refresh_token";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: "LOGIN_SUCCESS"; user: AuthUser; accessToken: string; refreshToken: string }
  | { type: "TOKEN_REFRESHED"; accessToken: string }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "MUST_CHANGE_PASSWORD_HANDLED" }
  | { type: "UPDATE_USER"; user: AuthUser };

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        user: action.user,
        accessToken: action.accessToken,
        refreshToken: action.refreshToken,
        isLoading: false,
      };
    case "TOKEN_REFRESHED":
      return { ...state, accessToken: action.accessToken };
    case "LOGOUT":
      return { user: null, accessToken: null, refreshToken: null, isLoading: false };
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    case "UPDATE_USER":
      return { ...state, user: action.user };
    default:
      return state;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateAccessToken: (token: string) => void;
  markPasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  // Keep a ref mirror so axios callbacks (registered once) always see fresh values.
  const refreshTokenRef = useRef<string | null>(null);

  useEffect(() => {
    setAuthTokens({ accessToken: state.accessToken, refreshToken: state.refreshToken });
    refreshTokenRef.current = state.refreshToken;
  }, [state.accessToken, state.refreshToken]);

  const logout = useCallback(async () => {
    const currentRefreshToken = refreshTokenRef.current;
    sessionStorage.removeItem(REFRESH_TOKEN_SESSION_KEY);
    dispatch({ type: "LOGOUT" });
    if (currentRefreshToken) {
      try {
        await authApi.logout(currentRefreshToken);
      } catch {
        // best-effort logout; ignore network errors
      }
    }
  }, []);

  useEffect(() => {
    setAuthCallbacks({
      onTokensRefreshed: (accessToken) => dispatch({ type: "TOKEN_REFRESHED", accessToken }),
      onAuthExpired: () => {
        sessionStorage.removeItem(REFRESH_TOKEN_SESSION_KEY);
        dispatch({ type: "LOGOUT" });
        window.location.href = "/login";
      },
      onPasswordChangeRequired: () => {
        window.location.href = "/change-password";
      },
    });
  }, []);

  // Silent refresh on mount if a refresh token survived a reload in sessionStorage.
  useEffect(() => {
    const storedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_SESSION_KEY);
    if (!storedRefreshToken) {
      dispatch({ type: "SET_LOADING", isLoading: false });
      return;
    }
    setAuthTokens({ accessToken: null, refreshToken: storedRefreshToken });
    refreshTokenRef.current = storedRefreshToken;
    authApi
      .refresh(storedRefreshToken)
      .then(async ({ accessToken }) => {
        setAuthTokens({ accessToken, refreshToken: storedRefreshToken });
        const user = await authApi.me();
        dispatch({ type: "LOGIN_SUCCESS", user, accessToken, refreshToken: storedRefreshToken });
      })
      .catch(() => {
        sessionStorage.removeItem(REFRESH_TOKEN_SESSION_KEY);
        dispatch({ type: "SET_LOADING", isLoading: false });
      });
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const response = await authApi.login(payload);
    sessionStorage.setItem(REFRESH_TOKEN_SESSION_KEY, response.refreshToken);
    dispatch({
      type: "LOGIN_SUCCESS",
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
    return response.user;
  }, []);

  const updateAccessToken = useCallback((token: string) => {
    dispatch({ type: "TOKEN_REFRESHED", accessToken: token });
  }, []);

  const markPasswordChanged = useCallback(() => {
    if (state.user) {
      dispatch({ type: "UPDATE_USER", user: { ...state.user, mustChangePassword: false } });
    }
  }, [state.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      accessToken: state.accessToken,
      isLoading: state.isLoading,
      isAuthenticated: !!state.user && !!state.accessToken,
      login,
      logout,
      updateAccessToken,
      markPasswordChanged,
    }),
    [state, login, logout, updateAccessToken, markPasswordChanged],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
