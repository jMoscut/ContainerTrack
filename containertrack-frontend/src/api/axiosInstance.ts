import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiError, RefreshResponse } from "../types/auth";

// These are wired up by AuthContext at app start so the axios layer never needs
// to import the context module directly (avoids circular imports).
let accessToken: string | null = null;
let refreshToken: string | null = null;
let onTokensRefreshed: ((accessToken: string) => void) | null = null;
let onAuthExpired: (() => void) | null = null;
let onPasswordChangeRequired: (() => void) | null = null;

export function setAuthTokens(tokens: { accessToken: string | null; refreshToken: string | null }) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export function setAuthCallbacks(callbacks: {
  onTokensRefreshed: (accessToken: string) => void;
  onAuthExpired: () => void;
  onPasswordChangeRequired: () => void;
}) {
  onTokensRefreshed = callbacks.onTokensRefreshed;
  onAuthExpired = callbacks.onAuthExpired;
  onPasswordChangeRequired = callbacks.onPasswordChangeRequired;
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// In-flight refresh lock: concurrent 401s share the same refresh promise
// instead of each firing their own /auth/refresh call.
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }
  const response = await axios.post<RefreshResponse>(
    `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
    { refreshToken },
  );
  const newAccessToken = response.data.accessToken;
  accessToken = newAccessToken;
  onTokensRefreshed?.(newAccessToken);
  return newAccessToken;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const errorCode = error.response?.data?.error;

    if (error.response?.status === 403 && errorCode === "PASSWORD_CHANGE_REQUIRED") {
      onPasswordChangeRequired?.();
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      errorCode === "TOKEN_EXPIRED" &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccessToken = await refreshPromise;
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        onAuthExpired?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
